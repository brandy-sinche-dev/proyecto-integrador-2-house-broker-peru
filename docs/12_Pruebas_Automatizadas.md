# Pruebas Automatizadas — HouseBroker Perú

**Documento:** Resumen consolidado de la estrategia y las pruebas automatizadas del catálogo
**Tareas:** `TASK-BACK-PROP-02` (backend) y `TASK-TEST-PROP-02` (frontend)
**Versión:** 1.0

---

## 1. Resumen ejecutivo

| Capa | Framework | Archivos | Pruebas | Resultado |
| ---- | --------- | -------- | ------- | --------- |
| Backend (API) | Django `TestCase` + DRF `APIClient` | 1 | 10 | ✅ 10/10 |
| Frontend (UI/Servicios) | Jest 30 + React Testing Library | 5 | 70 | ✅ 70/70 |
| **Total** | | **6** | **80** | ✅ **80/80** |

Cobertura de código del frontend (módulos del catálogo): **98.5%** sentencias, **95.05%**
ramas, **98.59%** funciones, **99.34%** líneas (umbral exigido: 80%).

---

## 2. Pruebas de Backend — `TASK-BACK-PROP-02`

**Archivo:** `backend/apps/properties/tests/test_catalog.py`
**Endpoint bajo prueba:** `GET /api/v1/properties` (listado paginado) y
`GET /api/v1/properties/{id}` (detalle).

### 2.1 Casos de prueba

| # | Prueba | Qué valida |
| - | ------ | ---------- |
| 1 | `test_default_page_size_is_twelve` | Tamaño de página por defecto = 12, `count` correcto y header `X-Total-Count`. |
| 2 | `test_limit_query_param_shapes_the_page` | `?limit=5&page=2` devuelve 5 elementos y `previous` no nulo. |
| 3 | `test_limit_is_capped_at_max_page_size` | `?limit=1000` se limita al máximo (100). |
| 4 | `test_page_zero_is_rejected` | `?page=0` responde **400**. |
| 5 | `test_limit_zero_is_rejected` | `?limit=0` responde **400**. |
| 6 | `test_inactive_properties_are_excluded` | Las propiedades inactivas no se listan. |
| 7 | `test_payload_carries_key_catalog_fields` | El ítem expone `price`, `moneda`, `mode`, `address`, `property_type`, `seller.email` e `images` (2, con URL de CDN). |
| 8 | `test_retrieve_property_by_id` | Detalle por id responde **200** con el `id` correcto. |
| 9 | `test_retrieve_inactive_property_returns_404` | El detalle de una propiedad inactiva responde **404**. |
| 10 | `test_query_count_does_not_grow_with_result_size` | El número de consultas SQL no crece con el tamaño de la página (evita N+1; ≤ 4 consultas). |

### 2.2 Ejecución

```bash
cd backend
# Con PostgreSQL (por defecto)
uv run python manage.py test apps.properties

# Sin PostgreSQL (SQLite en memoria, recomendado para CI/local)
DJANGO_DB_ENGINE=sqlite uv run python manage.py test apps.properties
```

> En Windows PowerShell: `$env:DJANGO_DB_ENGINE='sqlite'` antes del comando.
> La suite no requiere dependencias de terceros como `pytest`; usa el runner de Django.

---

## 3. Pruebas de Frontend — `TASK-TEST-PROP-02`

**Herramientas:** Jest 30, jest-environment-jsdom, React Testing Library,
`@testing-library/user-event`, `@testing-library/jest-dom` y `axios-mock-adapter`.

### 3.1 Suites

| Suite | Archivo | Pruebas | Tipo |
| ----- | ------- | ------- | ---- |
| Servicios HTTP | `src/services/properties.test.jsx` | 8 | Mocks HTTP |
| Tarjeta de propiedad | `src/components/properties/PropertyCard.test.jsx` | 19 | Unitaria |
| Paginación | `src/components/properties/Pagination.test.jsx` | 9 | Unitaria |
| Catálogo (integración) | `src/components/properties/PropertyList.test.jsx` | 25 | Integración |
| Formulario de publicación | `src/components/properties/PropertyForm.test.jsx` | 9 | Unitaria (previo) |

### 3.2 Qué se valida

* **Servicios (`services/properties`):** `getProperties` (respuesta paginada y arreglo plano),
  `getProperty`, `createProperty`, `updateProperty`, `deleteProperty`, y la normalización de
  errores del interceptor (`status` + `userMessage`). Las respuestas se simulan con
  `axios-mock-adapter` sobre la instancia real de Axios.
* **`PropertyCard`:** precio formateado, mantenimiento, título, dirección, características,
  modalidad/tipo, insignias (destacado/negociable) y acciones de guardar/agendar visita.
* **`Pagination` (`PaginationControl`):** resumen del rango, singular/plural, página activa
  (`aria-current`), botones anterior/siguiente y elipsis.
* **`PropertyList` (integración):** carga con esqueleto, paginación en cliente, orden,
  vistas (1/2/3 columnas y lista), búsqueda por texto, filtros leídos desde la URL, estados
  vacío/error con reintento y navegación.

### 3.3 Ejecución

```bash
cd frontend
pnpm test            # ejecuta la suite
pnpm test:coverage   # ejecuta la suite y reporta cobertura
```

### 3.4 Cobertura por archivo

| Archivo | % Stmts | % Branch | % Funcs | % Lines |
| ------- | ------- | -------- | ------- | ------- |
| `Pagination.tsx` | 100 | 100 | 100 | 100 |
| `PropertyCard.tsx` | 100 | 96.87 | 100 | 100 |
| `PropertyList.tsx` | 97.79 | 94.44 | 97.56 | 99.03 |
| `services/properties.ts` | 100 | 75 | 100 | 100 |
| **Total** | **98.5** | **95.05** | **98.59** | **99.34** |

---

## 4. Herramientas y entorno

| Ámbito | Herramienta |
| ------ | ----------- |
| Gestor de paquetes Node | **pnpm** (`frontend/pnpm-lock.yaml`) |
| Gestor de entorno Python | **uv** (`backend/uv.lock`, `backend/pyproject.toml`) |
| Pruebas backend | Django `TestCase` + DRF `APIClient` |
| Pruebas frontend | Jest + React Testing Library + axios-mock-adapter |

---

## 5. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| Pruebas de API con paginación, detalle y validaciones | ✅ 10/10 |
| Pruebas de servicios con mocks HTTP | ✅ 8/8 |
| Pruebas de componentes e integración del catálogo | ✅ 62/62 |
| Cobertura frontend ≥ 80% | ✅ 98.5% |
| Suite total en verde | ✅ 80/80 |
| Documentación de las pruebas | ✅ Este documento + `docs/09_TASK_TEST_PROP_02.md` |

---

## 6. Referencias

* `docs/09_TASK_TEST_PROP_02.md` — detalle de la implementación de las pruebas de frontend
  (configuración de Jest/Babel, caso `import.meta.env`, cobertura).
* `backend/apps/properties/tests/test_catalog.py` — suite del backend.
* `docs/06_UX_UI_PROP.md` y `docs/api/openapi_spec.yaml` — contrato funcional del catálogo.
