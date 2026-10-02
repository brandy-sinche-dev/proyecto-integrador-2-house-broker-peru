# Seguridad y Privacidad de los Datos — HouseBroker Perú

La base de datos de HouseBroker contiene más datos que la API, y esa diferencia
es deliberada. Este documento explica qué se guarda, quién puede verlo, por qué
una parte no se expone, y qué queda por decidir antes de que el sistema salga de
desarrollo.

Los tres principios que gobiernan todo lo de aquí:

1. **La BD es el activo más sensible del sistema.** El frontend es público, la API
   es una proyección, y la BD tiene historiales, PII, notas internas y credenciales.
2. **Un endpoint no expone una columna porque exista.** Que `property_owner.email`
   exista no significa que deba viajar en un JSON. La exposición se decide por
   necesidad del cliente, no por facilidad de serializar.
3. **Lo que no se guarda no se filtra.** La primera decisión de privacidad es
   decidir qué columna existe, y es una decisión más difícil de revertir que un
   `serializer_fields`.

---

## 1. Niveles de clasificación

Cada columna del modelo tiene un nivel. La columna `Clasif.` de `data-model.md`
usa estas cuatro etiquetas, y son la base de todo lo demás.

| Nivel | Nombre | Qué es | Ejemplos en el modelo |
|:--:|---|---|---|
| **1** | `PUB` | Público por definición | `property.title`, `property.price`, `district.name` |
| **2** | `INT` | Visible solo a autenticados con permiso | `property.internal_notes`, `property.code`, `conversation.status` |
| **3** | `PII` | Datos personales identificables | `user.email`, `user.phone`, `appointment.address`, `property_owner.*` |
| **4** | `SEC` | Credenciales y material criptográfico | `user.password`, `user.refresh_token_hash` |

**Por qué cuatro niveles y no una marca de "privado"**

Porque la respuesta a "puede esto salir en la API" no es binaria. `internal_notes`
tiene una respuesta clara: no. `user.email` tiene tres respuestas distintas según
la pantalla: visible en `/auth/me`, visible para el agente en la ficha de CRM,
invisible para otro cliente. Un solo bit de clasificación obligaría a clasificar
`user.email` una sola vez, y una de esas tres respuestas se pierde.

### 1.1 Regla de exposición por nivel

| Nivel | Endpoint anónimo | Cliente autenticado | Agente | Administrador | Dump de la BD |
|---|:--:|:--:|:--:|:--:|:--:|
| `PUB` | Sí | Sí | Sí | Sí | Sí |
| `INT` | No | No | Solo asignados | Sí | Sí |
| `PII` | No | Solo lo propio | Solo lo asignado | Sí | Sí, restringido |
| `SEC` | No | No | No | No | **Nunca en texto plano** |

La columna "agente" no dice "sí" para `PII` sin más: dice "solo lo asignado". Un
agente ve los datos de contacto de un cliente si el cliente agendó una cita sobre
una propiedad que ese agente gestiona. No ve el historial completo de clientes
que nunca le tocaron.

---

## 2. Inventario de datos sensibles

### 2.1 Nivel 3, `PII`

| Tabla | Columnas | Quién las necesita de verdad | Por qué existen |
|---|---|---|---|
| `user` | `email` | El propio usuario; el agente en la ficha de CRM | Login, avisos por correo |
| `user` | `phone` | El propio usuario; el agente de una cita confirmada | Confirmación por WhatsApp |
| `user` | `document_id` | **Nadie, en el MVP** | Ver §4.1 |
| `user` | `full_name` | Todos los autenticados que los referencian | `AppointmentPersonRef` |
| `property_owner` | `owner_dni`, `owner_email`, `owner_phone`, `owner_full_name` | **Nadie vía API** | Ver §4.2 |
| `appointment` | `address`, `district` | El cliente y el agente de esa cita | Dónde es la visita |
| `appointment` | `notes` | El cliente y el agente | Acuerdos previos |
| `appointment` | `contact_phone`, `contact_name` | El agente de esa cita | Puede ser un tercero, no el usuario |
| `message` | `content` | Los participantes de la conversación | El mensaje en sí |
| `ai_conversation` | `log` | Nadie vía API | Ver §6 |
| `conversation` | `handoff_reason` | El agente | Motivo de escalamiento |
| `notification` | `email`, `phone`, `push_token` | El sistema | Destinatario del aviso |

