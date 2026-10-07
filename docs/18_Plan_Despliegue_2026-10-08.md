# Auditoría y plan de entrega completa en Docker — jueves 8 de octubre de 2026

**Revisión 6 (2026-10-07 11:05, America/Lima):** prioridad explícita del
usuario: terminar backend y frontend integrados antes de pensar en despliegue.
Queda confirmado Docker, alcance completo, entrega a las 20:15, Gmail/App
Password y que trabaja solo. No existe servidor, dominio, SMTP operativo ni
clave de Gemini API; sí hay Google AI Pro.

## 1. Dictamen y alcance

**El `main` auditado todavía no está listo para un despliegue funcional full-stack.**
Hay componentes y endpoints útiles, pero faltan autenticación, integración de
persistencia y preparación del entorno de producción. Además, la migración de
horarios contiene SQL incompatible con los tipos que crea en PostgreSQL.

- Fecha de revisión: 2026-10-07.
- Commit: `69670a7be5498dc398d3c95ced4c3437c640b1c7`.
- [CI revisado](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/actions/runs/37639782143): correcto.
- GitHub: 50 issues abiertos, ningún PR abierto al consultar.
- Única rama remota con commits no integrados: `feature/TASK-FRONT-PROP-03`, con
  dos commits de documentación; no contiene una implementación pendiente de auth.
- No hay deployments registrados en la API de GitHub. Esto no permite descartar
  un hosting configurado externamente: se necesita confirmar su URL y proveedor.
- Destino confirmado: servidor, mediante Docker Compose.
- Límite confirmado: jueves 2026-10-08 a las 20:15; se interpreta hora de Lima
  (`America/Lima`) por el contexto del proyecto, pendiente solo de corrección si
  la hora pertenece a otra zona.
- IA disponible: cuenta Google AI Pro. Su plan da acceso a Gemini Apps; la
  aplicación del servidor todavía requiere una clave de Gemini API y comprobar
  la cuota/proyecto asociados a esa clave.
- Capacidad confirmada: una sola persona para implementación, integración,
  infraestructura, pruebas y entrega.
- Infraestructura externa actual: servidor no provisionado, sin dominio/DNS,
  sin proveedor SMTP y sin clave de Gemini API.

**Requisitos confirmados por el usuario:** despliegue en **Docker** y entrega de
**todo el sistema completo** el jueves. El alcance comprende las 21 historias de
las cuatro épicas, sus criterios funcionales y los requisitos de calidad de la
entrega. La solución de empaquetado propuesta es Docker Compose.

Quedan por provisionar y confirmar el servidor, hostname/TLS, proveedor de correo
y acceso a Gemini API. Los rótulos P0/P1 de esta auditoría ordenan dependencias;
todas las historias de la matriz son obligatorias para considerar completa la
entrega.

**Evaluación de factibilidad:** con 33 horas calendario aproximadas al corte y
una sola persona, no es viable prometer implementación y validación profesional
de 21 historias cuando varios módulos no existen y la infraestructura tampoco.
El requisito no se reduce: esta afirmación separa el alcance solicitado de una
estimación defendible. Se debe reportar avance real por historia y nunca sustituir
persistencia, correo, chat o IA con confirmaciones simuladas.

## 2. Verificaciones realizadas

| Verificación | Resultado | Límite de la evidencia |
|---|---|---|
| CI frontend del commit auditado | 21 suites, 388 pruebas aprobadas; lint sin errores; build correcto | El build hereda mocks activos de `.env`; no verifica integración full-stack |
| CI backend del commit auditado | 177 pruebas aprobadas | Se ejecuta con SQLite, no PostgreSQL |
| `uv sync --frozen` local | Dependencias instaladas | Python local 3.13; el CI usa 3.12 |
| `manage.py makemigrations --check --dry-run` con SQLite | `No changes detected` | No demuestra que el SQL exclusivo de PostgreSQL funcione |
| `manage.py check --deploy` con `DJANGO_DEBUG=0` | Falla: `mail.E001` y cinco advertencias de configuración | Se evaluaron los defaults del repositorio, sin configuración del futuro hosting |
| Peticiones a la aplicación Django con APIClient y SQLite en memoria | Catálogo responde; auth y operaciones pendientes reproducidos | No sustituye pruebas desde navegador ni una ejecución en PostgreSQL 16 |

La cobertura de Jest se calcula sobre una lista explícita de archivos en
`frontend/jest.config.cjs`; el porcentaje no representa todas las pantallas ni
la integración con el servidor.

