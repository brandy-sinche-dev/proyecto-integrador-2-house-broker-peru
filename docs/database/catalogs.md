# Catálogos y Datos de Referencia — HouseBroker Perú

Valores cerrados del modelo. Cada valor enumerado está en **dos** lugares de este
documento y en ningún otro:

- El `CHECK` de la columna, que es lo que Postgres aplica.
- La tabla de acá, que es lo que un humano lee y edita.

Si agregas un valor en uno y no en el otro, el sistema se rompe de una de las dos
formas: un `CHECK` que lo rechaza, o un enum del API que produce un `400` que el
frontend no sabe mostrar. Este archivo es el lugar único de edición, y
`migrations-and-seeding.md` §6 tiene el procedimiento de cambio.

---

## 1. `user.role` — `UserRole`

Espejo exacto del enum `UserRole` de `openapi_spec.yaml`.

| Valor | Etiqueta | Significado | Puede crear propiedades | Agenda citas |
|---|---|---|:--:|:--:|
| `CLIENTE` | Cliente | Busca, agenda, guarda favoritos | No | Sí, las suyas |
| `AGENTE` | Agente inmobiliario | Gestiona inmuebles asignados | Sí, asignados | Sí, las suyas |
| `ADMINISTRADOR` | Administrador | Control total | Sí, todas | Sí, todas |

**Por qué no se usa `django.contrib.auth.Group`**

Django resuelve permisos por grupos, y una implementación "correcta" sería crear
tres grupos y asignarlos. El proyecto hace lo contrario por dos razones:

1. El JWT lleva el rol en el claim `role` (`TokenPair.access` en el spec) y el
   backend autoriza **desde el token, sin consultar la base**. Un grupo exigiría
   una consulta por petición para reconstruir el rol.
2. `docs/01_requerimientos.md` §2 define tres roles fijos de negocio. Un grupo
   es un mecanismo de composición: con cinco grupos se obtienen quince
   combinaciones, y ninguna de ellas es un rol de HouseBroker.

`auth_group` sigue existiendo porque `django.contrib.admin` la crea. Queda
disponible si más adelante hacen falta permisos finos sin ser roles de negocio.

**`RegisterInput.role` solo admite `CLIENTE`**

El spec ya lo restringe y devuelve `400 role_not_assignable` para `AGENTE` y
`ADMINISTRADOR`. En la base, esto se refuerza en el servicio de registro, nunca en
el `DEFAULT` de la columna: un default de `CLIENTE` protege contra omisión, no
contra envío explícito.

---

## 2. `property.property_type` — `PropertyType`

Espejo exacto del enum `PropertyType` del spec y de `PROPERTY_TYPES` en
`frontend/src/services/types.ts`. Los tres deben coincidir.

| Valor | Etiqueta | Descripción |
|---|---|---|
| `DEPARTAMENTO` | Departamento | Unidad de vivienda en edificio |
| `CASA` | Casa | Vivienda unifamiliar independiente |
| `TERRENO` | Terreno | Lote sin construcción |
| `OFICINA` | Oficina | Espacio comercial para oficina |

**Por qué son cuatro y no más**

Son los tipos del MVP. `RF-PROP-01` dice "casa, departamento, locales, etc.", y
"etc." deja la puerta abierta. Agregar `LOCAL`, `DEPARTAMENTO_DUPLEX` o
`PENTHOUSE` es una migración de datos, no solo una constante: hay que actualizar
el `CHECK`, el enum del spec, `PROPERTY_TYPES` y `PROPERTY_TYPE_LABELS` en el
frontend, en el mismo commit. Ver `migrations-and-seeding.md` §6.1.

`TERRENO` es el caso interesante: no tiene dormitorios, baños ni cochera, y el
frontend tiene que mostrar esos campos vacíos sin romper la ficha. De ahí que
`bedrooms`, `bathrooms` y `area_built` sean `NULL`-ables y no `NOT NULL DEFAULT 0`.

---

## 3. `property_schedule_slot.weekday` — `Weekday`

El enum del spec usa strings; la columna guarda enteros.

