# [TASK-TEST-PROP-03] Pruebas de combinación de filtros y URL parsing

**Issue:** #47
**Historia de usuario:** HU-PROP-03 (panel de filtros del catálogo)

## 1. Objetivo

Garantizar la estabilidad en la aplicación de filtros y el correcto parseo de la cadena de
consulta de la URL del catálogo de propiedades.

La URL es la **única fuente de verdad** de los filtros: se lee al entrar a la vista y se
reescribe cada vez que el usuario aplica, quita o limpia un filtro. Esa lógica vive en
`src/components/properties/useFilterParams.ts` y hasta esta tarea no tenía ninguna suite
propia, pese a ser el punto con más riesgo de regresión de `HU-PROP-03`: un `params.set`
mal puesto o un default mal leído rompen el enlace profundo de una búsqueda guardada y el
botón de compartir.

Los tres entregables del issue se cubren así:

| Entregable del issue                                                                            | Suite                      | Casos |
| ----------------------------------------------------------------------------------------------- | -------------------------- | ----- |
| Pruebas de la generación de la Query String tras aplicar filtros                                 | `useFilterParams.test.jsx` | 23    |
| Pruebas de simulación de URL inicial para comprobar que los filtros se cargan aplicados          | `useFilterParams.test.jsx` | 39    |
| Pruebas sobre la función de reset de filtros                                                    | `useFilterParams.test.jsx` | 12    |

## 2. Herramientas utilizadas

Se reutiliza el stack de `TASK-TEST-PROP-02`, sin dependencias nuevas.

| Herramienta                    | Rol en esta tarea                                                        |
| ------------------------------ | ----------------------------------------------------------------------- |
| **Jest 30**                    | Runner y aserciones.                                                     |
| **@testing-library/react**     | `renderHook` para el hook de filtros y `render` para el panel lateral.   |
| **@testing-library/user-event** | Clics y checkboxes del panel de filtros.                               |
| **@testing-library/jest-dom**  | Matchers de DOM (`toBeChecked`, `toHaveAttribute`).                      |
| **react-router-dom 7**         | `MemoryRouter`, `useLocation` y `useNavigationType` para observar la URL. |

## 3. Estructura de las pruebas