## 3. Hallazgos que condicionan la entrega

### P0 — Base de datos PostgreSQL

Archivo: `backend/apps/properties/migrations/0002_property_availability.py:16`.

- La restricción usa `tsrange(start_time, end_time, '[)')` sobre columnas
  `TimeField` (`time without time zone`). `tsrange` requiere timestamps, no horas
  aisladas. Es un defecto identificado por revisión del SQL y de los tipos, aún
  pendiente de reproducción en PostgreSQL 16.
- La exclusión tampoco incluye `weekday`: al corregir el rango hay que evitar
  que un horario de lunes bloquee el mismo horario del martes.
- SQLite omite esa operación; el CI verde no cubre este bloqueo.
- PostgreSQL y Docker no están disponibles en el entorno local auditado.

**Salida exigida:** migrar una base PostgreSQL 16 vacía; comprobar que se rechaza
un solapamiento del mismo inmueble y día, y se permite la misma hora en otro día.
Verificar disponibilidad de `btree_gist` y ejecutar también las migraciones de citas.
Antes de modificar una migración integrada, comprobar si alguien ya la aplicó;
la corrección debe permitir tanto instalación limpia como actualización del
estado existente que se encuentre.

### P0 — Configuración de producción y publicación

Archivos: `backend/config/settings.py`, `backend/pyproject.toml`,
`infra/docker-compose.yml`, `.github/workflows/ci.yml`.

- Compose solo levanta PostgreSQL; no hay configuración versionada de publicación
  de frontend/backend ni un servidor WSGI/ASGI de producción declarado.
- `DEBUG` está activo por defecto; la clave tiene un valor de desarrollo;
  hosts y CORS apuntan a localhost.
- El correo usa consola. Con `DEBUG=0`, `check --deploy` devuelve `mail.E001`:
  las confirmaciones no se envían a un buzón.
- Falta configurar estáticos de Django y su entrega con `DEBUG=0`, migraciones
  en el release, credenciales del hosting y persistencia de datos/imágenes.
- `api/health/` existe, pero solo devuelve un JSON; no valida acceso a la base.
- React usa `BrowserRouter`: el hosting necesita fallback a `index.html` para
  las rutas de cliente, sin interceptar `/api`.

**Salida exigida:** URL de prueba HTTPS, backend arrancando con servidor de
producción, API y base conectadas, estáticos accesibles, correo de prueba recibido,
configuración de hosts/CORS/cookies/CSRF adecuada al dominio y build reproducible.

### P0 — Autenticación y roles