| DB | Valor | Enum del spec |
|---:|---|---|
| `0` | Lunes | `LUNES` |
| `1` | Martes | `MARTES` |
| `2` | Miércoles | `MIERCOLES` |
| `3` | Jueves | `JUEVES` |
| `4` | Viernes | `VIERNES` |
| `5` | Sábado | `SABADO` |
| `6` | Domingo | `DOMINGO` |

`get_weekday()` de Python devuelve `0` para lunes, con la misma convención, así
que la conversión en el serializer es directa:

```python
WEEKDAY_TO_ENUM = dict(enumerate(Weekday.choices))
ENUM_TO_WEEKDAY = {v: k for k, v in WEEKDAY_TO_ENUM.items()}
```

Los valores en español van **sin tilde** en el enum del API (`MIERCOLES`, `SABADO`)
porque son identificadores de máquina que viajan en JSON y en query strings, no
texto para humanos. La etiqueta con tilde es "Miércoles" y "Sábado", y esa vive
en el frontend.

---

## 4. Estados

### 4.1 `property.status` — `PropertyStatus`

| Valor | Etiqueta | ¿Visible en catálogo? | ¿Acepta reservas? | Motivo obligatorio |
|---|---|:--:|:--:|:--:|
| `DISPONIBLE` | Disponible | Sí | Sí | No |
| `RESERVADO` | Reservado | Sí | No | **Sí** |
| `ALQUILADO` | Alquilado | Sí | No | **Sí** |
| `VENDIDO` | Vendido | Sí | No | **Sí** |
| `SUSPENDIDO` | Suspendido | **No** | No | **Sí** |

Las dos primeras columnas de esta tabla son la razón de separar `status` de
`is_active`. `RESERVADO`, `ALQUILADO` y `VENDIDO` **mantienen el inmueble visible**:
el cliente tiene que poder ver que la casa que quiere existe aunque ya no esté
disponible. Retirarla del catálogo sería esconder el inventario y generar
preguntas al call center comercial.

`SUSPENDIDO` es el único que además baja `is_active` a `false`.

**Motivo obligatorio** según `PropertyStatusInput.reason`: "obligatorio para
transiciones a `SUSPENDIDO`, `RESERVADO`, `ALQUILADO` y `VENDIDO` porque son
decisiones comerciales auditables; opcional al volver a `DISPONIBLE`". La regla vive
en el servicio y queda registrada en `property_status_change`.

### 4.2 Transiciones de estado de propiedad

| Desde \ A | `DISPONIBLE` | `RESERVADO` | `ALQUILADO` | `VENDIDO` | `SUSPENDIDO` |
|---|:--:|:--:|:--:|:--:|:--:|
| `DISPONIBLE` | — | Sí | No | No | Sí |
| `RESERVADO` | Sí | — | Sí | No | Sí |
| `ALQUILADO` | No | No | — | No | Sí |
| `VENDIDO` | No | No | No | — | Sí |
| `SUSPENDIDO` | Sí | No | No | No | — |

Dos diagonales vacías por regla:

- **`ALQUILADO → VENDIDO` está bloqueado** aunque `ALQUILADO` y `VENDIDO` suenen
  excluyentes: un inmueble alquilado que el propietario decide vender sigue
  alquilado y pasa a `SUSPENDIDO` mientras se negocia la venta. El MVP no modela
  esa simultaneidad y **no debe aceptarse** hasta que exista un estado
  `EN_VENTA` que la represente.
- **`VENDIDO → DISPONIBLE` está bloqueado** porque deshace un cierre comercial.
  Si un cliente se retracta, la decisión es revisar si `VENDIDO` era correcto, y
  esa corrección queda en `property_status_change` con su motivo y su actor.

Cualquier transición no listada devuelve `400 invalid_appointment_transition` (el
mismo código que usa el módulo CRM, por simetría del contrato).

### 4.3 `appointment.status` — `AppointmentStatus`

| Valor | Etiqueta | Terminal | Notas |
|---|---|:--:|---|
| `PENDING` | Pendiente | No | Estado de nacimiento. Nunca es destino |
| `CONFIRMED` | Confirmada | No | |
| `RESCHEDULED` | Reprogramada | No | Exige `scheduled_at` nuevo |
| `COMPLETED` | Completada | **Sí** | Habilita `visit_observation` |
| `CANCELLED` | Cancelada | **Sí** | |
| `NO_SHOW` | No asistió | **Sí** | El cliente nocompareció |