`notification.push_token` merece atención aparte: es la identificación de un
dispositivo, no de una persona, pero se combina con el `user_id` para construir un
perfil de uso. Es `PII` aunque no lo parezca.

### 2.2 Nivel 2, `INT`

| Tabla | Columnas | Por qué no es `PUB` |
|---|---|---|
| `property` | `internal_notes` | Anotaciones del agente sobre negociación, dueño problemático, estado real del inmueble |
| `property` | `code` | Identificador interno; el público ve el `slug` |
| `property_owner` | `commission`, `commission_notes`, `payout_status`, `payout_notes` | Información financiera del propietario y del agente |
| `property_owner` | `owner_notes` | Evaluación comercial del propietario |
| `visit_observation` | `interior_notes` | Notas internas sobre la visita y sobre el cliente |
| `conversation` | `handoff_reason`, `intent_detected`, `matched_properties` | Resultado del procesamiento del bot |
| `handoff_request` | `requested_at`, `position` | Estado interno de la cola |
| `ai_session` | `embedding`, `fallback_reason`, `provider` | Diagnóstico del modelo |

**`internal_notes` es la columna con más riesgo de este modelo**, y no por
exposición técnica sino por lo que alguien escriba dentro. Es texto libre que un
agente puede usar para juicios sobre el dueño o el cliente. Un
`internal_notes` que diga "el dueño es problemático" es un dato personal negativo
sobre una persona identificable, y el hecho de que no salga por la API no lo
convierte en algo inocuo: sigue siendo PII almacenada.

Ver §8 para el control que corresponde.

### 2.3 Nivel 4, `SEC`

| Columna | Naturaleza | Cómo se protege |
|---|---|---|
| `user.password` | Hash Bcrypt | Nunca sale del servidor. El `AuthUser` lo excluye explícitamente |
| `user.refresh_token_hash` | Hash del refresh | La cookie trae el token; la BD solo guarda su huella |
| `user.email_verification_token` | Token opaco | Un solo uso, con caducidad |
| `user.password_reset_token` | Token opaco | Un solo uso, con caducidad |

**Los JWT no se guardan en la base.** Ni el access ni el refresh en texto plano.
El access se valida por firma, y el refresh por su hash. Ver §5.

---

## 3. Contraseñas

### 3.1 El algoritmo está en el spec, no en `settings.py`

`RegisterInput.password` dice: "el backend cifra con Bcrypt antes de guardar".

`backend/config/settings.py` **no define `PASSWORD_HASHERS`**. Con esa omisión,
Django usa su valor por defecto, que es **PBKDF2-SHA256**, no Bcrypt.

Esto no es una nota menor: son dos algoritmos con costos distintos, y el resultado
es que la base actual usa PBKDF2 mientras el contrato afirma Bcrypt. No hay
contradicción visible desde afuera porque ambos producen un hash válido que
Django verifica, pero la afirmación del spec es falsa y hay que corregir una de
las dos.

La decisión tiene consecuencias:

| Opción | Coste | Consecuencia |
|---|---|---|
| Definir `PASSWORD_HASHERS` con Bcrypt (como dice el spec) | Alto por hash | Cumple el contrato, migration de contraseñas solo al iniciar sesión |
| Corregir el spec a PBKDF2 | Menor por hash | Sin cambios de código, pero el contrato queda desalineado |

Recomiendo **definir los hashers** antes de la primera migración. Cambiar el
algoritmo con usuarios reales implica que cada usuario reescriba su contraseña en
el próximo login, y eso es una migración que no se puede deshacer.

### 3.2 Validadores activos

`settings.py` define cuatro validadores de Django:

| Validador | Qué impide |
|---|---|
| `UserAttributeSimilarityValidator` | Una contraseña parecida al correo o al nombre |
| `MinimumLengthValidator` | Contraseñas demasiado cortas |
| `CommonPasswordValidator` | Contraseñas de listas de passwords filtrados |
| `NumericPasswordValidator` | Contraseñas solo numéricas |

