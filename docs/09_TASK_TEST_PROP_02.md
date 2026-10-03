# [TASK-TEST-PROP-02] Pruebas automatizadas del Catálogo y la Paginación

## 1. Objetivo

Incorporar una suite de pruebas automatizadas en el frontend para el catálogo de propiedades
y su paginación, cubriendo:

* Los **servicios HTTP** del catálogo (`getProperties`, `getProperty`, `createProperty`,
  `updateProperty`, `deleteProperty`) con respuestas simuladas de la API.
* El **renderizado** de la tarjeta de propiedad (`PropertyCard`) y del control de
  paginación (`Pagination` / `PaginationControl`).
* La **integración** del catálogo (`PropertyList`) dentro del router: carga, paginación,
  orden, vistas, búsqueda, filtros leídos desde la URL, estados vacío/error y navegación.
* Una **cobertura mínima del 80%** (ramas, funciones, líneas y sentencias) sobre los
  módulos del catálogo.

## 2. Herramientas utilizadas

| Herramienta                  | Rol                                                             |
| ---------------------------- | --------------------------------------------------------------- |
| **Jest 30**                  | Runner de pruebas y motor de aserciones.                        |
| **jest-environment-jsdom**   | Entorno de DOM simulado para montar componentes React.          |
| **@testing-library/react**   | Renderizado y consultas accesibles de los componentes.          |
| **@testing-library/user-event** | Simulación realista de interacción de usuario (clic, tecleo). |
| **@testing-library/jest-dom** | Matchers de DOM (`toBeInTheDocument`, `toBeDisabled`, etc.).    |
| **axios-mock-adapter**       | Simulación de las respuestas HTTP sobre la instancia de Axios.  |
| **babel-jest**               | Transformación de TS/TSX/JSX a CommonJS para Jest.              |

## 3. Estructura de las pruebas

| Archivo | Tipo | Casos | Qué valida |
| ------- | ---- | ----- | ---------- |
| `src/services/properties.test.jsx` | Servicios (mocks HTTP) | 8 | `getProperties` (paginado y arreglo plano), `getProperty`, `createProperty`, `updateProperty`, `deleteProperty` y la normalización de errores del interceptor. |
| `src/components/properties/PropertyCard.test.jsx` | Unitarias | 19 | Precio, mantenimiento, título, dirección, metrística, modalidad, tipo, insignias y acciones de guardar/visitar. |
| `src/components/properties/Pagination.test.jsx` | Unitarias | 9 | Resumen del rango, singular/plural, página activa, botones anterior/siguiente y elipsis. |
| `src/components/properties/PropertyList.test.jsx` | Integración | 25 | Carga, paginación, orden, vistas, búsqueda, filtros de URL, estados vacío/error y navegación. |
| `src/components/properties/PropertyForm.test.jsx` | Unitarias (previo) | 9 | Formulario de publicación (ya existente, se mantiene). |

Total: **5 suites / 70 pruebas**.

### 3.1 Mocks HTTP

Las pruebas de servicios montan `axios-mock-adapter` sobre la **misma instancia** de Axios
(`src/services/axios.ts`), por lo que también se ejercita el interceptor de respuesta que
normaliza los errores de la API (`status`, `userMessage`). El endpoint de lista se simula con
la forma paginada del contrato del backend:

```json
{ "count": 13, "next": null, "previous": null, "results": [ /* ... */ ] }
```

`getProperties()` desempaqueta `results` y conserva compatibilidad con respuestas de
arreglo plano.

### 3.2 Integración del catálogo

`PropertyList` se monta dentro de `MemoryRouter`, ya que el hook de filtros
(`useFilterParams`) depende de la URL (`useSearchParams`). Se valida la paginación en
cliente (`PAGE_SIZE = 6`), el orden por defecto `recent` (más reciente primero), los modos
de vista, la búsqueda por texto y los filtros leídos desde el querystring.

## 4. Configuración

### 4.1 `jest.config.cjs`

* `testEnvironment: 'jsdom'`.
* `testEnvironmentOptions.customExportConditions: ['node', 'node-addons']` para que
  dependencias como `axios` se resuelvan en su build CommonJS.
* `transform` con `babel-jest` para `js/jsx/ts/tsx`.
* `collectCoverageFrom` acotado a `PropertyCard.tsx`, `Pagination.tsx`,
  `PropertyList.tsx` y `services/properties.ts`.
* `coverageThreshold.global` en **80%** para ramas, funciones, líneas y sentencias.

### 4.2 `babel.config.cjs`

Se fuerza `@babel/preset-env` con `modules: 'commonjs'` y se añade un **plugin local** que
reemplaza `import.meta.env` por un objeto plano durante las pruebas.

> **Motivo:** `src/services/axios.ts` usa `import.meta.env.VITE_API_URL` (sintaxis
> exclusiva de ESM que Vite resuelve en build). Al ejecutarse bajo CommonJS en Jest,
> `import.meta` provoca un `SyntaxError` que Jest reporta como
> `Must use import to load ES Module`. El plugin lo traduce a `({ env: { ... } })`, de modo
> que el `?? 'http://localhost:8000/api'` de respaldo se aplica con normalidad en tests.

### 4.3 `jest.setup.js`

Carga `@testing-library/jest-dom` y define un polyfill de `TextEncoder` / `TextDecoder`
(ausentes en jsdom) requerido por `react-router-dom`.

## 5. Ejecución

```bash
cd frontend
pnpm test              # ejecuta la suite
pnpm test:coverage     # ejecuta la suite y reporta cobertura
```

> El proyecto usa **pnpm** como gestor de paquetes (lockfile `pnpm-lock.yaml`).

## 6. Cobertura obtenida

Ejecución de `pnpm test:coverage`:

| Archivo | % Stmts | % Branch | % Funcs | % Lines |
| ------- | ------- | -------- | ------- | ------- |
| **Todos los archivos** | **98.5** | **95.05** | **98.59** | **99.34** |
| `Pagination.tsx` | 100 | 100 | 100 | 100 |
| `PropertyCard.tsx` | 100 | 96.87 | 100 | 100 |
| `PropertyList.tsx` | 97.79 | 94.44 | 97.56 | 99.03 |
| `services/properties.ts` | 100 | 75 | 100 | 100 |

El umbral configurado (80% en todas las métricas) se supera ampliamente.

## 7. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| Pruebas de servicios con mocks de respuestas HTTP paginadas | ✅ Cumplido |
| Pruebas de renderizado de `PropertyCard` | ✅ Cumplido |
| Pruebas de `PaginationControl` | ✅ Cumplido |
| Pruebas de integración del catálogo con cambio de página y detalle | ✅ Cumplido |
| Cobertura ≥ 80% | ✅ 98.5% sentencias / 95.05% ramas |
| Documentación de las pruebas | ✅ Este documento |
| `pnpm test` en verde | ✅ 70/70 |
| `pnpm run build` en verde | ✅ |
| `pnpm run lint` en verde | ✅ |

## 8. Notas

* Los archivos de prueba usan la extensión `.jsx` (no `.tsx`): `tsconfig.app.json` incluye
  `src` con `noUnusedLocals` y sólo los tipos de `vite/client`, por lo que un archivo `.tsx`
  de pruebas rompería `tsc -b`.
* Se eliminaron los temporales de diagnóstico utilizados durante la investigación del
  error de ESM; no quedan artefactos en el repositorio.