Los tres últimos son terminales: "no admiten transición de salida", según el spec.
`PENDING` está excluido del conjunto de destinos "a propósito: una cita nace en
`PENDING` al ser solicitada y ninguna transición válida devuelve el estado a ese
valor".

### 4.4 Transiciones de estado de cita

| Desde \ A | `PENDING` | `CONFIRMED` | `RESCHEDULED` | `COMPLETED` | `CANCELLED` | `NO_SHOW` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `PENDING` | — | Sí | Sí | No | Sí | No |
| `CONFIRMED` | — | — | Sí | Sí | Sí | Sí |
| `RESCHEDULED` | — | Sí | — | Sí | Sí | Sí |
| `COMPLETED` | — | No | No | — | No | No |
| `CANCELLED` | — | No | No | No | — | No |
| `NO_SHOW` | — | No | No | No | No | — |

Tres reglas que la tabla sola no explica:

1. **`PENDING → COMPLETED` está bloqueado.** No se puede dar por realizada una
   visita sin confirmar. La intermediary `CONFIRMED` es el registro de que alguien
   la aceptó.
2. **`NO_SHOW` sale de `CONFIRMED` o `RESCHEDULED`, no de `PENDING`.** Nadie
   presenció una visita que nadie confirmó.
3. **`RESCHEDULED → CONFIRMED`** existe porque `RESCHEDULED` es un estado
   transitorio real: el agente propone un horario y el cliente lo acepta.

**Regla de `scheduled_at`**

`AppointmentStatusInput.scheduled_at` es obligatorio cuando `status` es
`RESCHEDULED` y **prohibido** en cualquier otra transición, "para que reprogramar y
mover una cita sin cambiar su estado no se confundan".

| Transición | `scheduled_at` |
|---|---|
| Cualquiera → `RESCHEDULED` | **Obligatorio** |
| Cualquier otra | **Prohibido** |

Para mover una cita sin cambiar su estado se usa `CONFIRMED → CONFIRMED` con
`scheduled_at`… que el spec prohíbe. Es decir: **el contrato actual no permite
mover una cita sin marcar `RESCHEDULED`**, y esa es una decisión consciente. No
hay que abrir una excepción al implementar.

---

## 5. Otras enumeraciones

### 5.1 `property.currency` — `Moneda`

| Valor | Símbolo | Uso |
|---|---|---|
| `PEN` | S/ | **Default.** `PropertyInput.moneda` dice "si se omite, el servidor asume `PEN`" |
| `USD` | $ | Propiedades otorgadas en dólares |

### 5.2 `property.mode` — `TransactionMode`

| Valor | Etiqueta |
|---|---|
| `VENTA` | Venta |
| `ALQUILER` | Alquiler |

### 5.3 `conversation.status` y `.mode`

Estados de `docs/02_Arquitectura.md` §7.2:

| `status` | Descripción | `agent_id` | `mode` |
|---|---|---|---|
| `BOT_ACTIVE` | La agente virtual atiende automáticamente | `NULL` | `VIRTUAL` |
| `WAITING_AGENT` | El cliente pidió atención y está en cola | `NULL` | `VIRTUAL` |
| `HUMAN_ACTIVE` | Un agente humano tomó la conversación | Obligatorio | `HUMAN` |
| `CLOSED` | La atención fue finalizada | `NULL` o el último | cualquiera |

### 5.4 `handoff_request.status`

| Valor | Cuándo |
|---|---|
| `PENDING` | Cliente pidió agente, nadie aceptó |
| `ACCEPTED` | Un agente tomó la conversación |
| `CANCELLED` | El cliente se desesperó y volvió al bot |
| `EXPIRED` | Pasó el tiempo máximo de espera |

`EXPIRED` no aparece en la máquina de estados de la arquitectura porque es
detalle operativo de la cola, no un estado de la conversación. El cliente recibe
la misma respuesta en `CANCELLED` y en `EXPIRED`, y el dashboard los distingue.

### 5.5 `message.sender_type`

