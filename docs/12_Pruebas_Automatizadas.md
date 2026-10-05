# Pruebas Automatizadas — HouseBroker Perú

**Documento:** Resumen consolidado de la estrategia y las pruebas automatizadas del proyecto
**Tareas:** `TASK-BACK-PROP-02`, `TASK-TEST-PROP-02`, `TASK-WPO-PROP-02`, `TASK-TEST-PROP-03` y `TASK-A11Y-PROP-03`
**Versión:** 2.1

---

## 1. Resumen ejecutivo

| Capa | Framework | Archivos | Pruebas | Resultado |
| ---- | --------- | -------- | ------- | --------- |
| Backend (API) | Django `TestCase` + DRF `APIClient` | 1 | 10 | 10/10 |
| Frontend (UI/Servicios) | Jest 30 + React Testing Library | 10 | 222 | 222/222 |
| **Total** | | **11** | **232** | **232/232** |

Cobertura de código del frontend (módulos del catálogo y de filtros): **98.61%** sentencias,
**95.54%** ramas, **99%** funciones, **99.55%** líneas (umbral exigido: 80%).

Además de las pruebas automatizadas, el proyecto mantiene una capa de **verificaciones de
calidad** (lint, tipos, build, contrato OpenAPI y performance) documentada en la
[sección 5](#5-verificaciones-de-calidad).

Desde `TASK-CI-01` esa capa ya no depende de que alguien la ejecute a mano: `.github/workflows/ci.yml`
corre en cada push y PR a `main` los gates de **frontend** (lint, pruebas con cobertura, build)
y **backend** (pruebas de API con SQLite). El contrato OpenAPI, Lighthouse y la auditoría de
accesibilidad siguen siendo manuales, por los motivos que se explican en la sección 5.

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

## 3. Pruebas de Frontend

**Herramientas:** Jest 30, jest-environment-jsdom, React Testing Library,
`@testing-library/user-event`, `@testing-library/jest-dom` y `axios-mock-adapter`.

### 3.1 Inventario de suites

| Suite | Archivo | Pruebas | Tarea | Tipo |
| ----- | ------- | ------- | ----- | ---- |
| Servicios HTTP | `src/services/properties.test.jsx` | 8 | `TASK-TEST-PROP-02` | Mocks HTTP |
| Tarjeta de propiedad | `src/components/properties/PropertyCard.test.jsx` | 25 | `TASK-TEST-PROP-02` | Unitaria |
| Paginación | `src/components/properties/Pagination.test.jsx` | 9 | `TASK-TEST-PROP-02` | Unitaria |
| Catálogo | `src/components/properties/PropertyList.test.jsx` | 31 | `TASK-TEST-PROP-02` / `TASK-A11Y-PROP-03` | Integración |
| Formulario de publicación | `src/components/properties/PropertyForm.test.jsx` | 9 | previa | Unitaria |
| Detalle de propiedad | `src/components/properties/PropertyDetail.test.jsx` | 7 | `TASK-WPO-PROP-02` | Integración |
| Filtros: query string y URL parsing | `src/components/properties/useFilterParams.test.jsx` | 74 | `TASK-TEST-PROP-03` | Unitaria |
| Filtros: estado inicial | `src/components/properties/filters.test.jsx` | 10 | `TASK-TEST-PROP-03` | Unitaria |
| Filtros: panel lateral | `src/components/properties/FilterSidebar.test.jsx` | 16 | `TASK-TEST-PROP-03` | Unitaria |
| Filtros: accesibilidad del panel | `src/components/properties/FilterSidebar.a11y.test.jsx` | 33 | `TASK-A11Y-PROP-03` | Unitaria (a11y) |
| **Total** | | **222** | | |

> El desglose de `PropertyList.test.jsx` (31 = 25 + 6) y el detalle de la suite de
> accesibilidad están en `docs/15_TASK_A11Y_PROP_03.md` §4.

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
* **`PropertyDetail`:** renderizado de la ficha, resolución del parámetro `:id` de la ruta
  diferida y acciones de la página.
* **`useFilterParams`:** generación exacta de la query string al aplicar filtros, parseo de
  la URL inicial (incluidos los valores inválidos que deben caer al default) y reset. El hook
  usa la URL como fuente de verdad, así que la suite monta un *probe* sobre
  `MemoryRouter` para observar `location.search` y `useNavigationType()`.
* **`filters`:** contrato de `emptyFilters` (los 8 campos, los tipos, la propagación de los
  *bounds* del catálogo y que cada llamada devuelva un objeto nuevo).
* **`FilterSidebar`:** estado inicial reflejando los filtros que llegan aplicados, emisión de
  un único borrador combinado al pulsar *Aplicar filtros*, `clampPrice` del rango de precio y
  el botón de reset.
* **`FilterSidebar` (accesibilidad, `TASK-A11Y-PROP-03`):** nombres accesibles de los toggles
  de metraje y habitaciones, asociación `id`/`htmlFor` de los checkboxes, `aria-valuetext`
  con moneda en los sliders, `role="group"` con nombre, orden de tabulación de los 17
  controles, ausencia de focus trap y activación con `Enter`/`Espacio`.
* **Región viva del catálogo (`TASK-A11Y-PROP-03`):** el contador de resultados se anuncia
  como *status message* y su texto cambia al aplicar un filtro o al paginar.

### 3.3 Ejecución

```bash
cd frontend
pnpm test            # ejecuta la suite
pnpm test:coverage   # ejecuta la suite y reporta cobertura
```

> El proyecto usa **pnpm** como gestor de paquetes (lockfile `pnpm-lock.yaml`).

### 3.4 Cobertura por archivo

`pnpm test:coverage` (módulos incluidos en `collectCoverageFrom`):

| Archivo | % Stmts | % Branch | % Funcs | % Lines |
| ------- | ------- | -------- | ------- | ------- |
| `FilterSidebar.tsx` | 100 | 100 | 100 | 100 |
| `filters.ts` | 100 | 100 | 100 | 100 |
| `useFilterParams.ts` | 100 | 100 | 100 | 100 |
| `Pagination.tsx` | 100 | 100 | 100 | 100 |
| `PropertyCard.tsx` | 100 | 97.43 | 100 | 100 |
| `PropertyDetail.tsx` | 95.83 | 90.24 | 100 | 100 |
| `PropertyList.tsx` | 97.79 | 94.44 | 97.56 | 99.03 |
| `services/properties.ts` | 100 | 75 | 100 | 100 |
| **Total** | **98.61** | **95.54** | **99** | **99.55** |

El umbral `coverageThreshold.global` está en **80%** para las cuatro métricas y se supera en
todas. Los tres módulos del panel de filtros (`FilterSidebar`, `filters`, `useFilterParams`)
quedan al 100%.

---

## 4. Herramientas y entorno

| Ámbito | Herramienta |
| ------ | ----------- |
| Gestor de paquetes Node | **pnpm** (`frontend/pnpm-lock.yaml`) |
| Gestor de entorno Python | **uv** (`backend/uv.lock`, `backend/pyproject.toml`) |
| Pruebas backend | Django `TestCase` + DRF `APIClient` |
| Pruebas frontend | Jest 30 + React Testing Library + `axios-mock-adapter` |
| Emulador HTTP en pruebas | `axios-mock-adapter` sobre la instancia real de Axios |
| Lint | oxlint |
| Tipos y build | `tsc -b` + Vite |
| Contrato API | Spectral (`docs/api/.spectral.yaml`) |

---

## 5. Verificaciones de calidad

Esta capa complementa a las pruebas automatizadas. Los cuatro gates de la tabla están
automatizados en `.github/workflows/ci.yml` (`TASK-CI-01`) y se ejecutan en cada push y PR a
`main`; los tres últimos siguen siendo manuales, y por eso se mantienen aquí con su comando.

| Verificación | Comando | ¿En CI? | Estado actual |
| ------------ | ------- | ------- | ------------- |
| Suite de pruebas | `cd frontend && pnpm test` | Sí | 222/222 |
| Cobertura | `cd frontend && pnpm test:coverage` | Sí | 98.61% stmts / 95.54% branches (umbral 80%) |
| Lint | `cd frontend && pnpm run lint` | Sí | Sin errores. 1 *warning* preexistente: `FilterSidebar.tsx:38` (`react/set-state-in-effect`) |
| Tipos y build | `cd frontend && pnpm run build` | Sí | Correcto |
| Suite de API | `cd backend && DJANGO_DB_ENGINE=sqlite uv run python manage.py test apps.properties` | Sí | 10/10 |
| Contrato OpenAPI | `npx @stoplight/spectral-cli lint docs/api/openapi_spec.yaml --ruleset docs/api/.spectral.yaml` | No | Ver desviaciones conocidas en `docs/api/README.md` |
| Performance | Lighthouse sobre `vite preview` | No | Evidencia en `docs/scrum/sprint-2/evidencias/Anderson_Villanes/TASK-WPO-PROP-02/lighthouse-report.json` (performance 84) |
| Accesibilidad | Suite automatizada + revisión manual con AXE DevTools | Parcial | `docs/08_TASK_A11Y_PROP_02.md` y `docs/15_TASK_A11Y_PROP_03.md` (39 pruebas) |

### 5.1 Por qué Spectral y Lighthouse no están en el CI

No es una omisión por descuido, son las dos verificaciones que fallan si se agregan hoy:

* **Spectral** reporta desviaciones conocidas ya documentadas en `docs/api/README.md`. Ponerlo
  como gate bloquearía todos los PRs hasta arreglar el contrato, que es trabajo aparte.
* **Lighthouse** necesita levantar `vite preview` y esperar a que el build esté servido. Es un
  job con servidor, puertos y espera: no pertenece a un primer workflow que solo quiere ser
  rápido y fiable.

### 5.2 Configuración del workflow

| Aspecto | Decisión | Motivo |
| ------- | -------- | ------ |
| Versión de Node | 22 | Declarada en el workflow; no existe `.nvmrc` en el repo |
| Versión de pnpm | 10 (`pnpm/action-setup@v4`) | No hay campo `packageManager` en `package.json`; el lockfile es `lockfileVersion: 9.0` |
| Versión de Python | 3.12 | `requires-python = ">=3.12"` en `backend/pyproject.toml` |
| Instalación | `pnpm install --frozen-lockfile` y `uv sync --frozen` | Falla si el lockfile no coincide con el manifiesto, en vez de resolver dependencias distintas a las probadas en local |
| Base de datos | `DJANGO_DB_ENGINE=sqlite` (en memoria) | Evita un servicio de PostgreSQL; la suite no lo necesita |
| Secretos | Ninguno | `settings.py` trae default para `DJANGO_SECRET_KEY` y `DJANGO_DEBUG` |
| Ejecuciones concurrentes | `cancel-in-progress: true` | En pushes seguidos solo cuenta el último commit |

> La verificación de accesibilidad tiene dos capas. La automática (nombres accesibles, roles,
> estados y teclado) sí corre en `pnpm test`. La del anillo de foco es CSS y la auditoría de
> AXE DevTools es una extensión de navegador: ambas las ejecuta una persona y están
> listadas como checklist en `docs/15_TASK_A11Y_PROP_03.md` §5.

---

## 6. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| Pruebas de API con paginación, detalle y validaciones | 10/10 |
| Pruebas de servicios con mocks HTTP | 8/8 |
| Pruebas de componentes e integración del catálogo | 81/81 |
| Pruebas de filtros, query string y URL parsing (`TASK-TEST-PROP-03`) | 100/100 |
| Pruebas de accesibilidad del formulario de filtros (`TASK-A11Y-PROP-03`) | 39/39 |
| Cobertura frontend ≥ 80% | 98.61% stmts / 95.54% branches |
| Suite total en verde | 232/232 |
| Documentación de las pruebas | Este documento + los documentos por tarea |

---

## 7. Referencias

* `docs/09_TASK_TEST_PROP_02.md` — detalle de la implementación de las pruebas de frontend
  (configuración de Jest/Babel, caso `import.meta.env`, cobertura).
* `docs/14_TASK_TEST_PROP_03.md` — detalle de las pruebas de filtros, query string y URL
  parsing.
* `docs/15_TASK_A11Y_PROP_03.md` — pruebas de accesibilidad del formulario de filtros y
  checklist de verificación manual.
* `docs/13_TASK_WPO_PROP_02.md` — suite de detalle de propiedad y auditoría Lighthouse.
* `docs/08_TASK_A11Y_PROP_02.md` — revisión de accesibilidad del catálogo y la paginación.
* `backend/apps/properties/tests/test_catalog.py` — suite del backend.
* `frontend/jest.config.cjs` — configuración de Jest, módulos incluidos en cobertura y
  umbrales.
* `.github/workflows/ci.yml` — gates automatizados de `TASK-CI-01`.
* `docs/06_UX_UI_PROP.md` y `docs/api/openapi_spec.yaml` — contrato funcional del catálogo.