El primero tiene un efecto secundario que conviene entender: como compara contra
`email` y `full_name`, **el correo está implícitamente en el espacio de
contraseñas**. Eso no filtra el hash, pero reduce la entropía efectiva de quien
elija una contraseña derivada de su correo.

`RegisterInput.password` exige `minLength: 10`. `MinimumLengthValidator` usa
`PASSWORD_MIN_LENGTH`, y **esa constante no está definida en `settings.py`**, así
que aplica el valor por defecto de Django, 8. El endpoint tiene que validar 10 por
su cuenta o hay que definir la constante. Ver §10, divergencia D4.

### 3.3 El correo se normaliza antes de comparar

El spec dice que "el backend lo normaliza a minúsculas antes de comparar, de modo
que `Maria@correo.com` y `maria@correo.com` son la misma cuenta".

Eso obliga a una decisión de esquema, y es la única forma correcta:

```sql
CREATE UNIQUE INDEX user_email_lower_uniq ON "user" (lower(email));
```

Alternativas descartadas:

- **`UNIQUE` sobre `email` a secas.** Depende de que toda escritura pase por el
  servicio. Un seed, un script de importación o un `UPDATE` manual crean
  `Maria@x.com` y `maria@x.com` como cuentas distintas, y el login se rompe de una
  forma muy difícil de diagnosticar.
- **`CITEXT`.** Funciona, pero añade una extensión de Postgres que hay que instalar
  en el `Dockerfile` del servicio de base de datos, y el comportamiento depende de
  la configuración regional del servidor para los casos exóticos.
- **`LOWER()` generado y almacenado.** Duplica la columna y crea dos fuentes de
  verdad.

El índice funcional sobre `lower(email)` da la garantía en la base, que es donde
tiene que estar, y no depende de que nadie olvide normalizar.

La columna sigue guardando el valor **tal como lo escribió el usuario**, no el
normalizado. Se guarda lo que el usuario ve en su perfil, y la comparación usa
`lower()`. El claim `email` del JWT sí viaja normalizado, según el spec.

---

## 4. Datos que la API no expone

Estas cuatro decisiones son las que separan esta base de un volcado del modelo a
JSON.

### 4.1 `user.document_id`

El spec **no lo expone**. `AuthUser` solo lleva `id`, `email`, `full_name`,
`phone`, `role`, `is_active` y `created_at`.

El DNI es el identificador nacional peruano y el dato más sensible que el proyecto
podría pedir. Ningún requisito lo pide: la identidad se verifica con email y
teléfono. Conservarlo sin un caso de uso es PII guardada por costumbre.

**Estado actual:** la columna existe en el modelo porque una ficha de propietario
en el mundo real lo trae. Si no aparece en ningún requisito ni en la ficha de CRM,
lo razonable es quitarla. Si se conserva, debe quedar marcada como
`solo_uso_interno`, nunca enviarse en un `AuthUser`, y tener una razón escrita de
por qué existe.

Dejar una columna de documento nacional "por si acaso" es exactamente el tipo de
dato que hace que una auditoría de protección de datos falle.

### 4.2 `property_owner` completo

Toda la tabla es nivel 3 y ninguna parte sale por la API:

| Columna | Nivel | Por qué no se expone |
|---|---|---|
| `owner_dni` | `PII` fuerte | Documento del propietario. No es del cliente que compra |
| `owner_email`, `owner_phone` | `PII` | Contacto directo que saltaría la intermediación de la plataforma |
| `owner_full_name` | `PII` | Nombre del dueño, que en alquiler es un tercero |
| `commission`, `commission_notes` | `INT` | Información financiera del agente y su handshake con el dueño |
| `payout_status`, `payout_notes` | `INT` | Estado de pago al agente |
| `owner_notes` | `INT` | Evaluación comercial del propietario |

**La razón de fondo es de negocio, no solo de privacidad.** HouseBroker es una
intermediación. Si el API expone el teléfono del propietario, el cliente lo tiene
y la plataforma pierde su función. El dato no sale por la API, pero sí se usa
para notificar al propietario fuera de la plataforma, por un canal que no es
esta API.

