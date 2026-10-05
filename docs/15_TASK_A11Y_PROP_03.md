# [TASK-A11Y-PROP-03] Accesibilidad del formulario de filtros (WCAG 2.2 AA)

**Issue:** #48
**Alcance:** `FilterSidebar`, barra de búsqueda y select de orden del catálogo
**Criterio de referencia:** WCAG 2.2 Nivel AA

---

## 1. Objetivo

Corregir los incumplimientos de accesibilidad detectados en los controles del formulario de
filtros (HU-PROP-03) y de la barra de búsqueda del catálogo, y cubrirlos con pruebas
automatizadas que impeidan la regresión.

La revisión parte del componente y no del checkbox del issue: se auditaron los controles que
lo componen (13 checkboxes/toggles, 2 sliders, 3 checkboxes de características, 2 botones de
acción) más los dos controles de la cabecera del catálogo.

## 2. Hallazgos y corrección

### 2.1 Anillo de foco suprimido en la barra de búsqueda y en el select de orden

`PropertyList.css` declaraba `outline: none` en `.hsearch__input` y en
`.hprops__sort-select:focus` sin aportar ningún indicador de foco propio. El `outline: none`
del input, además, anulaba el `:focus-visible` global definido en `index.css`, de modo que
con teclado el usuario no veía dónde estaba.

Corrección:

* `.hsearch__bar:focus-within` pinta el anillo sobre la barra que contiene el input. Se
  **suma** al `box-shadow: inset` que ya tenía en lugar de reemplazarlo, para no perder la
  sombra interior del campo.
* `.hprops__sort-select:focus-visible` restituye el `outline` global y añade el mismo
  `box-shadow: var(--ring)` que ya usan `TextInput` y `Select`, con el criterio
  `:focus-visible` para no marcar el campo con clic de ratón.

### 2.2 El contador de resultados no se anunciaba

Aplicar un filtro reescribe el conteo, pero no había ninguna región viva: un usuario de lector
de pantalla no se enteraba de que "13 propiedades encontradas" pasaban a ser "4 propiedades
encontradas" o "Sin resultados".

Corrección: `aria-live="polite"` y `aria-atomic="true"` sobre `.hprops__subtitle`
(`PropertyList.tsx`). `aria-atomic` hace que se anuncie la frase completa y no solo el
fragmento modificado, que es lo que importa al alternar entre el plural y "Sin resultados".

> Esta corrección **restablece** una región viva que `docs/08_TASK_A11Y_PROP_02.md` daba por
> existente. La auditoría de aquel documento se hizo sobre el catálogo previo a la
> refactorización de `TASK-WPO-PROP-02`, que eliminó el atributo al rehacer el contenedor.
> El documento 08 se corrigió para que no afirme algo que el código no tiene.

### 2.3 Checkboxes de características solo con asociación implícita

`<label><input type="checkbox" /></label>` cumple la association implícita, pero deja el
control sin `id`: no se puede localizar con `getByLabelText` por atributo, y mover el input
dentro del markup rompe la relación sin aviso.

Corrección: `useId()` en `FilterSidebar` y un `id`/`htmlFor` por checkbox. Al venir de
`useId`, los ids son únicos aunque el panel se monte más de una vez en el árbol.

### 2.4 Sliders de precio sin `aria-valuetext`

Los sliders declaraban `aria-valuemin`, `aria-valuemax` y `aria-valuenow`, pero sin
`aria-valuetext`: el lector de pantalla anunciaba el número crudo ("250000"), sin moneda ni
separador de miles.

Corrección: `aria-valuetext={formatMoney(valor, currency)}`, que reutiliza el formateador del
propio catálogo y por tanto anuncia "S/. 250,000" y "US$ 250,000" según la moneda.

### 2.5 Toggles con texto visible insuficiente

Los botones de metraje muestran "≤ 80", "80–150" y "+150", y los de habitaciones "1"–"4" y
"5+". Leídos fuera de contexto no son inequívocos: "+150" no dice de qué, ni que "5+" es un
mínimo y no un valor exacto.

Corrección: `aria-label` descriptivo en cada toggle (**"Hasta 80 m²"**, **"Entre 80 y 150 m²"**,
**"Más de 150 m²"**, **"1 habitación"** … **"5 o más habitaciones"**) manteniendo el texto
visible intacto, porque el `aria-label` solo sustituye al nombre accesible, no al rótulo que
ve el usuario. El texto corto sigue estando en el DOM como contenido del botón.

`aria-pressed` ya exponía el estado de selección y se mantiene.

### 2.6 Hallazgo fuera de alcance

`frontend/src/components/ToggleGroup.tsx:16` declara `role="group"` sin nombre accesible, lo
que incumple WCAG 4.1.2. Se documenta como pendiente porque su único uso está en
`steps/basic.tsx` (wizard de publicación, `TASK-UI-PROP-04`) y no en el formulario de filtros
de esta tarea.

## 3. Mapa hallazgo → criterio WCAG 2.2