| Valor | `sender_id` |
|---|---|
| `CLIENT` | Obligatorio |
| `AGENT` | Obligatorio |
| `BOT` | `NULL` |
| `SYSTEM` | `NULL` |

### 5.6 `ai_session.status` y `provider`

| `status` | Significado |
|---|---|
| `ACTIVE` | Conversando con el bot |
| `COMPLETED` | El cliente la cerró |
| `FALLBACK` | Terminó sin IA |
| `ABORTED` | Cortada por error |

`FALLBACK` exige `fallback_reason`:

| `provider` | Origen |
|---|---|
| `GEMINI` | `GeminiAdapter` contra la API de Google |
| `LOCAL` | Modelo en el servidor |
| `FALLBACK` | Sin IA: solo `rules_score` |

`LOCAL` existe para que el patrón Adapter sea verificable: si algún día corre un
modelo propio, la columna lo registra sin cambiar nada más.

### 5.7 `notification.type`

| Valor | Evento | Canal |
|---|---|---|
| `APPOINTMENT_CONFIRMED` | Cita confirmada | Email, in-app |
| `APPOINTMENT_RESCHEDULED` | Cita reprogramada | Email, in-app |
| `APPOINTMENT_CANCELLED` | Cita cancelada | Email, in-app |
| `APPOINTMENT_REMINDER` | Recordatorio de visita | Push, in-app |
| `NEW_MESSAGE` | Mensaje nuevo en el chat | In-app |
| `HANDOFF_ACCEPTED` | Un agente tomó la conversación | In-app |
| `NEW_LEAD` | Asignación de cliente potencial | In-app |
| `NEW_PROPERTY_ASSIGNED` | Inmueble asignado al agente | In-app |
| `PASSWORD_CHANGED` | Contraseña restablecida | Email |

`PASSWORD_CHANGED` es un requisito de seguridad, no de producto: sin él, un
usuario que no haya pedido el cambio no tiene forma de enterarse.

---

## 6. `district` — Lima Metropolitana

43 distritos de la provincia de Lima, más las 3 provincia de Callao que el MVP
43 distritos de la provincia de Lima, más las 3 provincias de Callao que el MVP
el `pattern` de `UbigeoFilter`.

| `ubigeo` | Distrito | Provincia |
|---|---|---|
| `150101` | Lima | Lima |
| `150102` | Ancón | Lima |
| `150103` | Ate | Lima |
| `150104` | Barranco | Lima |
| `150105` | Breña | Lima |
| `150106` | Carabayllo | Lima |
| `150107` | Chorrillos | Lima |
| `150108` | Cienfuegos | Lima |
| `150109` | Comas | Lima |
| `150110` | Concepción de Oco | Lima |
| `150111` | Carabayllo *(verificar)* | Lima |
| `150112` | Lurigancho | Lima |
| `150113` | Lurín | Lima |
| `150114` | Máscara *(verificar)* | Lima |
| `150115` | Miraflores | Lima |
| `150116` | Pachacamac | Lima |
| `150117` | Pucusana | Lima |
| `150118` | Punta Hermosa | Lima |
| `150119` | Punta Sal | Lima |
| `150120` | Rimac | Lima |
| `150121` | San Bartolo | Lima |
| `150122` | San Borja | Lima |
| `150123` | San Isidro | Lima |
| `150124` | San José de Los Olivos *(verificar)* | Lima |
| `150125` | San Juan de Lurigancho | Lima |
| `150126` | San Luis | Lima |
| `150127` | San Martín de Porres | Lima |
| `150128` | San Miguel | Lima |
| `150129` | Santa Anita | Lima |
| `150130` | Santa Rosa | Lima |
| `150131` | Surco | Lima |
| `150132` | Surquillo | Lima |
| `150133` |Villa El Salvador | Lima |
| `150134` | Villa María del Triunfo | Lima |
| `150135` | VMT | Lima |

**Este catálogo necesita verificación antes de usarlo.** Escribí los códigos de
memoria a partir del patrón `1501xx` de la provincia de Lima, y hay al menos tres
filas marcadas *(verificar)* donde el número y el nombre probablemente no
corresponden. No es seguro seedear con esto.