`commission` merece una nota aparte: es información del acuerdo económico entre
la plataforma y el agente. El agente debe poder leer **su propia** comisión. El
resto de agentes no.

### 4.3 `visit_observation` y `conversation` completos

Ninguna columna de `visit_observation` es pública, y la API no expone ninguna de
`conversation` más allá de lo que el usuario ve de su propia sesión. El historial
de conversación de un cliente es suyo, pero el `log` de la IA no lo es: es un
registro técnico del procesamiento.

### 4.4 `property_owner` no tiene API, y `Property` tampoco lo menciona

`Property` del spec no incluye `owner`, ni `owner_id`, ni `owner_name`. La ficha
pública de un inmueble no dice de quién es. Es coherente con lo anterior: la
intermediación.

---

## 5. Autenticación: JWT, cookies y revocación

### 5.1 Lo que lleva el access token

| Claim | Uso |
|---|---|
| `sub` | Identidad del titular (UUID) |
| `email` | Trazabilidad, ya normalizado a minúsculas |
| `role` | **Autorización (RBAC)** |
| `token_type` | Distinguirlo del refresh ante una confusión de tokens |
| `jti` | **Revocación individual** |
| `iat` / `exp` | Vigencia, en Unix epoch |

El rol viaja en el token, y por eso **no hay una consulta a la base por petición
para autorizar**. Es el tradeoff explícito que hace el proyecto.

**La contrapartida está escrita en el propio spec:** "un cambio de rol no surte
efecto hasta que el access expira, salvo que se revoque por `jti`". Con
`expires_in: 1800`, un usuario degradado de `ADMINISTRADOR` a `CLIENTE` conserva
sus permisos hasta 30 minutos.

Esa es una ventana real. Dos mitigaciones, y son compatibles:

1. El endpoint de refresh compara el `role` del token con el de la base y reemite
   si difieren. Con refresh de 30 días y uso regular, la ventana real baja a
   minutos.
2. Un `jti` del token anterior se añade a una lista de revocación al cambiar el
   rol, consultada en cada petición.

La segunda necesita la tabla de revocación que hoy no existe en el modelo. La
primera no necesita nada nuevo y es la que corresponde para el MVP. La decisión
de implementarla debería quedar registrada.

### 5.2 El refresh vive en una cookie `HttpOnly`

Atributos que el backend debe fijar, según el spec:

| Atributo | Valor | Motivo |
|---|---|---|
| `HttpOnly` | presente | Impide que `document.cookie` lo lea, que es el impacto de XSS |
| `Secure` | presente | Solo viaja por HTTPS |
| `SameSite` | `Strict` | Corta el envío en navegaciones originadas fuera del sitio |
| `Path` | `/api/v1/auth` | Limita el envío a los endpoints que lo necesitan |
| `Max-Age` | `REFRESH_LIFETIME` | La sesión expira sola |

**`REFRESH_LIFETIME` no está definida en `settings.py`.** Sin ella, el `Max-Age`
de la cookie no tiene valor, y la sesión no expira sola. Es un ajuste pendiente,
no una decisión de diseño.

**Y `POST /auth/login` y `POST /auth/refresh` deben validar un token CSRF de doble
envío**, aunque la cookie sea `HttpOnly`. El spec lo dice: esos dos endpoints
modifican el estado de la sesión y son CSRF-able por definición, porque son
`POST` y el navegador adjunta la cookie automáticamente.

### 5.3 La contradicción de `localStorage`

El spec dice del access token: "el cliente lo mantiene **solo en memoria**".

El mismo spec dice, en `securitySchemes.bearerAuth`: "el cliente adjunta el token
en `frontend/src/services/axios.ts` leyendo `localStorage.hb_token`".

Son incompatibles. `localStorage` es exactamente lo contrario de "solo en
memoria": persiste entre recargas, es legible por cualquier JavaScript que se
ejecute en el origen, y sobrevive a un cierre de pestaña.

La cookie `HttpOnly` protege el refresh. El access en `localStorage` queda
expuesto a XSS: un script inyectado en el frontend lee
`localStorage.hb_token` y tiene 30 minutos de sesión del usuario.