Issues [#71](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/71)
y [#72](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/72).

- `POST /api/v1/auth/login` devuelve **404** en la prueba local.
- No hay vistas de login/registro, AuthContext ni ProtectedRoute en el frontend.
- DRF utiliza `SessionAuthentication` y `BasicAuthentication`; JWT no está
  instalado ni configurado. El interceptor del frontend intenta usar Bearer.
- Los mocks inyectan un agente en `hb_user`; eso no autentica al usuario en Django.
- El modelo real es `auth.User`. Hay que decidir y documentar la representación
  persistente de los roles y los identificadores antes de cargar usuarios reales.
- Alinear los nombres `CLIENTE`, `AGENTE`, `ADMINISTRADOR` del código/contrato
  con el texto del issue que aún usa nombres en inglés.
- El contrato actual define access token en memoria y refresh en cookie HttpOnly.
  Ajustar transporte, restauración de sesión y CORS/CSRF a esa definición.

**Salida exigida:** registro/login/refresh funcionales; sesión restaurada al
recargar; permisos comprobados por el servidor para cliente, agente y administrador.

### P0 — Conectar el frontend a la API real

- `frontend/.env:1` activa `VITE_ENABLE_MOCKS=true`; los mocks también se incluyen
  en el build actual. La URL de Axios por defecto es localhost.
- Publicar con `VITE_ENABLE_MOCKS=false` y `VITE_API_URL` del entorno, definidos
  **al compilar** el frontend.
- `frontend/src/services/properties.ts:18` descarta `count`, `next` y `previous`.
  La API devuelve 12 elementos por página, pero la UI filtra y pagina localmente.
  Con 13 propiedades se reprodujo `count=13`, `results=12` y `next` presente:
  la UI actual nunca solicita la segunda página del backend.
- El backend no implementa los filtros documentados. Se probó `search` sin
  coincidencias, `minPrice` superior a todos los precios y `propertyType` distinto:
  en los tres casos devolvió la propiedad que debía excluir.

**Salida exigida:** catálogo, búsqueda, filtros y paginación operan sobre todos
los registros, con más de 12 inmuebles y mocks desactivados.

### P1 — Registro y edición de propiedades

- `PropertyForm` existe, pero no está conectado a una ruta de `App.tsx`.
- `PropertyViewSet` hereda de `ReadOnlyModelViewSet`: POST, PUT y DELETE devuelven
  **405** en las pruebas locales.
- Se requiere completar escrituras, autorización y el mapeo de campos del
  formulario al modelo (incluyendo código, distrito y agente).

**Salida exigida:** un agente autorizado crea/edita/retira una propiedad desde
React, la modificación persiste y otro usuario sin permisos no puede realizarla.

### P1 — Favoritos persistentes

- La API de favoritos existe; su listado autenticado respondió **200**.
- `App.tsx` mantiene `hb_saved` en localStorage; el frontend no llama a `/favorites/`.

**Salida exigida:** guardar/quitar/listar por usuario con API; recuperación al
iniciar sesión en otro navegador; manejo de error y ausencia de sesión.

### P1 — Reservas y consulta de citas

Archivos: `frontend/src/components/crm/AppointmentModal.tsx`, `DateSlotsPicker.tsx`,
`frontend/src/App.tsx`, `backend/apps/appointments/views.py`.

- La API de slots y creación de citas existe.
- El selector ofrece cuatro horas fijas y el modal muestra éxito sin hacer POST.
  Ni siquiera recibe `propertyId`; `App.tsx` le pasa `isLoggedIn={true}` fijo.
- `hb_visits` guarda IDs de propiedades, no citas con fecha, hora y estado.
- `GET /api/v1/appointments` devuelve **405** incluso autenticado.
- Faltan panel y transiciones de citas: issues #99, #100 y sus pruebas #101.

**Salida exigida:** consultar horarios reales, guardar con `property_id` y fecha
correcta en zona Lima, mostrar éxito solo tras 201, manejar 409 y consultar la
cita persistida desde la cuenta correspondiente. Incluir confirmación, rechazo,
cancelación, reprogramación, finalización y notificación de cambios de estado.

### P1 — Datos iniciales e imágenes

- Existen migraciones de esquema y Django Admin; no hay un comando implementado
  de carga inicial de distritos, agentes, inmuebles y horarios.
- Las imágenes del backend se construyen con `PROPERTY_MEDIA_BASE_URL`, cuyo
  default es `https://cdn.housebroker.pe`; falta confirmar un origen de imágenes
  realmente disponible para el despliegue.
- La portada se llama `is_cover` en el backend y `es_principal` en el frontend:
  alinear la representación.

**Salida exigida:** conjunto de datos de demostración persistente y repetible,
usuarios por rol, más de 12 propiedades, imágenes accesibles y horarios futuros.

## 4. Matriz de alcance completo: 21 historias

Fuentes: `docs/scrum/backlog.md`, `docs/01_requerimientos.md`,
`docs/02_Arquitectura.md`, contrato OpenAPI e issues de las HU. Algunas historias
de GitHub solo tienen título; sus criterios se concretan aquí con el SRS y la
arquitectura. Los identificadores RF y HU no son intercambiables: por ejemplo,
HU-SEC-02 trata recuperación, mientras RF-SEC-02 describe chat.

| Historia | Estado funcional auditado | Trabajo y evidencia de cierre |
|---|---|---|
| PROP-01 Registro/edición (#17) | Parcial: formulario aislado y API solo lectura | CRUD con permisos; distrito, características, mascotas, fotos, agente y persistencia |
| PROP-02 Catálogo (#31) | Parcial | Paginación real, detalle completo, galería y mapa aproximado; estados de carga/error y móvil |
| PROP-03 Filtros (#32) | Parcial: filtrado local | Filtros combinados en servidor: precio, tipo, distrito, habitaciones, cochera, mascotas y modalidad; URL compartible y debounce |
| PROP-04 Disponibilidad (#50) | Parcial: UI/API existentes, bloqueadas por auth y PostgreSQL | Estados, agenda semanal, permisos por inmueble y reflejo inmediato en catálogo |
| PROP-05 Favoritos (#51) | Parcial: API y UI sin integrar | Guardar desde tarjeta/detalle; listado por cuenta, anonimato y persistencia entre sesiones |
| CRM-01 Reservar (#52) | Parcial: creación API, modal simulado | Slots reales, reserva, conflictos de inmueble/agente, correo y retorno al flujo tras login |
| CRM-02 Gestionar citas (#53) | Pendiente de panel/listado/transiciones | Agenda por rol, confirmar/rechazar/reprogramar/cancelar/finalizar, historial, correos y estados terminales |
| CRM-03 Ficha cliente (#54) | Pendiente | Perfil, interacciones, preferencias, citas y recomendaciones previas, visibles al agente autorizado |
| CRM-04 Observaciones (#55) | Pendiente | Notas de atención y seguimiento ligadas a visita/cliente con autor, fecha y permisos |
| CRM-05 Dashboard/reportes (#56) | Pendiente | Métricas calculadas desde datos reales, filtros, efectividad de agentes, inmuebles visitados y exportación CSV |
| SEC-01 Registro/login (#57) | Pendiente; existen permisos parciales | Auth completa, refresh, cierre de sesión, perfiles y paneles por rol; gestión de usuarios y asignaciones por administrador |
| SEC-02 Recuperación (#58) | Pendiente | Correo real, token temporal de un uso, nueva contraseña y rechazo de token vencido/reutilizado |
| SEC-03 Chat (#59) | Pendiente | WebSockets autenticados, mensajes persistidos, enviado/entregado/leído, no leídos, escritura y adjuntos controlados |
| SEC-04 Presencia (#60) | Pendiente | Conectado/ausente/desconectado mediante heartbeat y expiración Redis; panel agente/admin |
| SEC-05 Notificaciones (#61) | Parcial: correo de reserva en consola | Alertas web persistentes y correo para citas, mensajes y asignaciones, lectura y recuperación tras reconectar |
| SEC-06 Auditoría chat (#62) | Pendiente | Historial autorizado de conversaciones, atención pendiente y trazabilidad de acciones administrativas |
| AI-01 Asistente (#63) | Pendiente; widget con texto fijo | Conversación real con Gemini, preguntas progresivas, errores/cuotas y confirmación antes de reservar |
| AI-02 Contexto (#64) | Pendiente | Preferencias estructuradas e historial por cuenta/conversación, restauración y control de datos enviados al modelo |
| AI-03 Recomendaciones (#65) | Pendiente | Filtros SQL + reglas + scoring IA; 2–3 candidatos reales cuando existan, match y motivos, enlaces a detalle/cita/agente |
| AI-04 Derivación (#66) | Pendiente | Cola, aceptación por agente, mismo chat e historial; bot pausa al tomarlo un humano y retoma según estado |
| AI-05 Supervisión (#67) | Pendiente | Panel admin con conversaciones IA, recomendaciones, latencia, errores, consumo disponible, escalados y satisfacción capturada |

Además de las funcionalidades, la entrega debe cubrir accesibilidad WCAG 2.2 AA
en los flujos, permisos, responsive y mediciones de los RNF. Un issue cerrado de
UI o de contrato no acredita por sí solo el flujo integrado.

## 5. Arquitectura Docker Compose propuesta

```text
Navegador
   |
   v
web: Caddy + React compilado + HTTPS
   | /api, /admin                  | /ws
   +-------------------------------+
                   |
                   v
        api: Django + DRF + Channels + ASGI
          | PostgreSQL 16       | Redis
          | datos permanentes  | canales/presencia/cola
          |                   |
          |              worker + scheduler
          |              correo/recordatorios
          |
          +---- almacenamiento S3 compatible de imágenes/adjuntos
          +---- Gemini API y proveedor SMTP
```

### Servicios y persistencia

| Servicio | Contenido propuesto | Comprobación |
|---|---|---|
| `web` | Build multietapa Node 22/pnpm → Caddy; React estático, proxy HTTP/WS y TLS automático | Ruta profunda recargable; API y WebSocket bajo el mismo origen |
| `api` | Python, `uv.lock`, Django/DRF/Channels y Uvicorn | Readiness comprueba PostgreSQL y Redis; procesos ASGI arrancan sin `runserver` |
| `db` | PostgreSQL 16 y extensión `btree_gist` | Healthcheck y volumen `postgres_data`; migración limpia y actualización comprobadas |
| `redis` | Channel layer, presencia y broker | Healthcheck; red interna; historial de negocio permanece en PostgreSQL |
| `worker` | Misma imagen backend, tareas Celery para correos/recordatorios | Reintentos controlados y eventos registrados sin duplicar notificaciones |
| `scheduler` | Misma imagen backend, una instancia de Celery Beat | Recordatorios programados sin multiplicarse al reiniciar |
| `storage` | Servicio S3 compatible, propuesta MinIO con versión verificada al implementar | Volumen persistente; carga/lectura de imágenes y adjuntos con permisos |
| `release` | Tarea de una ejecución: migrar y recolectar estáticos | API y workers esperan su finalización correcta; seed de demostración explícito e idempotente |

El almacenamiento tendrá inicialización idempotente de buckets/permisos. Las
URLs devueltas al navegador deben ser accesibles desde el host público; nunca
direcciones internas como `storage:9000`. Los estáticos Django se comparten en un
volumen de salida de `collectstatic` con lectura desde Caddy.

### Entregables de infraestructura

- [ ] `backend/Dockerfile` y `.dockerignore`, con dependencias bloqueadas.
- [ ] `frontend/Dockerfile` y `.dockerignore`, compilación reproducible con pnpm.
- [ ] `infra/compose.prod.yml`, red interna, volúmenes, healthchecks, reinicios y
  dependencias por salud/finalización del trabajo de release.
- [ ] Configuración Caddy para `/api`, `/admin`, `/ws`, estáticos y fallback SPA;
  certificados persistentes y terminación TLS adecuada al hostname público.
- [ ] `infra/.env.example` documentado: Django, Postgres, Redis, almacenamiento,
  correo, Gemini y origen público. Secretos suministrados al backend en ejecución.
- [ ] `VITE_ENABLE_MOCKS=false` y `VITE_API_URL=/api` al construir la imagen web.
- [ ] Autenticación WebSocket compatible con el navegador: ticket efímero de un
  uso obtenido desde REST autenticado; comprobar acceso a la conversación y
  cerrar/revalidar conexiones cuando la sesión caduque o se suspenda.
- [ ] Guía de arranque, actualización, logs, respaldo y restauración de base e imágenes.
- [ ] CI de integración PostgreSQL/Redis y construcción de imágenes del commit candidato.

Comando objetivo de arranque desde la raíz, una vez implementados los archivos y
configurado `infra/.env`:

```bash
docker compose --env-file infra/.env -f infra/compose.prod.yml up -d --build --wait
```

Docker CLI y el servicio Docker Desktop no se detectan en esta máquina auditada.
Hay que habilitar un motor Docker en la máquina donde se construirá y ensayará
el release. Gemini y la entrega de correo requieren acceso a servicios externos.

### Requisitos del servidor por confirmar

Configuración recomendada para construir y ejecutar el conjunto durante la demo:

- Ubuntu 24.04 LTS o distribución Linux equivalente, arquitectura `amd64`.
- 4 vCPU, 8 GiB de RAM y al menos 40 GiB libres; swap disponible como protección
  durante las compilaciones. Si las imágenes se construyen en CI y solo se
  descargan en el servidor, el pico de recursos puede reducirse.
- Acceso SSH con permiso `sudo`, Docker Engine y el plugin Docker Compose v2.
- IPv4 pública, dominio con DNS controlable y puertos 80/443 abiertos. SSH debe
  quedar restringido; PostgreSQL, Redis y almacenamiento no se exponen a Internet.
- Hora del sistema sincronizada, firewall activo y espacio para respaldos fuera
  de los volúmenes en uso.
- Salida HTTPS hacia Gemini y SMTP; límites del proveedor permiten la demo.

Como no existe dominio y el plazo es inmediato, la ruta de contingencia propuesta
es un hostname de DNS por IP como `<IP-publica>.sslip.io` y Caddy con certificado
ACME público. Evita comprar/configurar un dominio, pero introduce dependencia en
ese DNS de terceros y debe declararse como solución de demostración. Puertos 80 y
443 deben ser públicos antes de solicitar el certificado. Si se adquiere un
dominio propio a tiempo, reemplaza esta contingencia sin cambiar la aplicación.

Prerrequisitos de IA antes de implementar la integración:

- [ ] Crear o seleccionar un proyecto para Gemini API y generar `GEMINI_API_KEY`.
- [ ] Elegir un modelo disponible para esa clave; no fijar en código un modelo
  mencionado solo en documentación antigua.
- [ ] Hacer una petición mínima desde el servidor y registrar modelo, latencia,
  cuota y comportamiento ante `429`, sin imprimir la clave en logs.
- [ ] Guardar clave/modelo como secretos de ejecución, nunca en una imagen ni Git.

Prerrequisito de correo más rápido para la demostración: una cuenta Gmail
dedicada, verificación en dos pasos y App Password para SMTP, o un proveedor
transaccional equivalente. Deben probarse envío, recepción y remitente antes de
implementar recuperación de contraseña. No usar la contraseña normal de Google.

## 6. Secuencia de implementación y dependencias

**Regla de prioridad:** primero terminar y validar backend + frontend
integrados en local. Solo después se construyen las imágenes y se despliega en
Docker/VPS. La infraestructura, Gemini real y SMTP son pasos posteriores a la
integración funcional.

### Bloque A — Contratos, usuario y plataforma

1. Confirmar máquina/hora/recursos y comprobar Docker Engine + Compose.
2. Acordar esquema persistente de usuario y roles antes de sembrar datos.
3. Corregir y probar las migraciones en PostgreSQL 16.
4. Preparar imágenes, Compose, ASGI, Redis, almacenamiento y servicio de correo.
5. Completar registro/login/refresh/logout/perfil, recuperación de contraseña y
   gestión administrativa de usuarios/asignaciones.
6. Extender el OpenAPI acumulado para CRM, chat, notificaciones, administración e
   IA; documentar eventos WebSocket y responsabilidades de cada módulo.

**Cierre:** desde Docker, login real, roles correctos, recuperación por correo,
API conectada a PostgreSQL/Redis y carga de una imagen persistente.

### Bloque B — Propiedades y CRM completos

1. Conectar CRUD; completar campos, galería, mapa y asignación de agentes.
2. Implementar filtros del servidor, paginación, disponibilidad y favoritos.
3. Integrar slots, reserva y listado/calendario de citas por rol.
4. Completar transiciones, historial, conflictos de agenda y notificaciones.
5. Implementar ficha/historial del cliente, observaciones, dashboard y reportes.
6. Registrar eventos reales para métricas; los paneles deben consultar la base.

**Cierre:** cliente reserva; agente gestiona y registra observaciones; administrador
consulta y exporta los resultados con acceso controlado.

### Bloque C — Chat y comunicación

1. Persistir conversaciones/mensajes y montar consumers de Channels autenticados.
2. Construir UI compartida cliente/agente, cola de atención y panel administrativo.
3. Implementar presencia, no leídos, entrega/lectura, escritura y adjuntos.
4. Implementar notificaciones web/correo, reconexión e historial paginado.
5. Registrar auditoría y consultas administrativas autorizadas.

**Cierre:** dos navegadores conversan en tiempo real; recarga/reconexión conserva
mensajes y estado; el administrador puede supervisar la atención.

### Bloque D — IA y derivación integradas

1. Implementar `AIService` y `GeminiAdapter` con modelo configurable.
2. Extraer/validar preferencias y persistir contexto en la conversación compartida.
3. Implementar candidatos SQL, scoring por reglas/IA y validación de IDs/precios.
4. Mostrar recomendaciones con match, motivos y acciones reales de detalle/reserva.
5. Completar estados `BOT_ACTIVE`, `WAITING_AGENT`, `HUMAN_ACTIVE`, `CLOSED`;
   preservar contexto y evitar respuestas simultáneas de bot y agente.
6. Implementar supervisión, métricas, satisfacción y comportamiento ante cuota/error.

**Cierre:** Gemini responde realmente y recomienda inmuebles de la base; la
derivación mantiene la misma conversación. El fallback por reglas se prueba como
comportamiento ante fallo del proveedor, además de probar la integración real.

### Bloque E — Integración, calidad y entrega

1. Cerrar la matriz de 21 HU con evidencia frontend + API + persistencia.
2. Ejecutar pruebas unitarias, integración PostgreSQL/Redis, permisos y E2E en Docker.
3. Comprobar accesibilidad, responsive, carga concurrente y tiempos de respuesta.
4. Ensayar instalación limpia en entorno aislado y actualización conservando datos.
5. Preparar demo, manuales, variables, cuentas por rol, respaldo y recuperación.

Cadena crítica: **usuario/roles + PostgreSQL → propiedades/citas + conversaciones →
recomendador/derivación + supervisión → validación integral Docker**.

Contratos, pantallas y partes independientes pueden trabajarse en paralelo. Las
integraciones se validan en ese orden, con PR y CI antes de cada incorporación.

## 7. Reparto y calendario de trabajo

### Reparto propuesto, sujeto a disponibilidad real

| Frente | Responsables propuestos | Resultado |
|---|---|---|
| Plataforma, auth y tiempo real/IA backend | Brandy, con apoyo backend de Jhon | Compose, usuario/JWT, Channels, Gemini y servicios compartidos |
| Dominio y datos | Jhon | Propiedades, CRM, notificaciones, reportes y migraciones |
| UI de cuentas y gestión | Yohan | Auth, recuperación, paneles agente/admin, citas y reportes |
| UI de catálogo/comunicación e integración | Kennet/Anderson | Catálogo/CRUD/favoritos, chat/IA, integración y coordinación de QA |
| Cierre por módulo | Su responsable + revisión cruzada | Pruebas y evidencias de cada HU; la calidad acompaña el desarrollo |

**Riesgo de plazo alto:** faltan módulos enteros. Los issues #72 y #71 estiman
**10 h backend + 14 h frontend solo para autenticación**. El alcance completo
añade chat, IA, CRM, administración, infraestructura e integración. No hay base
para prometer que todo estará validado mañana sin conocer capacidad y avances
del equipo. Este calendario expresa hitos objetivo, no una estimación de que
todo ese trabajo cabe en un día. El frente backend compartido es un cuello de botella.

### Miércoles 7 — arranque inmediato

- [x] Confirmar servidor Docker, alcance completo y límite: jueves 8 a las 20:15.
- [x] Confirmar capacidad: una persona y opción gratuita sin medio confirmado.
- [ ] **Bloqueo actual:** el servidor todavía no existe. Sin VPS, solo se podrá
  validar en local con Docker Desktop o en un entorno con PostgreSQL/Redis; el
  despliegue al servidor queda pendiente de aprovisionamiento o crédito.
- [ ] Antes de las 12:30: obtener acceso a una VM con Docker (promo, prueba,
  laboratorio o servidor provisto); luego registrar IP, SO, CPU/RAM/disco y SSH.
- [ ] Antes de las 13:00: instalar Docker Engine/Compose, abrir 80/443 y probar
  HTTPS con un contenedor. Si se usa IP pública, `<IP>.sslip.io` evita dominio.
- [ ] Antes de las 13:30: crear Gmail/App Password o SMTP equivalente y probar
  un mensaje desde el servidor.
- [ ] Antes de las 13:30: crear y probar la clave Gemini API desde el servidor.
- [ ] Asignar tareas implementables a las 21 HU, registrar dependencias y estimarlas.
- [ ] Acordar contratos; iniciar A y avances independientes de B/C/D.
- [ ] Obtener una instalación Compose con PostgreSQL real y auth en integración.
- [ ] Integrar por módulo durante el día; evitar acumular todas las ramas al final.

### Miércoles 7 — punto de control obligatorio

- [ ] Medir avance por HU demostrada y pruebas aprobadas.
- [ ] Revisar capacidades y bloqueos de chat/IA/correo/Docker de forma explícita.
- [ ] Objetivo: los cuatro módulos integrados en un entorno Docker único, con
  recorridos cliente/agente/admin ejecutables.
- [ ] Si el objetivo no se cumple, registrar inmediatamente el atraso y estimación
  restante para comunicarlo al equipo/docente; el alcance completo sigue siendo
  el requisito y las historias pendientes permanecen visibles.

### Jueves 8 — ensayo y entrega

- [ ] Hasta las 15:00: cerrar integración; después solo correcciones que bloqueen
  criterios de aceptación.
- [ ] 15:00–17:15: ejecutar bloque E, corregir fallos y construir las imágenes
  candidatas identificadas por commit.
- [ ] **17:15: congelar el candidato**, tres horas antes del límite. No integrar
  funcionalidad nueva después de esta hora.
- [ ] 17:15–18:15: instalar desde cero en un entorno/volúmenes de ensayo y recorrer
  cliente, agente y administrador en navegadores separados.
- [ ] 18:15–19:15: desplegar en el servidor final, migrar, cargar datos y ejecutar
  humo externo por HTTPS/WebSocket/correo/Gemini.
- [ ] 19:15–19:45: probar respaldo y recuperación operativa sin alterar el entorno
  final; revisar logs, salud, espacio y reinicios.
- [ ] 19:45–20:05: ensayo final y recopilación de URLs/evidencias.
- [ ] **20:05–20:15: margen de entrega.** No desplegar cambios salvo recuperación
  del candidato ya validado.

## 8. Criterios de aceptación de la entrega completa

### Docker y operación

- [ ] Un checkout limpio y la configuración documentada permiten construir y
  levantar todos los servicios; no requiere Node/Python instalados en el host.
- [ ] HTTPS, refresh de rutas SPA, proxy API y WebSocket funcionan.
- [ ] PostgreSQL migra desde cero; los datos e imágenes sobreviven a recrear contenedores.
- [ ] Healthchecks distinguen servicio arrancado de dependencias disponibles.
- [ ] Build sin mocks ni URLs internas/localhost incrustadas para servicios públicos.
- [ ] Correo real y Gemini accesibles; credenciales configuradas solo donde corresponde.

### Recorridos funcionales

- [ ] **Cliente:** registro/login/recuperación → filtros/galería/mapa → favorito →
  IA con contexto → recomendación → reserva → notificación → chat humano.
- [ ] **Agente:** propiedades y agenda → aceptar/reprogramar/cancelar cita →
  atender chat con contexto → completar visita → observaciones y ficha del cliente.
- [ ] **Administrador:** usuarios/asignaciones → supervisión de citas/chats/bot →
  métricas basadas en datos reales → exportación → auditoría.
- [ ] Cada HU de la matriz tiene prueba/evidencia positiva y rechazo por permisos
  cuando corresponda; anonimato, sesiones caducadas y errores no muestran éxitos falsos.
- [ ] Reservas simultáneas no duplican franjas; reprogramar/cancelar actualiza la agenda.
- [ ] Chat confirma mensajes después de persistirlos y recupera historial tras reconexión.
- [ ] La IA usa únicamente candidatos reales y la derivación conserva la conversación.

### Calidad y evidencia

- [ ] Frontend, backend, integración PostgreSQL/Redis y E2E aprobados en el candidato.
- [ ] Navegación por teclado, foco, formularios, diálogos y alertas comprobados.
- [ ] Vistas responsive verificadas y resultados por navegador documentados.
- [ ] Medir catálogo objetivo p95 ≤ 2 s, respuestas IA objetivo < 3 s y escenarios
  de 100 usuarios concurrentes, indicando carga, máquina y limitaciones reales.
- [ ] Configurar medición de disponibilidad; el objetivo 99.5% a 30 días se registra
  como pendiente de medición hasta tener esa ventana, conforme al documento SLI/SLO.
- [ ] Manual de arranque, variables, demo, evidencias, commit e imágenes publicados.

## 9. Definiciones y accesos que faltan

### Datos a confirmar con el usuario

Confirmado: servidor Docker, jueves 8 a las 20:15 hora Lima, cuenta Google AI Pro,
una persona y Gmail/App Password.

También confirmado como pendiente: servidor aún no creado, sin dominio, sin SMTP
operativo y sin clave Gemini API.

1. **Decisión crítica:** confirma cómo obtener hoy la VM con Docker. Sin VPS,
   no hay despliegue al servidor final; podrías solo validar local si instalas
   Docker Desktop.
2. Elegir proveedor y provisionar el VPS; luego registrar IP, sistema operativo,
   CPU/RAM/disco, SSH con `sudo` y estado de Docker Engine/Compose.
3. Usar temporalmente `<IP>.sslip.io` con Caddy/HTTPS o aportar un dominio propio;
   en ambos casos abrir 80/443.
4. Configurar Gmail/App Password como secreto del servidor, sin incorporarlo al
   repositorio ni enviarlo por chat.
5. Confirmar la clave/cuota de Gemini API con una prueba desde el servidor. La
   suscripción Google AI Pro de Gemini Apps no reemplaza este requisito.

### Inconsistencias de contrato a resolver al comenzar

- HU-PROP-01 (#17) pide ocultar vendidos/alquilados; el contrato de disponibilidad
  los mantiene visibles sin reserva. Unificar la regla de catálogo y sus pruebas.
- El issue de registro menciona elegir rol; la arquitectura reserva la gestión de
  usuarios al administrador. Definir registro público de cliente y asignación
  administrativa de privilegios, actualizando el criterio correspondiente.
- La arquitectura enumera URLs antiguas sin `/v1` y un transporte de tokens más
  general. Mantener el contrato OpenAPI acumulado como referencia de rutas y
  precisar ahí los nuevos endpoints, logout y autenticación WebSocket.
- Elegir un esquema compatible para usuarios/roles/IDs con las migraciones ya
  aplicadas; cualquier transición debe preservar los datos que se encuentren.
