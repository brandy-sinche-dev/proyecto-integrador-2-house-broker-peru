# Documentación de API — HouseBroker Perú

Contratos REST del backend (Django REST Framework) bajo especificación **OpenAPI 3.0**.

> **Tarea actual:** [TASK-ARC-PROP-02] Especificación OpenAPI 3.0 para catálogo
> paginado — [issue #34](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/34) (HU-PROP-02).

## Archivo único de contrato

**`openapi_spec.yaml`** es el contrato acumulado de todo el proyecto. Cada sprint
añade aquí los endpoints que entrega, en lugar de crear un archivo por tarea, para
que al cierre (Sprint 7) exista un solo `.yml` con la API completa.

| Versión | Sprint | Tarea | Issue | Alcance incorporado |
|---|---|---|---|---|
| 1.0.0 | Sprint 1 | `TASK-ARC-PROP-01` | — | CRUD de propiedades (HU-PROP-01) |
| 1.1.0 | Sprint 2 | `TASK-ARC-PROP-02` | [#34](https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru/issues/34) | Catálogo paginado + errores RFC 7807 (HU-PROP-02) |
| 1.1.0 | Sprint 2 | — | — | Sincronizado con `Property` de `types.ts`: `moneda`, `mode` y atributos |

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

## Catálogo paginado (HU-PROP-02)

`GET /api/v1/properties`

| Parámetro | Tipo | Default | Restricciones |
|---|---|---|---|
| `page` | integer (int32) | `1` | `minimum: 1` |
| `limit` | integer (int32) | `12` | `minimum: 1`, `maximum: 100` |
| `X-Request-Id` (header) | uuid | — | Correlación para trazar la petición |

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
| `400` | `ProblemBadRequest` | `page`/`limit` inválidos, o cuerpo de entrada con errores de validación |
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