**No es una decisión de la base de datos**, así que este documento la registra y
no la resuelve. Pero el impacto de la decisión es del modelo: el `jti` existe
para revocar ese token, y una lista de revocación solo es útil si hay alguien que
robó un token de corta duración.

### 5.4 El token de restablecimiento

`PasswordResetConfirm` recibe `uid` y `token`, con `minLength: 20` y
`maxLength: 200`. La longitud máxima de 200 es holgada a propósito: el token
generado por Django incluye el usuario codificado en base64 y una firma, y no son
20 caracteres.

El spec señala un detalle que `TASK-BACK-SEC-02` tiene que decidir: el endpoint de
Django usa `uidb64`, que es el UUID en base64, y el contrato propone el UUID en
texto plano. **Un formato inválido produce `400`, no `401`**, porque el cuerpo
está mal y el token ni llega a evaluarse.

En la base, el token de reset se guarda hasheado, con `used_at` para el uso único
y una caducidad. Un token de reset en texto plano en la tabla sería una
vulnerabilidad directa: basta con leer la tabla.

---

## 6. IA, conversaciones y retención

`ai_session.embedding` es el vector de la conversación, `ai_conversation.log` es
el registro completo.

| Dato | Riesgo |
|---|---|
| `ai_conversation.log` | El prompt del cliente puede contener su dirección, su sueldo, su nombre. Se está escribiendo en texto plano |
| `ai_session.embedding` | Vector de 768 dimensiones. No es PII legible, pero es un perfil: se puede comparar con otros y detectar patrones |
| `conversation.handoff_reason` | Texto libre sobre el estado emocional o el problema del cliente |
| `ai_session.fallback_reason` | Diagnóstico interno, no expone al usuario |

**El `log` es el problema.** El chatbot recibe "busco un depto en Miraflores de 3
dormitorios, mi presupuesto es 2500 y trabajo en San Isidro", y eso queda en la
base como historial técnico.

Tres mitigaciones, en orden de costo:

1. **Retención corta.** El `log` se borra a los 30 días y se conserva solo el
   `embedding` y los metadatos (`turn_count`, `avg_latency_ms`,
   `fallback_reason`).
2. **Redacción en el ingreso.** Números de documento, teléfonos y correos se
   enmascaran antes de enviar al modelo y antes de escribir.
3. **No usarlo para entrenar.** Cualquier uso de estos datos como conjunto de
   entrenamiento requiere una base legal que el proyecto no tiene. Decirlo por
   escrito antes de tener la conversación es más barato que pedir permiso
   después.

---

## 7. Ubicación y geoprivacidad

`property.address` y `property.ubigeo` son `PII` cuando la propiedad es de un
dueño que alquila: la dirección de una casa habitada es un dato sensible, y
publicarla sin control permite otros usos que el modelo no puede impedir.

Reglas que el MVP necesita y que el modelo debe permitir:

| Regla | Dónde se implementa |
|---|---|
| La dirección exacta solo se muestra tras agendar | Servicio, no vista |
| El catálogo muestra distrito, nunca calle | `Property.address` no se serializa en el listado |
| El cliente solo ve la dirección de una cita confirmada | Filtro por `appointment.client_id` |
| El propietario no necesita exponerse | Ver §4.2 |

La diferencia entre "el catálogo muestra el distrito" y "el catálogo muestra la
dirección" no es de permisos sino de qué columnas viaja el serializer. Y es
precisamente la razón por la que `data-model.md` marca esas columnas como
`PII` y no como `PUB`: la clasificación gobierna la escritura del serializer.

Si el MVP llegara a exponer coordenadas, sería un cambio de modelo, no un cambio
de vista: `latitude` y `longitude` con precisión de domicilio identifican una
vivienda unitaria y hay que redondearlas a nivel de manzana.

---

## 8. Minimización y control del texto libre

Tres columnas aceptan texto libre ilimitado y ninguna tiene longitud máxima en el
modelo:

