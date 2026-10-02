# Documentación de API — HouseBroker Perú

Contratos REST del backend (Django REST Framework) bajo especificación **OpenAPI 3.0**.

> **Tarea actual:** [TASK-ARC-PROP-04] Especificación OpenAPI 3.0 para estado de
> propiedades y horarios de visita —
> [issue #83](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/83) (HU-PROP-04).

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

Al crecer el documento, extrae las secciones a `components/schemas` y referencia
con `$ref`. No dupliques esquemas entre operaciones.

`Property` en el spec replica campo por campo la interfaz `Property` de
`frontend/src/services/types.ts`, incluidos los opcionales (`area_total`,
`dormitorios`, `link_galeria`, `negociable`, etc.). Si cambias ese tipo, actualiza
el schema en el mismo commit.

## Endpoints documentados

| Método | Ruta | Operación | Sprint |
|---|---|---|---|
| GET | `/api/v1/properties` | `listProperties` — catálogo paginado | 2 |
| POST | `/api/v1/properties` | `createProperty` | 1 |
| GET | `/api/v1/properties/{id}` | `getProperty` | 1 |
| PUT | `/api/v1/properties/{id}` | `updateProperty` | 1 |
| DELETE | `/api/v1/properties/{id}` | `deleteProperty` — eliminación lógica | 1 |
| PATCH | `/api/v1/properties/{id}/status` | `updatePropertyStatus` — estado operativo | 3 |
| GET | `/api/v1/properties/{id}/schedules` | `getPropertySchedules` | 3 |
| PUT | `/api/v1/properties/{id}/schedules` | `replacePropertySchedules` | 3 |

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
