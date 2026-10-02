# Documentación de API — HouseBroker Perú

Contratos REST del backend (Django REST Framework) bajo especificación **OpenAPI 3.0**.

> **Tarea actual:** [TASK-ARC-PROP-05] Especificación OpenAPI 3.0 para la
> gestión de propiedades favoritas —
> [issue #104](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/104) (HU-PROP-05).

## Archivo único de contrato

**`openapi_spec.yaml`** es el contrato acumulado de todo el proyecto. Cada sprint
añade aquí los endpoints que entrega, en lugar de crear un archivo por tarea, para
que al cierre (Sprint 7) exista un solo `.yml` con la API completa.

| Versión | Sprint | Tarea | Issue | Alcance incorporado |
|---|---|---|---|---|
| 1.0.0 | Sprint 1 | `TASK-ARC-PROP-01` | — | CRUD de propiedades (HU-PROP-01) |
| 1.1.0 | Sprint 2 | `TASK-ARC-PROP-02` | [#34](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/34) | Catálogo paginado + errores RFC 7807 (HU-PROP-02) |
| 1.1.0 | Sprint 2 | — | — | Sincronizado con `Property` de `types.ts`: `moneda`, `mode` y atributos |
| 1.2.0 | Sprint 2 | `TASK-ARC-PROP-03` | [#43](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/43) | Query params de filtros: `minPrice`, `maxPrice`, `propertyType`, `ubigeo`, `search` (HU-PROP-03) |
| 1.3.0 | Sprint 3 | `TASK-ARC-PROP-04` | [#83](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/83) | Estado operativo (`PATCH .../status`) y horarios (`GET`/`PUT .../schedules`), con `401`/`403`/`409` (HU-PROP-04) |
| 1.4.0 | Sprint 4 | `TASK-ARC-CRM-02` | [#97](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/97) | Agenda de citas filtrada por rol (`GET /api/v1/appointments`) y estados de cita (`PATCH .../status`) (HU-CRM-02) |
| 1.5.0 | Sprint 4 | `TASK-ARC-CRM-01` | [#90](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/90) | Disponibilidad por fecha (`GET .../available-slots`) y alta de citas (`POST /api/v1/appointments`) (HU-CRM-01) |
| 1.6.0 | Sprint 3 | `TASK-ARC-SEC-01` | [#69](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/69) | `bearerAuth` + `refreshCookie`, y `register` / `login` / `refresh` (HU-SEC-01) |
| 1.7.0 | Sprint 3 | `TASK-ARC-SEC-02` | [#76](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/76) | Recuperación de contraseña: `password-reset` y `password-reset-confirm` (HU-SEC-02) |
| 1.8.0 | Sprint 4 | `TASK-ARC-PROP-05` | [#104](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/104) | Favoritos por usuario: `GET`/`POST /favorites/` y `DELETE /favorites/{property_id}/` (HU-PROP-05) |

Al crecer el documento, extrae las secciones a `components/schemas` y referencia
con `$ref`. No dupliques esquemas entre operaciones.

`Property` en el spec replica campo por campo la interfaz `Property` de
`frontend/src/services/types.ts`, incluidos los opcionales (`area_total`,
`dormitorios`, `link_galeria`, `negociable`, etc.). Si cambias ese tipo, actualiza
el schema en el mismo commit.

## Endpoints documentados

| Método | Ruta | Operación | Sprint |
|---|---|---|---|
| GET | `/api/v1/favorites/` | `listFavorites` — paginado, por `added_at` desc | 4 |
| POST | `/api/v1/favorites/` | `addFavorite` — idempotente | 4 |
| DELETE | `/api/v1/favorites/{property_id}/` | `removeFavorite` — idempotente | 4 |
| POST | `/api/v1/auth/register` | `registerUser` | 3 |
| POST | `/api/v1/auth/login` | `loginUser` | 3 |
| POST | `/api/v1/auth/refresh` | `refreshAccessToken` | 3 |
| POST | `/api/v1/auth/password-reset/` | `requestPasswordReset` | 3 |
| POST | `/api/v1/auth/password-reset-confirm/` | `confirmPasswordReset` | 3 |
| GET | `/api/v1/properties` | `listProperties` — catálogo paginado | 2 |
| POST | `/api/v1/properties` | `createProperty` | 1 |
| GET | `/api/v1/properties/{id}` | `getProperty` | 1 |
| PUT | `/api/v1/properties/{id}` | `updateProperty` | 1 |
| DELETE | `/api/v1/properties/{id}` | `deleteProperty` — eliminación lógica | 1 |
| PATCH | `/api/v1/properties/{id}/status` | `updatePropertyStatus` — estado operativo | 3 |
| GET | `/api/v1/properties/{id}/schedules` | `getPropertySchedules` | 3 |
| PUT | `/api/v1/properties/{id}/schedules` | `replacePropertySchedules` | 3 |
| GET | `/api/v1/properties/{id}/available-slots` | `getPropertyAvailableSlots` — horarios libres por fecha | 4 |
| GET | `/api/v1/appointments` | `listAppointments` — agenda paginada y filtrada | 4 |
| POST | `/api/v1/appointments` | `createAppointment` — solicitud de visita | 4 |
| PATCH | `/api/v1/appointments/{id}/status` | `updateAppointmentStatus` — estado de cita | 4 |

## Catálogo paginado (HU-PROP-02)

`GET /api/v1/properties`

| Parámetro | Tipo | Default | Restricciones |
|---|---|---|---|
| `page` | integer (int32) | `1` | `minimum: 1` |
| `limit` | integer (int32) | `12` | `minimum: 1`, `maximum: 100` |
| `X-Request-Id` (header) | uuid | — | Correlación para trazar la petición |

## Filtros de búsqueda (HU-PROP-03)

`TASK-ARC-PROP-03` especifica los query params de filtrado sobre el mismo
recurso `GET /api/v1/properties`, sin crear un endpoint nuevo. Cada parámetro
está definido en `components/parameters` del spec (`MinPrice`, `MaxPrice`,
`PropertyTypeFilter`, `UbigeoFilter`, `Search`) y referenciado desde la
operación.

| Parámetro | Tipo | Formato | Campo filtrado |
|---|---|---|---|
| `minPrice` | number (double) | `minimum: 0.0001` | `price`, extremo **inclusivo** |
| `maxPrice` | number (double) | `minimum: 0.0001` | `price`, extremo **inclusivo** |
| `propertyType` | array de `PropertyType` | `style: form`, `explode: true` | `property_type` |
| `ubigeo` | array de string | patrón `^[0-9]{6}$` | `ubigeo` del distrito |
| `search` | string | `minLength: 2`, `maxLength: 120` | `title`, `address` |

### Semántica

- **Combinación AND entre filtros distintos.** `?minPrice=100000&propertyType=CASA`
  exige precio *y* tipo. `count` y `X-Total-Count` se calculan sobre el conjunto
  ya filtrado.
- **OR dentro de un filtro multivaluado.** `propertyType` y `ubigeo` aceptan
  varios valores repitiendo el parámetro (`?propertyType=CASA&propertyType=TERRENO`),
  no listas separadas por comas. Repetir el parámetro encaja con
  `explode: true` y con la convención de `django-filter` en el backend.
- **`propertyType` reutiliza el enum `PropertyType`**, de modo que el contrato no
  duplica la lista de tipos ni se desincroniza con `PROPERTY_TYPES` de
  `types.ts`.
- **`ubigeo` son 6 dígitos**, el código INEI del distrito, alineado con el
  catálogo `District` del MVP (Lima Metropolitana).
- **`search` es case-insensitive y sin acentos**, y colapsa espacios
  múltiples. El mínimo de 2 caracteres acota el costo de la búsqueda.
- **Parámetro vacío equivale a omitido.** `?propertyType=` se trata como filtro no
  aplicado, para que el frontend pueda limpiar un control sin reescribir la URL.
- **Los filtros se reflejan en `next`/`previous`.** Los enlaces de paginación
  arrastran los filtros activos, de modo que saltar de página no los pierde.

### Validación de parámetros inválidos

Un parámetro enviado con valor que no cumple su esquema produce `400`
(`ProblemBadRequest`), nunca un `200` con resultados silenciosamente filtrados ni
un `500`.

| Código | Cuándo |
|---|---|
| `invalid_query_parameter` | Tipo, formato, longitud o pertenencia a enum inválidos |
| `invalid_filter_range` | `minPrice` > `maxPrice` (cada valor es válido, el rango no) |

Casos rechazados:

| Petición | Motivo |
|---|---|
| `?propertyType=DUPLEX` | Valor fuera del enum `PropertyType` |
| `?ubigeo=1501` | No cumple `^[0-9]{6}$` |
| `?search=a` | 1 carácter, por debajo del `minLength: 2` |
| `?minPrice=450000&maxPrice=150000` | Rango invertido (`invalid_filter_range`) |
| `?page=0` | Paginación fuera de rango (contrato de `TASK-ARC-PROP-02`) |

La validación **no corta en el primer fallo**: `errors` contiene una entrada por
cada parámetro inválido de la misma petición, en el orden en que los declara la
operación, para que el frontend marque todos los controles con error a la vez.

### Sincronización con la URL

`TASK-ARC-PROP-03` incluye la sincronización con la URL, que habilita
`TASK-FRONT-PROP-03` y `TASK-TEST-PROP-03`:

- Los filtros viven en el *query string*, no en el estado de React, de modo que
  el catálogo sea enlazable y compartible.
- Al aplicar o limpiar un filtro el frontend reescribe la URL con
  `history.replaceState` y **restablece `page=1`**: conservar la página actual
  dejaría al usuario en un índice fuera de rango del conjunto filtrado.
- El orden de los parámetros es indiferente para el servidor, pero la
  serialización del frontend es determinista para que dos búsquedas iguales
  produzcan URLs iguales.
- Al eliminar el último filtro se quita el parámetro del *query string* en vez de
  dejarlo vacío; `?propertyType=` sigue siendo válido por compatibilidad, pero no
  es la forma que debe generar el cliente.

```bash
# 2 casas o terrenos en Miraflores o San Isidro, entre 100k y 450k
curl "http://localhost:8000/api/v1/properties?minPrice=100000&maxPrice=450000&propertyType=CASA&propertyType=TERRENO&ubigeo=150131&ubigeo=150143"
```

### Respuesta `200` — `application/json`

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/properties?limit=3&page=2",
  "previous": null,
  "results": [
    {
      "id": "b2c1f5a0-1a2b-4c3d-9e0f-111111111111",
      "title": "Departamento amoblado en Miraflores",
      "price": 150000.0,
      "moneda": "PEN",
      "mode": "VENTA",
      "address": "Av. Larco 456, Miraflores",
      "property_type": "DEPARTAMENTO",
      "is_active": true,
      "created_at": "2026-09-07T10:00:00Z",
      "area_total": 85.5,
      "dormitorios": 3,
      "banos": 2,
      "negociable": true,
      "destacado": false
    }
  ]
}
```

- `count`: total de registros que cumplen el filtro, sin paginar.
- `next` / `previous`: URL absoluta de la página adyacente, o `null` en los extremos.
- `results`: propiedades de la página solicitada. Puede venir vacío si la página
  queda fuera de rango; el contrato no obliga a error en ese caso.
- `moneda` (`PEN`/`USD`) y `mode` (`VENTA`/`ALQUILER`) son obligatorios en la
  lectura; `moneda` es opcional al crear y el servidor asume `PEN`.

### Errores — `application/problem+json` (RFC 7807)

| Código | Esquema | Cuándo |
|---|---|---|
| `400` | `ProblemBadRequest` | `page`/`limit` o filtros inválidos, o cuerpo de entrada con errores de validación |
| `404` | `ProblemNotFound` | El recurso con el `id` indicado no existe |
| `500` | `ProblemInternalServerError` | Fallo no controlado; incluye `request_id` para trazar |

```json
{
  "type": "https://housebroker.pe/errors/invalid-query-parameter",
  "title": "Parámetro de consulta inválido",
  "status": 400,
  "detail": "El parámetro 'page' debe ser un entero mayor o igual a 1.",
  "instance": "/api/v1/properties?page=0",
  "code": "invalid_query_parameter",
  "errors": [{ "parameter": "page", "message": "El valor '0' es menor que el mínimo permitido (1)." }]
}
```

`Problem` define los member names estándar de RFC 7807 (`type`, `title`, `status`,
`detail`, `instance`); `code`, `errors` y `request_id` son extensiones propias de
la API. Los tres esquemas de error heredan de `Problem` con `allOf`.

## Estado y horarios de visita (HU-PROP-04)

`TASK-ARC-PROP-04` especifica la parte del catálogo que solo escriben Agentes y
Administradores. Todos los endpoints de esta sección exigen
`Authorization: Bearer <jwt>` (`securitySchemes.bearerAuth`).

| Método | Ruta | Operación |
|---|---|---|
| PATCH | `/api/v1/properties/{id}/status` | `updatePropertyStatus` |
| GET | `/api/v1/properties/{id}/schedules` | `getPropertySchedules` |
| PUT | `/api/v1/properties/{id}/schedules` | `replacePropertySchedules` |

### Estado operativo — `PATCH .../status`

Enum `PropertyStatus`, distinto de `is_active`: `is_active` decide la visibilidad
en el catálogo, `status` describe la etapa comercial.

| Estado | En catálogo | Agendable |
|---|---|---|
| `DISPONIBLE` | Sí | Sí |
| `RESERVADO` | Sí | No |
| `ALQUILADO` | Sí | No |
| `VENDIDO` | Sí | No |
| `SUSPENDIDO` | No (`is_active = false`) | No |

El cuerpo acepta `status` (obligatorio) y `reason`. `reason` es obligatorio para
cualquier transición que no sea volver a `DISPONIBLE`, porque son decisiones
comerciales auditables.

`VENDIDO` y `ALQUILADO` son terminales: revertirlos produce `400` con
`invalid_property_transition`. La respuesta devuelve `previous_status` para que
el frontend pueda deshacer su actualización optimista tras un fallo de red.

La transición a `SUSPENDIDO` es equivalente a `DELETE /api/v1/properties/{id}` en
cuanto a visibilidad, pero deja registro de que fue una suspensión y por qué.

### Horarios — `GET` y `PUT .../schedules`

Cada franja es un intervalo semiabierto `[start_time, end_time)` en `HH:MM` de 24
horas, repetido semanalmente sin fecha concreta. El extremo derecho exclusivo hace
que `09:00-12:00` y `12:00-15:00` sean contiguas, no solapadas.

El `PUT` es de reemplazo completo: el cuerpo es la nueva configuración semanal
entera. Las franjas ausentes se desactivan con `is_active = false` en vez de
borrarse, para que las citas ya agendadas conserven su referencia. `days: []`
deja el inmueble sin franjas, lo que bloquea el agendamiento sin desactivar la
propiedad; es preferible a `DELETE`.

El `GET` devuelve siempre los siete días, con `slots: []` en los que no tienen
atención, para que el frontend no confunda un día vacío con un día no cargado.

#### Reglas de validación

| Regla | Código de error |
|---|---|
| `start_time` anterior a `end_time` | `invalid_time_range` |
| Formato `HH:MM` (`^([01]\d|2[0-3]):[0-5]\d$`) | `invalid_time_range` |
| Duración entre 30 minutos y 8 horas | `invalid_time_range` |
| Sin solapamiento entre franjas del mismo día | `schedule_overlap` |
| Cada `weekday` como máximo una vez | `invalid_time_range` |
| Máximo 6 franjas por día y 28 por semana | `invalid_time_range` |
| Sin desactivar franjas con visitas confirmadas | `schedule_has_bookings` (`409`) |

Los horarios se interpretan en `America/Lima`, que es el `timezone` de la
respuesta. El frontend no debe aplicar conversión sobre los valores `HH:MM`.

### Permisos

| Código | Esquema | Cuándo |
|---|---|---|
| `401` | `ProblemUnauthorized` | Token ausente, vencido o con firma inválida |
| `403` | `ProblemForbidden` | Token válido sin permiso: un `CLIENTE`, o un `AGENTE` no asignado al inmueble |
| `409` | `ProblemConflict` | El cambio colisiona con visitas ya confirmadas; no se aplica parcialmente |

`403` incluye `required_roles` con los roles que sí habrían tenido permiso, para
que el frontend muestre un mensaje accionable en lugar de un error genérico. El
backend no debe revelar la existencia de un inmueble ajeno al Agente que lo
consulta: la ausencia de permiso se responde con `403` solo cuando el recurso es
visible para el usuario.

## Citas y gestión de estados (HU-CRM-02)

`TASK-ARC-CRM-02` especifica la agenda de citas y la gestión de sus estados.
Ambos endpoints exigen `Authorization: Bearer <jwt>`; a diferencia del catálogo,
**ninguna lectura de citas es pública**, porque el alcance de los datos depende
de quién pregunta.

| Método | Ruta | Operación |
|---|---|---|
| GET | `/api/v1/appointments` | `listAppointments` |
| PATCH | `/api/v1/appointments/{id}/status` | `updateAppointmentStatus` |

El alta de citas (`POST /api/v1/appointments`) y la integración con los
calendarios pertenecen a `TASK-ARC-CRM-01`, de la que esta tarea depende.

### Filtros de la agenda

| Parámetro | Tipo | Campo | Semántica |
|---|---|---|---|
| `status` | array de `AppointmentStatus` | `status` | OR entre valores repetidos |
| `role` | `UserRole` | perspectiva del usuario | — |
| `dateFrom` | date | `scheduled_at` | extremo **inclusivo** |
| `dateTo` | date | `scheduled_at` | extremo **inclusivo** |
| `page` / `limit` | int32 | — | reutiliza `Page` y `Limit` del catálogo |

- **AND entre filtros distintos**, igual que en el catálogo. `count` y
  `X-Total-Count` se calculan sobre el conjunto ya filtrado.
- **OR dentro de un filtro multivaluado**: `?status=PENDING&status=CONFIRMED`,
  repitiendo el parámetro (`explode: true`), no con comas.
- **`role` reutiliza el enum `UserRole`**, de modo que el contrato no duplica la
  lista de roles ni se desincroniza con `CLIENTE`/`AGENTE`/`ADMINISTRADOR`.
- **`dateFrom`/`dateTo` acotan la fecha de la visita** (`scheduled_at`), no la
  de creación del registro, y se interpretan en `America/Lima`. Al faltar uno
  de los dos, el rango queda abierto hacia el pasado o hacia el futuro.
- **Orden por defecto `scheduled_at` ascendente**: la agenda empieza por lo
  próximo, que es el orden en que el agente trabaja.

### La agenda según el rol

El conjunto visible depende del rol del token, y `role` solo explicita una
perspectiva de las que ese rol ya tiene:

| `role` | Citas devueltas |
|---|---|
| `CLIENTE` | Citas en las que el usuario actúa como cliente |
| `AGENTE` | Citas asignadas al usuario |
| `ADMINISTRADOR` | Todas las citas de la plataforma |

Omitir `role` aplica el rol del usuario autenticado. Pedir `role=ADMINISTRADOR`
con un token de `CLIENTE` o `AGENTE` produce `403`, no un `200` vacío: un
resultado vacío sería indistinguible de "no tienes citas".

```bash
# Agenda del agente: lo pendiente y lo confirmado de la próxima quincena
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/appointments?status=PENDING&status=CONFIRMED&dateFrom=2026-10-01&dateTo=2026-10-15"
```

### Estados de cita

Enum `AppointmentStatus`, con los mismos seis estados que usa el diseño UX/UI
del calendario (ver `docs/04_UX_UI_CRM.md`):

| Estado | Significado | Terminal |
|---|---|---|
| `PENDING` | Solicitud del cliente pendiente de confirmación | No |
| `CONFIRMED` | Visita aceptada por el agente | No |
| `RESCHEDULED` | Movida a un nuevo horario, pendiente de reconfirmar | No |
| `COMPLETED` | Visita realizada | Sí |
| `CANCELLED` | Visita cancelada | Sí |
| `NO_SHOW` | El cliente no asistió | Sí |

| Estado actual | Transiciones permitidas |
|---|---|
| `PENDING` | `CONFIRMED`, `RESCHEDULED`, `CANCELLED` |
| `CONFIRMED` | `RESCHEDULED`, `COMPLETED`, `NO_SHOW`, `CANCELLED` |
| `RESCHEDULED` | `CONFIRMED`, `CANCELLED` |
| `COMPLETED` / `CANCELLED` / `NO_SHOW` | — |

Una transición no listada produce `400` con
`invalid_appointment_transition`. Que una cita realizada no pueda cancelarse es
justo lo que `TASK-TEST-CRM-02` verifica en el backend.

`PENDING` se excluye del conjunto de destinos de `AppointmentStatusInput`: una
cita nace en `PENDING` al solicitarse y ninguna transición válida la devuelve a
ese valor.

### Reprogramación

La reprogramación es una transición a `RESCHEDULED` que exige `scheduled_at`
con el nuevo horario. El campo es **obligatorio** en esa transición y
**prohibido** en las demás, para que "reprogramar" y "mover el horario sin
cambiar el estado" no se confundan en el contrato.

El nuevo horario debe caer en una franja habilitada de `ScheduleSlot`
(`GET /api/v1/properties/{id}/schedules`), ser posterior al momento actual y no
solaparse con otra cita del mismo agente. Reprogramar conserva `client`,
`agent` y `property`: la cita no cambia de participantes, solo de horario.

| Regla | Código de error | Respuesta |
|---|---|---|
| Transición no permitida desde el estado actual | `invalid_appointment_transition` | `400` |
| `RESCHEDULED` sin `scheduled_at`, o con él en otra transición | `invalid_query_parameter` | `400` |
| `CANCELLED` o `RESCHEDULED` sin `reason` | `invalid_query_parameter` | `400` |
| Nuevo horario solapado con otra cita del agente | `appointment_slot_conflict` | `409` |

`TASK-WPO-CRM-02` aplica actualización optimista al confirmar o cancelar; por
eso la respuesta devuelve `previous_status` y `previous_scheduled_at`, con el
mismo patrón que `PropertyStatusResult`. La operación es **idempotente** respecto
al estado de destino: repetirla con el mismo `status` devuelve `200` sin efectos
adicionales, no `409`.

### Permisos

| Código | Esquema | Cuándo |
|---|---|---|
| `401` | `ProblemUnauthorized` | Token ausente, vencido o con firma inválida |
| `403` | `ProblemForbidden` | Un `CLIENTE` intenta cambiar el estado, o un `AGENTE` no asignado a la cita |
| `403` | `ProblemForbidden` | `role=ADMINISTRADOR` pedido por un token de `CLIENTE` o `AGENTE` |
| `404` | `ProblemNotFound` | La cita no existe |

`403` incluye `required_roles` para que el frontend muestre un mensaje
accionable. El backend no debe revelar la existencia de una cita ajena al
agente que la consulta: la ausencia de permiso se responde con `403` solo
cuando el recurso es visible para el usuario.

## Autenticación, tokens y roles (HU-SEC-01)

`TASK-ARC-SEC-01` especifica el registro, el inicio de sesión y el refresco del
access token, y define los dos esquemas de seguridad del contrato.

| Método | Ruta | Operación | Acceso |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `registerUser` | Público |
| POST | `/api/v1/auth/login` | `loginUser` | Público |
| POST | `/api/v1/auth/refresh` | `refreshAccessToken` | `refreshCookie` |

### Dónde vive cada token

| Token | Transporte | Persistencia en el cliente |
|---|---|---|
| `access` | cuerpo de la respuesta → cabecera `Authorization: Bearer` | **Solo en memoria** |
| `refresh` | cookie `HttpOnly` `hb_refresh_token` | Gestionada por el navegador |

Es un modelo **híbrido**, el patrón habitual de OAuth 2.0, y resuelve una
contradicción que ya existía en el repositorio:

- `docs/02_Arquitectura.md:47,659` pide *"JWT en cookies HttpOnly"* y avisa de
  aplicar *"protección CSRF cuando se utilicen cookies"*.
- El criterio del Sprint 3 (`planning.md:82`) exige *"JWT gestionado sin
  exposición en localStorage"*.
- Pero `docs/api/README.md` documentaba que el cliente leía el token desde
  `localStorage.hb_token`, que es justo lo que los dos anteriores prohíben.

Con este modelo, el `access` sigue yendo en la cabecera `Bearer` —así que
`bearerAuth` y las 10 operaciones ya especificadas **no cambian**— y lo único
que se persiste es el refresh, dentro de una cookie que JavaScript no puede leer.

`TokenPair` **no** incluye el refresh token en el cuerpo: si se entregara ahí,
cualquier XSS podría leerlo y robar la sesión completa, que es justo lo que la
cookie evita.

#### Política de la cookie

| Atributo | Valor | Motivo |
|---|---|---|
| `HttpOnly` | presente | `document.cookie` no puede leerla |
| `Secure` | presente | Solo viaja por HTTPS |
| `SameSite` | `Strict` | Corta el envío en navegaciones externas |
| `Path` | `/api/v1/auth` | Limita el envío a los endpoints que lo necesitan |
| `Max-Age` | `REFRESH_LIFETIME` | La sesión expira sola |

**Sobre CSRF:** al ser `HttpOnly` y `SameSite=Strict`, la cookie no habilita CSRF
en el resto de la API: los endpoints que solo aceptan `Authorization: Bearer`
siguen siendo inmunes porque el navegador no adjunta cabeceras personalizadas
en un envío automático. Aun así, **`POST /api/v1/auth/login` sí debe validar un
token CSRF de doble envío**, porque es el único punto donde se establece la
sesión y el atacante solo necesita que la víctima.visitase su sitio.

### Registro: por qué `role` solo admite `CLIENTE`

El enunciado pide que el cuerpo del registro incluya `email`, `password` y
`role`. El campo está ahí, pero su enumerado tiene **un único valor**:

```yaml
role:
  enum: [CLIENTE]
  default: CLIENTE
```

Un registro público que aceptara `ADMINISTRADOR` dejaría que cualquiera se
autopromoviera a administrador con un `curl`. Las cuentas de `AGENTE` y
`ADMINISTRADOR` las crea un administrador desde el panel. Enviar esos roles
produce `400` con `role_not_assignable`, que es un rechazo explícito y no un
campo ignorado en silencio.

El registro **no** devuelve tokens (`201` con el usuario creado): el cliente
debe llamar a `login` a continuación, para no duplicar la lógica de sesión en
dos endpoints.

### Matriz de errores

| Situación | `code` | Respuesta |
|---|---|---|
| `email` con formato inválido | `invalid_query_parameter` | `400` |
| Contraseña por debajo del mínimo | `weak_password` | `400` |
| `role` distinto de `CLIENTE` | `role_not_assignable` | `400` |
| Correo ya registrado | `email_already_registered` | `409` |
| Credenciales incorrectas | `invalid_credentials` | `401` |
| Cuenta desactivada | `account_disabled` | `403` |
| Refresh expirado, revocado o ausente | `invalid_refresh_token` | `401` |
| Refresh ya rotado (reuso) | `refresh_token_reused` | `401` |

Tres detalles que importan para el frontend:

- **Correo inexistente y contraseña incorrecta son indistinguibles.** Ambos
  devuelven `401` con `invalid_credentials` y el mismo `detail`; separarlos
  confirmaría qué correos están registrados.
- **Cuenta desactivada es `403`, no `401`.** Un `401` haría que el cliente
  creyera que su contraseña falla y la volviera a enviar.
- **`email_already_registered` es `409`, no `400`.** El correo tiene formato
  válido; lo que falla es que el recurso ya existe. Un `400` haría que el
  formulario marcara el campo sin explicar el motivo.

### Rotación del refresh token

Cada refresco emite un access **y un refresh nuevos**, e invalida el anterior.

| Situación | Resultado |
|---|---|
| Refresco con el token vigente | `200`, access nuevo y refresh rotado |
| Refresco con un token ya rotado | `401` `refresh_token_reused` |
| Refresco con token expirado o revocado | `401` `invalid_refresh_token` |

Detectar la reutilización es lo que hace útil la rotación: si un token robado se
usa desde otro equipo, el uso legítimo posterior falla y queda registrado, en
lugar de que ambos sigan funcionando en paralelo. Tras detectar un reuso se
invalida **toda la familia** de tokens del usuario.

El `401` del refresco devuelve `Set-Cookie` con `Max-Age=0`, para borrar la
cookie en el navegador y no dejar una sesión zombi.

```bash
# login: el refresh llega en la cookie, no en el cuerpo
curl -i -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria.quispe@correo.com","password":"ClaveSegura2026"}' -c cookies.txt
# -> {"access":"eyJ0...","token_type":"Bearer","expires_in":1800,"user":{...}}
# -> Set-Cookie: hb_refresh_token=...; HttpOnly; Secure; SameSite=Strict

# refresh: el navegador adjunta la cookie
curl -X POST http://localhost:8000/api/v1/auth/refresh -b cookies.txt
```

### Claims del access token

El backend toma el rol del token para autorizar, sin consultar la base de datos
en cada petición:

| Claim | Contenido | Uso |
|---|---|---|
| `sub` | UUID del usuario | Identidad del titular |
| `email` | Correo normalizado a minúsculas | Trazabilidad |
| `role` | `CLIENTE`, `AGENTE`, `ADMINISTRADOR` | **Autorización (RBAC)** |
| `token_type` | `access` | Rechazar un refresh enviado por error |
| `jti` | Identificador único del token | Revocación individual |
| `iat` / `exp` | Emisión y expiración (Unix epoch) | Validación de vigencia |

La contrapartida: **un cambio de rol no surte efecto hasta que el access
expira**, salvo que se revoque por `jti`. `TASK-BACK-SEC-01` debe tener esto en
cuenta al implementar el middleware de permisos.

## Recuperación de contraseña (HU-SEC-02)

`TASK-ARC-SEC-02` cierra el flujo de credenciales con los dos endpoints que
consumen el token que llega por correo.

| Método | Ruta | Operación | Acceso | Respuesta |
|---|---|---|---|---|
| POST | `/api/v1/auth/password-reset/` | `requestPasswordReset` | Público | `202` genérico |
| POST | `/api/v1/auth/password-reset-confirm/` | `confirmPasswordReset` | Público | `204` sin cuerpo |

### El flujo completo

```
1. Usuario: "¿Olvidé mi contraseña?"     -> POST /password-reset/           -> 202
2. Correo: enlace /recuperar-clave?uid=..&token=..
3. Usuario: escribe su nueva clave      -> POST /password-reset-confirm/  -> 204
4. Frontend: redirige a /login          -> POST /login                     -> 200
```

El paso 4 es obligatorio: **el reset no inicia sesión**. Devolver `204` y no un
par de tokens mantiene un único camino para obtener un access token, en lugar de
dos que el frontend tendría que mantener sincronizadas.

### La respuesta es `202` siempre, exista o no la cuenta

| Correo | Respuesta |
|---|---|
| Registrado y activo | `202` con `detail` y `email_sent: true` |
| No registrado | `202` con `detail` y `email_sent: true` |
| Registrado pero desactivado | `202` con `detail` y `email_sent: true` |

El cuerpo es **idéntico en los tres casos**. Un `404` o un `email_sent: false`
le dirían al atacante qué correos están dados de alta, información que después
alimenta la fuerza bruta. Es el mismo criterio que ya aplica a `login` con
`invalid_credentials`.

Por eso `email_sent` es una constante con `enum: [true]`: existe para dejar
explícito en el contrato que **el valor no confirma nada**. Si alguna vez
devolviera `false`, sería una fuga de enumeración y tendría que venir con un
cambio de versión del contrato.

`202 Accepted` y no `200` porque el correo se envía en segundo plano: la
petición queda encolada y el usuario no espera al servidor SMTP.

### Límite de solicitudes: `429` con `Retry-After`

Es el endpoint más expuesto a abuso, porque cada petición aceptada dispara un
correo. Se aplican dos límites y ambos devuelven el mismo `too_many_requests`:

| Límite | Frena |
|---|---|
| Por IP | Un atacante que recorre una lista de correos desde una sola máquina |
| Por correo | El spam dirigido a una víctima concreta, que el límite por IP no frena |

El `429` **no dice cuál de los dos se agotó**, porque un código específico por
correo confirmaría que esa cuenta existe. `Retry-After` va en cabecera y
repetido en el cuerpo como `retry_after`, para clientes que no leen cabeceras.

La implementación corresponde a `TASK-WPO-SEC-02`, tal como fija
`planning.md:50`.

### El cuerpo de la confirmación

| Campo | Obligatorio | Valida |
|---|---|---|
| `uid` | sí | UUID del titular |
| `token` | sí | 20–200 caracteres, firmado, de un solo uso |
| `new_password` | sí | Política de clave, igual que en el registro |
| `re_new_password` | sí | Debe coincidir con `new_password` |

`uid` y `token` viajan en la URL del enlace de correo y el frontend los reenvía
en el cuerpo del `POST`. Es lo que espera el endpoint de Django, y aunque un
token único que ya incluyera el `uid` sería más limpio, obligaría a apartarse
de `PasswordResetTokenGenerator`, que es lo que fija `TASK-BACK-SEC-02`.

`re_new_password` es el campo que verifica `TASK-TEST-SEC-02` con su caso de
*coincidencia de claves* (`planning.md:48`). El backend compara, no el
navegador, que el cliente puede saltarse.

### Cambiar la clave cierra todas las sesiones

Al guardar la nueva clave el backend **revoca todas las familias de refresh
token** e invalida los tokens de recuperación pendientes. Sin eso el arreglo no
serviría de nada: quien entró con la clave robada seguiría entrando con la
nueva. El `204` devuelve `Set-Cookie` con `Max-Age=0` para borrar la cookie
`hb_refresh_token` del navegador.

Un token de recuperación, uno solo.

| Token recibido | Respuesta |
|---|---|
| Válido y vigente | `204`, nueva clave guardada |
| Ya usado antes | `401` `invalid_reset_token` |
| Caducado | `401` `invalid_reset_token` |
| Firmado con otra clave | `401` `invalid_reset_token` |

Los tres `401` comparten el mismo `detail`: distinguirlos ayudaría a medir la
antigüedad del enlace.

### Matriz de errores

| Situación | `code` | Respuesta |
|---|---|---|
| `email` con formato inválido | `invalid_query_parameter` | `400` |
| `uid` que no es un UUID | `invalid_query_parameter` | `400` |
| Nueva clave débil, o igual a la anterior | `weak_password` | `400` |
| Las dos claves no coinciden | `password_mismatch` | `400` |
| Token inválido, usado o caducado | `invalid_reset_token` | `401` |
| Se agotó el límite por IP o por correo | `too_many_requests` | `429` |

Dos distinciones que conviene no perder de vista:

- **`uid` inválido es `400`, no `401`.** El cuerpo está mal y el token no llegó a
  evaluarse. `invalid_reset_token` es para cuando el token sí se procesó y no
  sirvió.
- **Reutilizar la clave anterior devuelve `weak_password`**, no un código
  aparte. Un código específico confirmaría al atacante que la clave que conoce
  era la buena.

El token de recuperación no debe registrarse en los logs de acceso: mientras
esté vigente es tan equivalente a la contraseña como la propia clave.

```bash
# 1. solicitar el correo
curl -X POST http://localhost:8000/api/v1/auth/password-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email":"maria.quispe@correo.com"}'
# -> 202 {"detail":"Si el correo corresponde a una cuenta activa, ...","email_sent":true}

# 2. confirmar con lo que venía en el enlace
curl -i -X POST http://localhost:8000/api/v1/auth/password-reset-confirm/ \
  -H "Content-Type: application/json" \
  -d '{"uid":"c3d4e5f6-...","token":"nQv7-Tb4m-...","new_password":"ClaveNueva2026","re_new_password":"ClaveNueva2026"}'
# -> 204, sin cuerpo, con Set-Cookie hb_refresh_token=; Max-Age=0
```

## Propiedades favoritas (HU-PROP-05)

`TASK-ARC-PROP-05` especifica la lista de inmuebles guardados por el usuario y
las operaciones para agregar y quitar. Los tres endpoints usan el `bearerAuth`
global: **no hay favoritos sin sesión**.

| Método | Ruta | Operación | Acceso |
|---|---|---|---|
| GET | `/api/v1/favorites/` | `listFavorites` | Autenticado |
| POST | `/api/v1/favorites/` | `addFavorite` | Autenticado |
| DELETE | `/api/v1/favorites/{property_id}/` | `removeFavorite` | Autenticado |

A diferencia de los endpoints de autenticación, estos **no** declaran
`security: []`: heredan el `bearerAuth` global, así que un `401` es lo primero
que devuelve cualquiera de los tres sin token válido.

### La lista es privada y no admite parámetro de usuario

El backend filtra por el `sub` del access token. El contrato no expone ningún
`?user_id=` ni `?user=`, y **no debe añadirse**: bastaría cambiar ese parámetro
para leer los favoritos de otra persona.

El orden es `added_at` descendente, lo que espera la vista "Mis Favoritos": lo
guardado después aparece primero. Es un orden estable porque cada favorito tiene
su propia fecha, a diferencia del `created_at` del inmueble, que puede empatar
entre varios anuncios.

Cada elemento es un `Favorite`, que envuelve el `Property` y le añade `added_at`:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "property": { "id": "b2c1f5a0-...", "title": "Departamento amoblado en Miraflores" },
      "added_at": "2026-10-05T09:12:44Z"
    }
  ]
}
```

No se aplana el inmueble dentro de `Property` a propósito: los metadatos de la
relación (`added_at`) no son del inmueble, y mezclarlos haría que el mismo
anuncio apareciera con campos distintos según desde dónde se leyera.

### Agregar y quitar son idempotentes

Esta es la decisión que más afecta al frontend, y viene de
`TASK-WPO-PROP-05`, que implementa el botón con debounce.

| Operación | Situación | Respuesta |
|---|---|---|
| POST | No estaba en favoritos | `200` con el favorito y su `added_at` |
| POST | Ya estaba en favoritos | `200` con **el mismo** `added_at` |
| DELETE | Estaba en favoritos | `204` sin cuerpo |
| DELETE | No estaba en favoritos | `204` sin cuerpo |

No hay `201` ni `409`, y el `DELETE` nunca devuelve `404` por "no era favorito".
La razón es que un doble clic en el corazón o un reintento por red llega al
servidor dos veces: si la segunda devolviera un error, el frontend tendría que
distinguir entre "ya estaba" y "falló de verdad", y en el caso del `DELETE`
tendría que traducir ese `404` a "listo" para no enseñarle un error al usuario
que ya completó la operación.

El `POST` devuelve además el `added_at` original, no la fecha de la petición
repetida, para que un reintento no reordene la lista.

### El `404` es del inmueble, no de la relación

| Situación | Respuesta |
|---|---|
| `property_id` no corresponde a ningún inmueble | `404 resource_not_found` |
| El inmueble existe pero está desactivado (`is_active: false`) | `404 resource_not_found` |
| Ya era favorito | `200` |
| No era favorito | `204` |

Guardar un inmueble desactivado no tiene sentido: la eliminación del catálogo es
lógica (`is_active: false`), así que el inmueble sigue existiendo en la base de
datos pero no se puede guardar.

### `Property.is_favorite`: el corazón del catálogo

La v1.8.0 **añade `is_favorite` a `Property`**, y es el único cambio que esta
versión hace fuera del módulo de favoritos.

```yaml
is_favorite:
  type: boolean
```

Es lo que `TASK-A11Y-PROP-05` necesita: el botón de corazón de `PropertyCard`
tiene que alternar `aria-pressed="true|false"`, y para saber en qué estado
pintarse sin una llamada por inmueble.

El campo depende del access token, así que **el mismo catálogo devuelve valores
distintos según quién pregunte**. Es coherente con el resto del contrato porque
todas las lecturas ya exigen `bearerAuth` por el `security` global. Si algún día
el catálogo se publica sin token, el backend tendrá que omitir el campo o
mandarlo `false` en lugar de romper el esquema.

### Matriz de errores

| Situación | `code` | Respuesta |
|---|---|---|
| Token ausente, vencido o con firma inválida | `unauthorized` | `401` |
| `property_id` con formato inválido (solo en POST) | `invalid_query_parameter` | `400` |
| El inmueble no existe o está desactivado | `resource_not_found` | `404` |

El `DELETE` no declara `400`: su `property_id` va en la ruta, y un UUID mal
formado en un path no se distingue del que no existe, así que responde `404`
como cualquier otro identificador desconocido.

```bash
# listar
curl -H "Authorization: Bearer $ACCESS" \
  "http://localhost:8000/api/v1/favorites/?limit=12&page=1"

# guardar (idempotente: repetirlo devuelve 200 con el mismo added_at)
curl -X POST http://localhost:8000/api/v1/favorites/ \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"property_id":"b2c1f5a0-1a2b-4c3d-9e0f-111111111111"}'

# quitar (idempotente: repetirlo devuelve 204)
curl -X DELETE http://localhost:8000/api/v1/favorites/b2c1f5a0-1a2b-4c3d-9e0f-111111111111/ \
  -H "Authorization: Bearer $ACCESS"
```

### Desviación conocida de Spectral

`password-reset`, `password-reset-confirm`, `favorites` y
`favorites/{property_id}` llevan **barra final**, y solo ellos. Spectral lo marca
con `path-keys-no-trailing-slash` y el contrato queda con 4 warnings, a
diferencia de las versiones anteriores, que estaban en 0.

Es deliberado: el enunciado de cada tarea especifica las rutas con barra, y es la
convención de Django REST Framework, que es donde se implementarán. Quitar la
barra dejaría el contrato en 0 warnings, pero obligaría a registrar en Django
unas rutas que DRF no genera por defecto.

## Disponibilidad y reserva de visitas (HU-CRM-01)

`TASK-ARC-CRM-01` especifica los dos endpoints del flujo de agendar una visita:
consultar los horarios libres de un inmueble y registrar la reserva.

| Método | Ruta | Operación |
|---|---|---|
| GET | `/api/v1/properties/{id}/available-slots` | `getPropertyAvailableSlots` |
| POST | `/api/v1/appointments` | `createAppointment` |

A diferencia del resto de la sección de CRM, `available-slots` es **público**
(`security: []`): devuelve información del inmueble, no datos de citas, y
permite pintar el calendario en la ficha de la propiedad sin exigir sesión
previa. Crear la cita sí la exige.

> **Nota sobre la barra final.** El enunciado escribe
> `POST /api/v1/appointments/`, con barra. El contrato usa
> `/api/v1/appointments` sin barra, igual que el resto de rutas del spec: en
> OpenAPI `/api/v1/appointments` y `/api/v1/appointments/` son **recursos
> distintos**, y registrar ambos crearía una operación duplicada. El backend
> debe usar `APPEND_SLASH` y responder `301` si recibe la variante con barra.

### Cómo se calcula la disponibilidad

`GET /api/v1/properties/{id}/available-slots?date=2026-10-08` **no lee una tabla
de horarios por fecha**: deriva el resultado de la agenda semanal del Sprint 3.

1. Se toma el `WeekdaySchedule` del día de la semana y se materializan sus
   franjas `is_active = true` sobre esa fecha concreta.
2. Se descarta cada franja que ya tiene una cita en `PENDING`, `CONFIRMED` o
   `RESCHEDULED`, comparando el intervalo `[start_at, end_at)` completo y no
   solo el instante de inicio.
3. Se devuelve el resultado en orden ascendente de `start_at`.

Por eso los horarios devueltos son **instancias en UTC**, mientras que
`ScheduleSlot` sigue siendo una franja `HH:MM` recurrente: una disponibilidad
solo tiene sentido en un día determinado.

| Aspecto | `ScheduleSlot` (Sprint 3) | `AvailableSlot` (esta tarea) |
|---|---|---|
| Forma | Franja semanal recurrente | Instante de una fecha concreta |
| Horas | `HH:MM` | `date-time` en UTC |
| Almacenamiento | Persistido | **Calculado** en cada petición |

La respuesta es un recurso calculado: **no reserva nada**. El bloqueo real ocurre
en el `POST`.

#### Reglas de la consulta

| Regla | Resultado |
|---|---|
| `date` ausente o con formato distinto de `YYYY-MM-DD` | `400` `invalid_query_parameter` |
| `date` anterior a hoy | `400` `invalid_query_parameter` |
| `date` más de 60 días vista adelante | `400` `invalid_query_parameter` |
| Día sin franjas, todas inactivas o agotadas | `200` con `slots: []` |
| Hoy con horas ya vencidas | `200` con `slots: []` (es cálculo, no error) |

`date` es obligatorio y se interpreta como **día local de Lima**: `2026-10-08`
son las visitas del jueves 8 en horario peruano, aunque los `start_at` se
devuelvan en UTC.

El horizonte de 60 días acota el costo de materializar la agenda e impide que el
cliente ofrezca fechas cuyos horarios la agencia aún no publicó.

### La reserva

El cuerpo es `AppointmentCreateInput`: `property_id` y `scheduled_at`
obligatorios, más `client_id` opcional.

| Regla | Código | Respuesta |
|---|---|---|
| `scheduled_at` no coincide con ninguna franja habilitada | `invalid_query_parameter` | `400` |
| La propiedad existe pero no admite visitas (`PropertyStatus` distinto de `DISPONIBLE`) | `property_not_bookable` | `400` |
| El horario ya está ocupado | `appointment_slot_conflict` | `409` |
| Un `CLIENTE` envía `client_id` | `forbidden` | `403` |
| Token ausente, vencido o con firma inválida | `unauthorized` | `401` |
| La propiedad o el `client_id` no existen | `resource_not_found` | `404` |

- **La cita nace siempre en `PENDING`.** Reservar no es confirmar: la
  confirmación es una acción posterior del agente, en
  `PATCH /api/v1/appointments/{id}/status`.
- **`scheduled_at` debe coincidir exactamente** con un `start_at` devuelto por
  `available-slots`. El servidor no ajusta ni redondea la hora, y una franja que
  no atiende la visita no se agenda.
- **La comprobación va dentro de la misma transacción que inserta la cita**, de
  modo que dos reservas simultáneas por el mismo horario no puedan aceptarse
  ambas. Si el horario se tomó entre la consulta y el `POST`, el resultado es
  `409` y **no se crea ninguna cita**: la reserva es atómica, no parcial.
- **Un `CLIENTE` agenda para sí mismo**: su identificador se toma del token y no
  se acepta en el cuerpo, para que nadie pueda registrar una cita en nombre de
  otro. `AGENTE` y `ADMINISTRADOR` sí pueden enviar `client_id` para agendar en
  nombre de alguien que llega a oficina.
- El backend envía el correo de confirmación al cliente y la notificación al
  agente (RF-SEC-05). Ese envío es posterior al `201` y su fallo no revoca la
  cita.

```bash
# 1. Ver los horarios libres del jueves 8
curl "http://localhost:8000/api/v1/properties/b2c1f5a0-.../available-slots?date=2026-10-08"
# -> { "slots": [{ "start_at": "2026-10-08T14:00:00Z", ... }], "total_slots": 2 }

# 2. Reservar el segundo
curl -X POST http://localhost:8000/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"property_id":"b2c1f5a0-...","scheduled_at":"2026-10-08T16:00:00Z"}'
```

### `409` por horario ocupado, no `400`

El enunciado de la tarea pide `400` para el horario ocupado. El contrato usa
`409` con `appointment_slot_conflict`, por dos razones:

1. **Coherencia interna:** es la misma condición de negocio que la
   reprogramación de `TASK-ARC-CRM-02`, que ya devuelve `409` con ese mismo
   código. Con `400` en el alta y `409` en el parche, el frontend tendría dos
   tratamientos para un único error.
2. **RFC 9110:** un horario tomado no es una entrada malformada, es un conflicto
   con el estado actual del recurso, que es exactamente lo que describe `409`.

El `400` sigue cubriendo lo que sí es entrada inválida: formato de fecha,
horario fuera de franja, propiedad no agendable.

## Validación con Spectral

El ruleset `.spectral.yaml` (en esta carpeta) extiende `spectral:oas` y sube a
`error` las reglas de documentación obligatorias. Spectral no autodetecta un
ruleset fuera de la raíz del proyecto, así que hay que indicarlo explícitamente:

```bash
npx @stoplight/spectral-cli lint docs/api/openapi_spec.yaml \
  --ruleset docs/api/.spectral.yaml
```

Validación estructural complementaria:

```bash
npx @apidevtools/swagger-cli validate docs/api/openapi_spec.yaml
```

Estado actual (v1.8.0): `swagger-cli` reports *"is valid"* y Spectral
`* 4 problems (0 errors, 4 warnings, 0 infos, 0 hints)*`. Los cuatro warnings
son `path-keys-no-trailing-slash` de las rutas de recuperación y de favoritos, y
están justificados en
[Desviación conocida de Spectral](#desviación-conocida-de-spectral).

## Notas para la implementación

- El cliente React resuelve el prefijo como `VITE_API_URL` + `/v1/properties`
  (ver `frontend/src/services/axios.ts` y `frontend/src/services/properties.ts`).
- El contrato usa `nullable: true` de OpenAPI 3.0 para `next`/`previous`; en
  OpenAPI 3.1 el equivalente es `type: [string, "null"]`.
- `exclusiveMinimum` se evita a propósito: la forma booleana de OpenAPI 3.0 la
  rechazan los validadores basados en JSON Schema draft-07. `price` usa
  `minimum: 0.0001` para expresar "mayor que 0" de forma interoperable.
- La v1.0.0 devolvía un arreglo plano en `GET /api/v1/properties`. Desde la v1.1.0
  devuelve el envoltorio `PaginatedProperties`; es un cambio incompatible y el
  mock del frontend aún sirve la forma antigua (ver `TASK-MOCK-PROP-02`).
- La v1.2.0 solo **añade** query params opcionales: `GET /api/v1/properties` sin
  filtros se comporta igual que en v1.1.0.
- `search` es texto libre sobre `title` y `address`; el filtrado por número de
  dormitorios, cochera, mascotas y modalidad que menciona RF-PROP-03 no está en
  el contrato todavía. Si `TASK-BACK-PROP-03` los implementa, deben entrar como
  parámetros nuevos en este mismo spec.
- `minPrice`/`maxPrice` filtran por el número de `price` sin conversión de
  moneda: un rango en PEN no excluye automáticamente los resultados en USD. Es una
  limitación conocida del MVP, no un error del backend.
- `TASK-ARC-PROP-04` define `bearerAuth` (HTTP bearer, JWT) siguiendo lo que ya
  envía `frontend/src/services/axios.ts` con `localStorage.hb_token`. El contrato
  de `POST /api/v1/auth/login` es `TASK-ARC-SEC-01`, de la misma unidad de trabajo;
  cuando se documente, su `securitySchemes` debe ser el mismo `bearerAuth`.
- Los horarios son bloques semanales recurrentes, sin fecha concreta. Si el
  agendamiento de citas (`TASK-ARC-CRM-01`, Sprint 4) necesita reservar una
  instancia concreta de una franja, encaja contra el `id` de `ScheduleSlot` más
  la fecha elegida por el cliente.
- `PropertySchedulesInput` y `ScheduleSlot` comparten los campos `HH:MM` pero no
  el esquema: la entrada no lleva `id` ni `is_active` porque son asignados por el
  servidor. Mantener `additionalProperties: false` en los esquemas de entrada
  hace que un cliente que invente campos reciba `400` en vez de ignorarlos en
  silencio.
- La v1.3.0 no toca los endpoints existentes del catálogo: solo añade rutas bajo
  `{id}` y el esquema `securitySchemes`. Las operaciones de lectura del catálogo
  siguen siendo públicas hasta que `TASK-BACK-SEC-01` defina el nivel de acceso.
- La v1.4.0 **sí** toca `GET /api/v1/properties`, pero solo para deduplicar:
  `page`, `limit` y la cabecera `X-Request-Id` estaban declarados en línea y
  ahora se referencian desde `components/parameters` (`Page`, `Limit`,
  `XRequestIdParam`), igual que ya se hacía con los filtros. No cambia el
  comportamiento de la operación; evita que el catálogo y la agenda de citas
  definan la paginación por separado y diverjan.
- `AppointmentStatus` es un enum propio y **no** reutiliza `PropertyStatus`: la
  cita describe el ciclo de vida de una visita, mientras el estado de la
  propiedad describe la etapa comercial del inmueble. `COMPLETED` en una cita
  no implica `VENDIDO` ni `ALQUILADO` en la propiedad.
- `AppointmentPropertyRef` y `AppointmentPersonRef` son referencias ligeras, no
  replican `Property` ni el perfil completo. La ficha del inmueble se resuelve
  con `GET /api/v1/properties/{id}` y los datos completos del cliente con la
  ficha de CRM (HU-CRM-03). Incluir el inmueble entero inflaría el listado sin
  que el frontend lo use.
- `Appointment` es la representación de lectura que consume `TASK-FRONT-CRM-02`;
  el modelo se crea en `TASK-ARC-CRM-01` (v1.5.0), que añade `AppointmentCreateInput`
  y el `POST` sobre la misma ruta.
- La v1.5.0 no declara `POST /api/v1/appointments/` con barra final. En OpenAPI
  esa ruta es un recurso distinto al de `POST /api/v1/appointments` y
  documentar ambas crearía una operación duplicada que el backend no debe
  implementar por separado.
- **Falta protección contra doble envío en el `POST`.** Un `POST` repetido con
  el mismo cuerpo crea dos citas en `PENDING`, porque cada solicitud es una
  reserva nueva. `TASK-BACK-CRM-01` debería resolverlo con una restricción de
  unicidad en base de datos sobre `(agent, scheduled_at)` para estados no
  terminales, o con una cabecera `Idempotency-Key` que el contrato aún no define.
- `AvailableSlots.total_slots` es redundante con `slots.length` a propósito: el
  frontend lo usa para pintar un contador sin recorrer el arreglo, y la
  aserción detecta una respuesta truncada.
- `getPropertyAvailableSlots` declara `security: []` para apagar el `bearerAuth`
  global. Es la única operación del contrato que lo hace, y a propósito: expone
  horarios del inmueble, no citas. Si `TASK-BACK-SEC-01` decide que la ficha de
  la propiedad pasa a exigir sesión, hay que quitar ese `security: []`.
- La v1.6.0 **sí toca las convenciones de seguridad del contrato**: corrige la
  contradicción entre `docs/02_Arquitectura.md` (cookies `HttpOnly`) y el
  `localStorage.hb_token` que documentaba este README. El `bearerAuth` se
  mantiene para el access token, así que **ninguna operación previa cambia de
  forma**; lo que cambia es que el refresh deja de ser accesible a JavaScript.
- `docs/api/README.md` decía que el cliente leía el token de
  `localStorage.hb_token` (`frontend/src/services/axios.ts`). Con la v1.6.0 esa
  nota queda desactualizada a propósito: `TASK-FRONT-SEC-01` debe migrar el
  access token a un contexto de React **en memoria** y dejar de persistirlo.
  Mientras esa migración no ocurra, el frontend y el contrato discrepan.
- **No hay `logout` en el contrato.** La sesión termina cuando expira el refresh
  token, lo que deja sesiones vivas hasta `REFRESH_LIFETIME` después de que el
  usuario Cerró sesión. `TASK-ARC-SEC-02` (recuperación de contraseña) es el
  sitio natural para añadir `POST /api/v1/auth/logout` con revocación de la
  familia de tokens.
- La rotación de refresh exige una tabla de tokens revocados en el backend. Sin
  ella, `refresh_token_reused` no puede distinguir un reuso real de una carrera
  legítima de dos pestañas, y `TASK-BACK-SEC-01` necesita definir esa
  persistencia antes de implementar el endpoint.
- El `429` de `password-reset` está declarado en el contrato desde la v1.7.0,
  pero su implementación es de `TASK-WPO-SEC-02`: hasta que exista, el endpoint
  acepta solicitudes sin límite y es abusable como vector de spam.
- **La v1.7.0 no resuelve la contradicción de `uid`.** El contrato usa el UUID en
  texto plano, pero `PasswordResetTokenGenerator` de Django trabaja con `uidb64`
  (el pk en base64). `TASK-BACK-SEC-02` tiene que decidir si acepta ambos
  formatos o traduce uno a otro en el serializador; si elige `uidb64`, hay que
  corregir `PasswordResetConfirm.uid` y su `example`.
- El `uid` no lleva `writeOnly`, a diferencia de las contraseñas: es un
  identificador, no un secreto, y el frontend necesita mandarlo. Aun así, los
  tokens de recuperación **sí** deben quedar fuera de los logs de acceso.
- `POST /favorites/` devuelve `200` y no `201`. Es deliberado, para que un
  reintento del debounce de `TASK-WPO-PROP-05` no produzca un error; si
  `TASK-BACK-PROP-05` implementa `201`, el frontend tendrá que tratar el `409`
  como éxito.
- `Favorite` envuelve `Property` y añade `added_at`. `TASK-BACK-PROP-05` necesita
  el modelo `User <-> FavoriteProperty` **con** marca de tiempo propia; sin ella
  no hay orden de "guardados recientemente" ni se puede distinguir un reintento
  de una segunda marca real.
- Los favoritos de un inmueble que luego se desactiva (`is_active: false`) siguen
  en la lista y se devuelven con `is_active: false`. Si el negocio decide
  ocultarlos, es un filtro del backend y no un cambio de contrato.
- La v1.8.0 **sí toca un esquema compartido**: `Property` gana `is_favorite`,
  que depende del access token. Los clientes generados a partir del contrato
  tienen que regenerarse, porque `Property` aparece en el catálogo, en el
  detalle y en cada favorito.
- `duration_minutes` no lo elige el cliente: deriva del `ScheduleSlot` reservado
  y define la ventana `[scheduled_at, scheduled_at + duration_minutes)` con la
  que el backend detecta solapamientos entre citas del mismo agente. Si se
  omite, el servidor asume el `default: 45`.
- El contrato asume que `TASK-BACK-SEC-01` (Sprint 3) ya emite los tres roles
  `CLIENTE`, `AGENTE` y `ADMINISTRADOR` en el JWT. Si al implementar se
  cambia el nombre de algún rol, hay que actualizar `UserRole`, que es la única
  fuente de verdad de esa lista en todo el spec.