| Archivo                                             | Tipo      | Casos | Qué valida                                                                                                                                                       |
| --------------------------------------------------- | --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/properties/useFilterParams.test.jsx` | Unitarias | **74** | Generación de la query string tras aplicar filtros (23), parseo de la URL inicial (39) y reset de filtros (12).                                                 |
| `src/components/properties/filters.test.jsx`        | Unitarias | **10** | Contrato de `emptyFilters`: campos, tipos, propagación de bounds y objeto nuevo por llamada.                                                                      |
| `src/components/properties/FilterSidebar.test.jsx`  | Unitarias | **16** | Estado inicial desde la URL (4), emisión del borrador combinado (5), `clampPrice` del rango de precio (4) y botón de reset (3).                                |

Total de la tarea: **3 suites / 100 pruebas**. Suite completa del frontend: **9 suites / 183
pruebas**.

### 3.1 Observar la URL: el *probe* del router

`useFilterParams` no recibe ni devuelve la URL: la lee y la escribe a través de
`useSearchParams`. Para poder asertar sobre lo que realmente se escribe en el navegador, el
hook se monta con `renderHook` dentro de un `MemoryRouter` que incluye un componente *probe*
que expone el estado del router en el DOM:

```jsx
function Probe({ id }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  return (
    <>
      <span data-testid={`search-${id}`}>{location.search}</span>
      <span data-testid={`navigation-type-${id}`}>{navigationType}</span>
    </>
  )
}
```

Dos detalles que condicionaron el diseño de la suite:

* **Un `id` por montaje.** Varios casos montan el hook dos veces en el mismo test para
  comparar dos escenarios (con y sin un límite de precio). Un `data-testid` fijo haría que
  `screen.getByTestId` encontrara los *probes* de todos los montajes a la vez y fallara con
  *found multiple elements*. El contador `mounts` le da un id único a cada montaje.
* **`act` alrededor de las escrituras.** `applyFilters` y `clearFilters` escriben en la URL,
  lo que dispara un re-render del hook (vuelve a leer los *search params*). Las llamadas van
  envueltas en `act` para que React aplique esa actualización antes del `expect`.

`useNavigationType` permite además verificar que la URL se actualiza con `replace: true` y
no apila una entrada de historial por cada filtro aplicado.

### 3.2 Qué omite la query string (y por qué importa)

`applyFilters` no escribe un parámetro cuando su valor es el que ya asume el catálogo. Las
reglas exactas que fija la suite son:

| Parámetro    | Se escribe cuando                                                  |
| ------------ | ------------------------------------------------------------------ |
| `operacion`  | hay modalidad seleccionada (`VENTA` / `ALQUILER`).                 |
| `priceMin`   | `priceMin > bounds.min`.                                           |
| `priceMax`   | `bounds.max > 1` **y** `priceMax < bounds.max`.                    |
| `metraje`    | hay franja seleccionada (`small` / `mid` / `large`).               |
| `habitaciones` | es distinto de `null` (el `0` **sí** se escribe).                |
| `negociable`, `destacado`, `cochera` | el checkbox está en `true`.                          |

El guard `bounds.max > 1` es el caso del **catálogo vacío**: `PropertyList` devuelve
`{ min: 0, max: 1 }` cuando no hay propiedades, y con esos *bounds* un límite superior de
precio se descarta por completo en lugar de dejar un `priceMax=0` que vaciaría el catálogo
sin que se pueda recuperar.

La suite también fija el **orden** de los parámetros al aplicar los ocho a la vez
(`operacion → priceMin → priceMax → metraje → habitaciones → negociable → destacado →
cochera`), porque un orden distinto produce una query string distinta y por tanto enlaces
profundos que no coinciden con los que se compartieron.

### 3.3 Parseo de la URL inicial

Se cubre la URL vacía, la URL con los ocho filtros y el fallback de los valores que no
pertenecen al dominio:

| Entrada en la URL                | Resultado esperado                       |
| -------------------------------- | ---------------------------------------- |
| `?operacion=COMPRA`, `?metraje=huge` | vacío (vuelve al default)            |
| `?priceMin=abc`, `?priceMax=30k` | vuelve a `bounds.min` / `bounds.max`      |
| `?habitaciones=tres`             | `null`                                    |
| `?negociable=1`, `?negociable=TRUE` | `false` (la comparación es estricta)  |
| `?operacion=VENTA&operacion=ALQUILER` | gana el primer valor (`URLSearchParams.get`) |
| `?utm_source=...`                | ignorado                                 |
| `?priceMin=999999999`            | se respeta aunque esté fuera de los *bounds* (el hook no recorta) |

> **Comportamiento fijado por la suite:** un parámetro numérico **presente pero vacío**
> (`?priceMin=`) se interpreta como `0` y no cae al default, porque `Number('')` es `0` y no
> `NaN`. Es inocuo —`applyFilters` nunca escribe un parámetro numérico vacío— pero queda
> documentado con una prueba explícita para que no cambie por accidente al tocar el parseo.

El caso de **round-trip** comprueba que los filtros que produce `applyFilters` se releen
correctamente: tras aplicar los ocho, el objeto `filters` que el hook vuelve a derivar de la
URL es idéntico al que se aplicó. Sin esa prueba, un cambio en la escritura y otro en la
lectura podrían cancelarse mutuamente y dejar la suite en verde con la URL rota.

### 3.4 Reset de filtros

`clearFilters` se valida contra la URL, no contra el estado local del componente:

* vacía el querystring y restaura `emptyFilters(bounds)`;
* navega con `REPLACE` (no apila historial);
* es idempotente sobre una URL ya vacía;
* borra también los parámetros ajenos que venían en la URL.

Y la remoción de un filtro puntual desde los *chips* se valida con cinco combinaciones
distintas (metraje, modalidad, habitaciones, rango de precio y característica): quitar un
chip debe borrar **solo** ese parámetro y conservar el resto. El caso extremo quita los ocho
filtros uno a uno y comprueba que la URL queda en `''`.

### 3.5 Panel lateral de filtros

`FilterSidebar` mantiene un borrador local que se inicializa desde las props y solo sube a
la URL al pulsar *Aplicar filtros*; esa separación es lo que evita que cada movimiento de
slider dispare una consulta al backend. La suite comprueba que el borrador refleja los
filtros que llegan aplicados, que **no emite nada** hasta pulsar *Aplicar filtros*, que emite
**un único objeto con los filtros combinados**, y que el botón *Limpiar* delega el reset sin
llegar a emitir.

El rango de precio tiene su propio bloque porque `clampPrice` es la regla con más
consecuencias de estado: si el usuario cruza los dos *sliders*, el rango emitido queda
invertido pero ordenado (`priceMin` toma el menor y `priceMax` el mayor de los dos valores
involucrados). Los *sliders* son `input[type=range]`, que no admiten `userEvent.clear()`, así
que se mueven con `fireEvent.change`.

## 4. Configuración

`jest.config.cjs` incorpora los tres módulos de esta tarea a `collectCoverageFrom`:

```js
collectCoverageFrom: [
  // ...módulos del catálogo (TASK-TEST-PROP-02)
  'src/components/properties/FilterSidebar.tsx',
  'src/components/properties/useFilterParams.ts',
  'src/components/properties/filters.ts',
]
```

El umbral `coverageThreshold.global` se mantiene en **80%** en las cuatro métricas.

No hizo falta ningún otro ajuste: el *polyfill* de `TextEncoder` / `TextDecoder` de
`jest.setup.js` (documentado en `docs/09_TASK_TEST_PROP_02.md`) ya cubre lo que
`react-router-dom` necesita, y el *stub* de CSS ya cubre el `import './FilterSidebar.css'`.

## 5. Ejecución

```bash
cd frontend
pnpm test              # ejecuta la suite
pnpm test:coverage     # ejecuta la suite y reporta cobertura
pnpm run lint          # oxlint
pnpm run build         # tsc -b && vite build
```

> El proyecto usa **pnpm** como gestor de paquetes (lockfile `pnpm-lock.yaml`).

## 6. Resultados obtenidos

### 6.1 Pruebas

`pnpm test` → **9 suites / 183 pruebas en verde** (100 de esta tarea).

### 6.2 Cobertura

`pnpm test:coverage`:

| Archivo               | % Stmts | % Branch | % Funcs | % Lines |
| --------------------- | ------- | -------- | ------- | ------- |
| **Todos los archivos** | **98.6** | **95.48** | **99** | **99.55** |
| `useFilterParams.ts`   | 100 | 100 | 100 | 100 |
| `filters.ts`           | 100 | 100 | 100 | 100 |
| `FilterSidebar.tsx`    | 100 | 100 | 100 | 100 |
| `PropertyCard.tsx`     | 100 | 97.43 | 100 | 100 |
| `PropertyDetail.tsx`   | 95.83 | 90.24 | 100 | 100 |
| `Pagination.tsx`       | 100 | 100 | 100 | 100 |
| `PropertyList.tsx`     | 97.79 | 94.44 | 97.56 | 99.03 |
| `services/properties.ts` | 100 | 75 | 100 | 100 |

Los tres módulos del panel de filtros quedan al **100% en las cuatro métricas**. El umbral
configurado (80%) se supera en todas.

### 6.3 Lint y build

| Comando         | Resultado                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm run lint` | Sin errores. Un *warning* preexistente de `oxlint` en `FilterSidebar.tsx:34` (`react/set-state-in-effect`), ajeno a esta tarea. |
| `pnpm run build` | Correcto (`tsc -b` + `vite build`).                                                                       |