| Hallazgo | Criterio | Nivel | Dónde se corrigió |
| -------- | -------- | ----- | ------------------ |
| Anillo de foco suprimido | 2.4.7 *Focus Visible* | AA | `PropertyList.css` (`.hsearch__bar:focus-within`, `.hprops__sort-select:focus-visible`) |
| Contador sin región viva | 4.1.3 *Status Messages* | AA | `PropertyList.tsx` (`.hprops__subtitle`) |
| Checkboxes sin `id`/`htmlFor` | 1.3.1 *Info and Relationships* (A), 4.1.2 *Name, Role, Value* (A) | A | `FilterSidebar.tsx` (`useId`, `htmlFor`) |
| Sliders sin `aria-valuetext` | 4.1.2 *Name, Role, Value* | A | `FilterSidebar.tsx` |
| Toggles con rótulo ambiguo | 2.4.4 *Link Purpose*, 4.1.2 *Name, Role, Value* | A | `FilterSidebar.tsx` (`METRAJE[].description`, nombre por botón de habitaciones) |
| `ToggleGroup` sin nombre de grupo | 4.1.2 *Name, Role, Value* | A | **Fuera de alcance**, pendiente |

## 4. Verificación automática

**Suite nueva:** `frontend/src/components/properties/FilterSidebar.a11y.test.jsx` — 33 pruebas.

| Bloque | Qué cubre |
| ------ | --------- |
| Nombres accesibles de los toggles | Los 8 botones se localizan por nombre accesible; el texto visible se conserva; `aria-pressed` refleja la selección |
| Asociación explícita de etiquetas | `id` presente, `label[for]` apuntando al checkbox, ids distintos entre sí y el ícono decorativo (`aria-hidden`) fuera del nombre |
| Sliders de precio | `aria-valuemin`/`max`, `aria-valuenow`/`valuetext` con `S/.`, actualización al mover el slider y región viva del rango combinado |
| Agrupación con nombre | `role="group"` con `aria-label` en los tres grupos y el panel como región `complementary` con nombre |
| Teclado | Recorrido de los 17 controles en orden visual, **sin focus trap** (el foco sale del documento al terminar), recorrido inverso con `Shift+Tab`, activación con `Enter` y con `Espacio`, checkbox con `Espacio` y envío con `Enter` |

**Suite ampliada:** `PropertyList.test.jsx` — 6 pruebas nuevas en el bloque *Accesibilidad*:
región viva y atómica, anuncio del nuevo conteo al aplicar un filtro, anuncio en singular,
permanencia de la región al cambiar de página, nombre accesible del `searchbox` y del
`combobox` de orden, y nombre del grupo de vistas.

Resultado: `pnpm test` → **10 suites, 222/222** (183 previas + 39 nuevas).
`pnpm test:coverage` → 98.61% stmts / 95.54% branches / 99% funcs / 99.55% lines, con
`FilterSidebar.tsx`, `filters.ts` y `useFilterParams.ts` al 100% en las cuatro métricas.
`pnpm run lint` → 0 errores. `pnpm run build` → correcto.

## 5. Verificación manual (no automatizable)

Dos partes **no** se pueden comprobar desde Jest y las ejecuta una persona en el navegador.
AXE DevTools es una extensión de navegador: no es ejecutable desde el CLI ni integrable en
esta suite.

| # | Comprobación | Resultado esperado |
| - | ------------ | ----------------- |
| 1 | Enfocar el campo de búsqueda con `Tab`: anillo visible en la barra | `.hsearch__bar:focus-within` pinta `0 0 0 2px` |
| 2 | Enfocar el select de orden con `Tab`: anillo visible | `outline` + `box-shadow: var(--ring)` |
| 3 | Foco con clic de ratón en el select: sin anillo | `:focus-visible` no aplica |
| 4 | Con lector de pantalla, aplicar un filtro: se anuncia el nuevo conteo | "4 propiedades encontradas" |
| 5 | Con lector de pantalla, tabular por los dos sliders: se oye la moneda | "S/. 250,000" y no "250000" |
| 6 | Auditoría AXE DevTools sobre `/` en vista de escritorio y móvil | 0 violaciones A/AA |

> La comprobación 5 detecta una redundancia conocida: `.hfs__value` (el texto "S/. 200,000 –
> S/. 600,000") ya tenía `aria-live="polite"` antes de esta tarea, así que al mover un slider
> con las flechas se oyen dos anuncios. Se conserva la región viva a propósito, porque es lo
> único que avisa del reajuste del rango cuando el usuario pulsa un toggle en lugar de mover
> un slider. Ajustar uno de los dos anuncios es una decisión de diseño pendiente.

## 6. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| Checkboxes con `id` y `htmlFor` explícitos | Automático (suite a11y) |
| Sliders con `aria-valuetext` formateado | Automático (suite a11y) |
| Toggles de metraje y habitaciones con nombre accesible no ambiguo | Automático (suite a11y) |
| Contador de resultados en región viva atómica | Automático (suite a11y) |
| Indicador de foco en búsqueda y en select de orden | **Manual** — anillo de foco CSS, ver §5 |
| Orden de tabulación y ausencia de focus trap | Automático (suite a11y) |
| Sin violaciones nuevas en la suite existente | Automático (183/183 previas siguen en verde) |
| Auditoría AXE DevTools sin violaciones A/AA | **Manual** — la ejecuta la persona, ver §5 |
| Corrección de la afirmación falsa de `docs/08` | Hecho (§2.2) |

## 7. Referencias

* `docs/08_TASK_A11Y_PROP_02.md` — auditoría de accesibilidad previa (catálogo y paginación).
* `docs/11_TASK_UI_PROP_03.md` — diseño UX/UI del panel de filtros (HU-PROP-03).
* `docs/12_Pruebas_Automatizadas.md` — inventario consolidado de suites.
* `docs/14_TASK_TEST_PROP_03.md` — pruebas de filtros y URL parsing (TASK-TEST-PROP-03).
* WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