El procedimiento correcto está en `migrations-and-seeding.md` §5: la fuente
primaria es el **Censo Nacional del INEI**, y la verificación es que el total sume
exactamente 43 para Lima más 3 para Callao:

| `ubigeo` | Distrito | Provincia |
|---|---|---|
| `070101` | Callao | Callao |
| `070102` | Bellavista | Callao |
| `070103` | La Perla | Callao |

Razón social del código: INEI usa los dos primeros dígitos para el departamento
(`15` = Lima, `07` = Callao), los dos siguientes para la provincia (`01` = Lima,
`02` = Callao), y los dos últimos para el distrito. Es por eso que `UbigeoFilter`
exige 6 dígitos y no 5.

**Mientras el catálogo no esté verificado, el filtro `ubigeo` no se puede dar por
listo.** La alternativa de evitar el problema —guardar el distrito como `varchar`
en `property`— se descartó: el código INEI es el identificador estable entre
censos y el texto del distrito cambia.

---

## 7. `property.features` — Estructura de `jsonb`

Sin esquema cerrado, pero con un contrato de contenido. Es la columna más
disciplinada y la más libre del modelo, y esa tensión tiene que gestionarse.

```json
{
  "amenities": ["ascensor", "piscina", "gimnasio", "terraza"],
  "security": ["intercomunicador", "vigilancia_24_7", "porteria"],
  "utilities": ["agua", "luz", "gas", "internet"],
  "condition": "semi_nuevo",
  "floors": 3,
  "orientation": "este",
  "nearby": ["colegio", "hospital", "parque", "metro"],
  "tags": ["playa", "vista_al_mar", "inversion"]
}
```

| Clave | Tipo | Usada por |
|---|---|---|
| `amenities` | `string[]` | `preferences.required_features` del bot |
| `security` | `string[]` | `required_features` |
| `utilities` | `string[]` | Filtro del cliente |
| `condition` | `string` | Filtro del cliente |
| `floors` | `int` | Filtro del cliente |
| `orientation` | `string` | Rareza, muestra ficha |
| `nearby` | `string[]` | **Scoring del LLM**: "cerca del trabajo" |
| `tags` | `string[]` | Agrupación del catálogo |

**El control del que depende la recomendación**

`docs/02_Arquitectura.md` §6.4 pone el filtro verificable en PostgreSQL y el
interpretación semántica en el LLM. `features.nearby` cruza esa frontera: un
cliente dice "cerca del trabajo" y el LLM mira `nearby` para puntuar.

Eso funciona **solo si `nearby` está poblado de forma consistente**. Si 200
propiedades tienen la lista vacía y 25 la tienen completa, el LLM puntuará alto a
las 25 por un sesgo de completitud, no por cercanía real. Por eso `features` tiene
`DEFAULT '{}'`, que se distingue de un objeto poblado, y el pipeline de
recomendación debe poder medir esa tasa de llenado antes de confiar en el campo.

**Vocabulario controlado**

Los valores de `amenities`, `security`, `utilities` y `tags` salen de una lista
fija, no de texto libre. Sin ella, "ascensor" y "ascensores" y "elevador" serían
tres valores distintos y el filtro por característica devolvería cero resultados
para una palabra que el usuario sí usó. El vocabulario va en
`frontend/src/services/types.ts` (para los filtros) y en `apps/properties`
(para la validación), y los dos se actualizan juntos.

---

## 8. Valores por defecto de la plataforma

No son catálogos, pero son constantes que el modelo asume.

| Constante | Valor | Dónde se usa |
|---|---|---|
| Zona horaria | `America/Lima` | Toda conversión `time` → `timestamptz` |
| Duración por defecto de cita | `45` minutos | `appointment.duration_minutes` |
| Duración mínima de cita | `15` minutos | `AvailableSlot.duration_minutes` |
| Duración máxima de cita | `480` minutos | `AvailableSlot.duration_minutes` |
| Duración mínima de franja | `30` minutos | `TimeSlotInput`, validada en el servicio |
| Duración máxima de franja | `8` horas | `TimeSlotInput` |
| Máx. franjas por día | `6` | `WeekdayScheduleInput.slots` |
| Máx. franjas por semana | `28` | `PropertySchedulesInput` |
| Tamaño de página por defecto | `12` | `Limit` del spec |
| Tamaño de página por defecto (DRF) | `10` | `REST_FRAMEWORK.PAGE_SIZE` |
| Página máxima | `100` | `Limit` del spec |
| Longitud mínima de `search` | `2` caracteres | `Search.minLength` |
| Longitud de `reason` | `5`–`500` | `PropertyStatusInput.reason` |
| Vigencia del access token | `1800` segundos | `TokenPair.expires_in` |
| Umbral de interés | `1`–`5` | `visit_observation.interest_level` |