| Columna | Riesgo | Control |
|---|---|---|
| `property.internal_notes` | Perfil del dueño o del cliente | Límite de 2000 caracteres, visible solo para asignados |
| `visit_observation.interior_notes` | Puede contener juicios no éticos sobre una persona o una vivienda | Límite de 2000 caracteres, solo el agente y admin |
| `appointment.notes` | Datos del cliente escritos por el agente | Límite de 1000 caracteres |

**La nota sobre `interest_level` merece atención aparte.** Es un entero de 1 a 5
que un agente asigna después de una visita: interés del cliente en la propiedad,
confianza de que firmará. Eso es una **valoración sobre una persona**, escrita en
la base de datos y consultable.

La escala 1 a 5 es aparentemente inocua y es el tipo de dato que se convierte en
problemático con el tiempo: "¿qué tan probable es que este cliente firme?" es una
pregunta sobre una persona que se responde con un número. Si la plataforma
alimenta después un scoring comercial con esos valores, hay sesgo acumulado
contra ciertos clientes.

Control: la columna existe, es interna, y su uso queda limitado a la ficha de CRM.
No debe entrar en ningún modelo de predicción sin una revisión de sesgo.

---

## 9. Backups, logs y entorno

### 9.1 Backups

Un `pg_dump` contiene todo: contraseñas hasheadas, correos, teléfonos, documentos
y notas internas. La política de respaldo no puede ser "copiar el directorio de
datos".

| Requisito | Detalle |
|---|---|
| Cifrado en reposo | El dump se cifra antes de salir del host |
| Retención acotada | 30 días máximo |
| Acceso registrado | Quién pide un restore queda registrado |
| Prueba de restauración | Trimestral |

### 9.2 Logs

El riesgo más subestimado de esta arquitectura es el **log de aplicación**,
porque los datos salen de la base por un camino que no tiene los controles de la
base.

| Regla | Motivo |
|---|---|
| Nunca registrar el header `Authorization` | Es una credencial completa |
| Nunca registrar cuerpos de `/auth/login` | Contiene la contraseña en texto plano |
| Nunca registrar `password`, tokens o cookies | La contraseña nunca llega al log |
| Registrar `X-Request-Id` en cada línea | Es lo que permite correlacionar sin duplicar datos |
| `DEBUG=False` en producción | Django filtra variables de contexto en las páginas de error |

La regla de `DEBUG=False` tiene un efecto colateral útil: la página de error de
Django en desarrollo muestra las variables de contexto y los settings
sensible. Con `DEBUG=False` y `ALLOWED_HOSTS` configurado, deja de hacerlo.

### 9.3 Configuración

`settings.py` **no define ninguna variable `SECURE_`**. En desarrollo local no
importa, pero antes de desplegar son obligatorias:

| Variable | Valor de producción |
|---|---|
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | Lista explícita del dominio |
| `SECURE_SSL_REDIRECT` | `True` |
| `SECURE_HSTS_SECONDS` | `31536000` |
| `SESSION_COOKIE_SECURE` | `True` |
| `CSRF_COOKIE_SECURE` | `True` |

`CORS_ALLOWED_ORIGINS` ya está parametrizado con las variables de entorno, lo cual
es correcto.

---

## 10. Divergencias detectadas entre el contrato y la configuración

Las siguientes son inconsistencias reales entre `docs/api/openapi_spec.yaml` y
`backend/config/settings.py`. Ninguna se resuelve aquí: cada una necesita una
decisión del equipo de backend.

| # | El contrato dice | `settings.py` tiene | Impacto |
|---|---|---|---|
| D1 | `password` se cifra con Bcrypt | Nada: aplica PBKDF2 | Contrato falso; cambiar después obliga a rehashear en el login |
| D2 | `minLength: 10` en el password | `PASSWORD_MIN_LENGTH` sin definir | El validador acepta 8, el endpoint debe validar 10 aparte |
| D3 | Cookie con `Max-Age` igual a `REFRESH_LIFETIME` | `REFRESH_LIFETIME` sin definir | La sesión no expira sola |
| D4 | `PASSWORD_RESET_THROTTLE` limita los reintentos | La constante no existe | El rate limit del endpoint no tiene valor |
| D5 | El access vive solo en memoria | `axios.ts` lo lee de `localStorage` | XSS roba una sesión de 30 minutos |
| D6 | `uid` del reset es el UUID en texto plano | Django usa `uidb64` | `400` en el enlace real de correo si no se traduce |