## 7. Criterios de aceptación

| Criterio                                                              | Resultado |
| --------------------------------------------------------------------- | --------- |
| Pruebas de la generación de la Query String tras aplicar filtros      | 23 casos en `useFilterParams.test.jsx` |
| Pruebas de simulación de URL inicial (filtros cargados aplicados)      | 39 casos en `useFilterParams.test.jsx` |
| Pruebas sobre la función de reset de filtros                          | 12 casos en `useFilterParams.test.jsx` + 3 en `FilterSidebar.test.jsx` |
| Cobertura de la lógica de filtros ≥ 80%                              | 100% en las cuatro métricas |
| `pnpm test` en verde                                                  | 183/183 |
| `pnpm run lint` en verde                                              | Sin errores |
| `pnpm run build` en verde                                             | Correcto |
| Documentación de las pruebas                                          | Este documento + actualización de `docs/12_Pruebas_Automatizadas.md` |

## 8. Notas

* Los archivos de prueba usan extensión `.jsx` y no `.tsx` por la misma razón que señala
  `docs/09_TASK_TEST_PROP_02.md`: `tsconfig.app.json` incluye `src` con `noUnusedLocals` y
  sólo los tipos de `vite/client`, de modo que un `.tsx` de pruebas rompería `tsc -b`.
* Esta tarea **no modifica código de producción**. El único cambio de configuración es
  `collectCoverageFrom`.
* La suite de `PropertyList` (`TASK-TEST-PROP-02`) ya cubría los filtros *de forma
  indirecta*, comprobando que el catálogo se filtraba bien con una URL dada. Estas pruebas
  atacan el paso intermedio: la query string exacta que se escribe y el parseo exacto de la
  URL, que es lo que hace que un enlace compartido funcione en otra sesión o en otro
  navegador.