**Dos tamaños de página distintos, y no es un error**

El spec dice `default: 12` en el parámetro `Limit`, y `settings.py` tiene
`PAGE_SIZE: 10` en `REST_FRAMEWORK`. El parámetro documentado gana porque
`Limit` es explícito en la operación. La consecuencia práctica: si alguien
implementa `Limit` leyendo solo `settings.py`, el catálogo devolverá 10 por página
en vez de 12, y una prueba que espere `count: 25` con `limit: 12` verá páginas de
10 y fallará.

Vale la pena alinear los dos. No es un problema de la base de datos, pero lo
produce la misma dependencia del contrato.

---

## 9. Zonas horarias y el cambio horario peruano

Perú es `America/Lima`, `UTC-5`, todo el año, desde 2019. No aplica horario de
verano.

Eso hace que la conversión `property_schedule_slot.time` → `appointment.scheduled_at`
sea siempre `+5 horas`, sin seasonally variable. Aun así, la conversión se hace
con la zona de `zoneinfo`, nunca sumando cinco horas a mano:

```python
from zoneinfo import ZoneInfo
from datetime import datetime, time, timedelta

LIMA = ZoneInfo("America/Lima")

def materialize_slot(slot, date):
    start = datetime.combine(date, slot.start_time, tzinfo=LIMA)
    end = datetime.combine(date, slot.end_time, tzinfo=LIMA)
    return start, end
```

`datetime.combine(date, time, tzinfo=...)` es la operación correcta: adjunta la
zona **antes** de convertir a UTC. Construir primero un `datetime` naïve y luego
`replace(tzinfo=...)` funciona hoy, y es exactamente el tipo de atajo que rompe
cuando alguien cambia una línea.

Si el proyecto alguna vez amplía a zonas con horario de verano, esta función es el
único punto que hay que tocar. Las columnas `time` siguen siendo correctas: la
intención es "09:00 hora local", y el offset se resuelve al materializar.

---

## 10. Resumen: dónde vive cada valor

| Valor | Restricción en la BD | Enum del API | Constante del frontend |
|---|---|---|---|
| `user.role` | `CHECK` | `UserRole` | — |
| `property.property_type` | `CHECK` | `PropertyType` | `PROPERTY_TYPES`, `PROPERTY_TYPE_LABELS` |
| `property.currency` | `CHECK` | `Moneda` | `Moneda` |
| `property.mode` | `CHECK` | `TransactionMode` | `TRANSACTION_MODES`, `TRANSACTION_MODE_LABELS` |
| `property.status` | `CHECK` | `PropertyStatus` | — |
| `slot.weekday` | `CHECK 0–6` | `Weekday` | — |
| `appointment.status` | `CHECK` | `AppointmentStatus` | — |
| `conversation.status` | `CHECK` | — | — |
| `district.ubigeo` | `UK` + `CHECK` regex | — | — |
| `features.*` | Sin `CHECK` | — | Vocabulario de filtros |

**La regla de la columna de la derecha del medio**

Cuando un valor cerrado aparece en el spec y en la base, actualizar ambos en el
mismo commit. El README de la API ya lo exige para `Property` respecto de
`types.ts`; este documento extiende esa exigencia a los enums, que son el punto
donde el desacople se vuelve barato de romper.

Agregar un valor a `property_type` sin tocar `PropertyType` produce un `400
invalid_query_parameter` en el filtro, que es exactamente el código que
`TASK-ARC-PROP-03` define para "valor fuera del enum". Agregarlo sin tocar el
frontend produce un `403`-apariencia en el catálogo: la API acepta el valor, la
tarjeta no sabe renderizarlo.