Y dos que son omisiones del modelo, no del contrato:

| # | Falta | Consecuencia |
|---|---|---|
| M1 | `AUTH_USER_MODEL` | El usuario vive en `auth_user` y las claves foráneas de las 24 tablas apuntan a una tabla que `AUTH_USER_MODEL` debería reemplazar |
| M2 | Tabla de revocación de `jti` | El claim existe para revocar, y no hay dónde anotar la revocación |

---

## 11. Cumplimiento

El proyecto opera en Perú, donde la **Ley N.o 29733, Ley de Protección de Datos
Personales**, y su reglamento (DS 003-2013-JUS) son aplicables a una base con
correos, teléfonos, documentos y datos de contacto de propietarios y clientes.

Consecuencias que el modelo tiene que permitir:

| Obligación | Soporte en el modelo |
|---|---|
| Consentimiento para tratamiento | `user.is_active` y el registro como evidencia; falta un registro de consentimiento explícito |
| Acceso a los datos de uno mismo | `GET /auth/me` cubre la vista propia |
| Corrección de datos | `PUT /auth/me` cubre nombre y teléfono |
| Registro de transferencias | `property_owner` es una transferencia de datos del propietario a la plataforma, y hay que documentarla |
| Conservación limitada | Hoy no hay política de retención; §6 y §9.1 la proponen |
| Datos sensibles | `owner_dni` y `document_id` exigen consentimientos reforzados |

**No hay en el modelo una tabla de consentimiento ni de auditoría de accesos a
datos personales.** La auditoría existente registra cambios de estado de
propiedades y citas, no lecturas de fichas de clientes. Un agente que abre 200
fichas de CRM deja cero rastro hoy.

Si el proyecto se presenta como académico y no-productivo, esto no bloquea nada.
Si se opera con datos reales de personas, es el requisito que más probable va a
pedir la autoridad.

---

## 12. Checklist

Antes del despliegue, en orden de dependencia:

**Bloqueantes**

- [ ] Definir `AUTH_USER_MODEL` antes de la primera migración (M1)
- [ ] Definir `PASSWORD_HASHERS` con Bcrypt, o corregir el spec (D1)
- [ ] Definir `REFRESH_LIFETIME` y `PASSWORD_MIN_LENGTH` (D3, D2)
- [ ] Definir `PASSWORD_RESET_THROTTLE` (D4)
- [ ] Traducir `uid` de `uidb64` a UUID, o documentar que se acepta ambos (D6)
- [ ] `DEBUG=False` y `ALLOWED_HOSTS` explícito
- [ ] Token CSRF en `/auth/login` y `/auth/refresh`

**Modelo de datos**

- [ ] `UNIQUE (lower(email))` en `user`
- [ ] Hashes, no plaintext, para refresh, reset y verificación
- [ ] Longitud máxima en las tres columnas de texto libre (§8)
- [ ] Decidir si `user.document_id` existe (§4.1)
- [ ] Tabla de revocación de `jti`, o el refresh compara el rol (§5.1)

**Exposición**

- [ ] `property_owner` y `visit_observation` sin ningún campo en un `Serializer`
- [ ] `internal_notes` fuera de `Property` y de `PropertyInput`
- [ ] El listado público de propiedades no incluye `address`
- [ ] `ai_conversation.log` con retención acotada (§6)

**Operación**

- [ ] Rotación y cifrado de backups (§9.1)
- [ ] Redactor de logs antes de producción (§9.2)
- [ ] Política de retención escrita, si hay datos reales (§11)

---

## 13. Nota final sobre el alcance

Este documento describe controles que **todavía no existen**. El backend sigue
sin `models.py`, sin migraciones y sin `AUTH_USER_MODEL`; todo lo anterior es
especificación, no implementación.

La lista de divergencias de §10 es la parte accionable: son seis afirmaciones
del contrato que hoy el código no cumple. Resolverlas no es un detalle de
implementación, es corregir documentación que describe un sistema que todavía
no está construido, y es exactamente el trabajo pendiente del Sprint 5.