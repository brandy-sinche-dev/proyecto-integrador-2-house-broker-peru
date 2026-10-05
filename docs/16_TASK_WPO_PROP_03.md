# [TASK-WPO-PROP-03] Implementación de Debounce en la búsqueda por texto

**Parent Issue:** # HU-PROP-03 · **Assignee:** Anderson Villanes · **Est.:** 4 h
**Labels:** performance, optimization · **Sprint:** 2 (APF1 Final)

## 1. Objetivo

Reducir la sobrecarga generada por los eventos de tipeo de la barra de búsqueda
del catálogo. El input de búsqueda general era la única entrada de la pantalla
que escribía en la URL **en cada pulsación**: cada carácter disparaba una
navegación, un recálculo del filtrado del catálogo y una actualización de la
región viva del contador de resultados.

La solución es un hook `useDebounce` de 300 ms entre el input y la URL, de modo
que la búsqueda se publique una sola vez cuando el usuario deja de escribir.

## 2. Cambios implementados

| Archivo | Cambio |
| ------- | ------ |
| `src/hooks/useDebounce.ts` | **Nuevo.** Hook genérico `useDebounce<T>(value, delay = 300)`: devuelve el valor con `delay` ms de retraso, cancelando el temporizador en cada cambio (borde final, sin escrituras intermedias). |
| `src/components/properties/PropertyList.tsx` | Constante `SEARCH_DEBOUNCE_MS = 300`. El texto del input pasa a vivir en estado local (`query`, respuesta inmediata al teclear) y solo se publica en la URL mediante `useDebounce`. El filtrado, el chip de búsqueda y el reinicio de página leen el valor ya publicado (`urlQuery`). `clearSearch()` para el chip y "Limpiar". |
| `src/components/properties/useFilterParams.ts` | Expone `query` (leído de `?q=`) y `setQuery`. `applyFilters` pasa a partir de los parámetros actuales en vez de uno vacío para **conservar la búsqueda** al aplicar un filtro, y devuelve cada filtro a su valor por defecto con `delete`. |
| `src/hooks/useDebounce.test.jsx` | **Nuevo.** 8 pruebas unitarias del hook con temporizadores falsos. |
| `src/components/properties/PropertyList.test.jsx` | **Nuevo bloque** `Búsqueda con debounce`: 9 pruebas de integración con reloj falso. `permite eliminar cada chip de filtro activo` ahora espera al chip de búsqueda. |
| `jest.config.cjs` | `src/hooks/useDebounce.ts` en `collectCoverageFrom`. |

### 2.1 Por qué el input no puede leer de la URL

El campo es un `<input type="search">` **controlado**: necesita un valor por
pulsación. Si leyera de la URL, el texto recién escrito desaparecería del input
mientras se escribe, porque la URL todavía no lo tiene. De ahí la separación:

```
pulsación  ->  query (estado local, input inmediato)
                   |
                   |  useDebounce(300 ms)
                   v
             urlQuery (?q=)  ->  filtrado + chip + contador
```

Un `publishedQuery` (ref) distingue "la URL cambió porque lo escribimos" de
"la URL cambió desde fuera" (back/forward, *Limpiar*, *Limpiar filtros*, entrar
por un enlace con `?q=`). La comparación `query !== debouncedQuery` del efecto de
publicación es lo que **cancela las publicaciones obsoletas**: si la URL cambió
desde fuera, el debounce todavía va atrasado y no se escribe nada hasta que se
estabiliza. Sin esa guarda, borrar la búsqueda con el temporizador pendiente
resucitaba el término 300 ms después (cubierto por la prueba *"no resucita el
término borrado cuando el debounce está pendiente"*).

## 3. Resultado medido

Búsqueda de `"miraflores"` (10 caracteres) en el catálogo, medida sobre el
renderizado de `PropertyList`:

| Evento por pulsación | Antes | Después |
| -------------------- | ---: | ------: |
| Escrituras en la URL (`location.key`) | 10 | **1** |
| Recalculos del `useMemo` de `filtered` | 10 | **1** |
| Anuncios de la región viva (`aria-live`) | 10 | **1** |
| Peticiones `GET /v1/properties` | 1 | **1** |
| Caracteres que aparecen al instante en el input | 10 | **10** |

Las tres primeras filas están verificadas por la prueba
`escribe la búsqueda una sola vez y sin apilar historial`, que cuenta las
navegaciones reales de React Router y exige exactamente una
(`[['?q=miraflores']]`). La última fila es la garantía de que el debounce no
introduce latencia percibida al teclear.

### 3.1 Sobre la carga del servidor (hipótesis H-3 del Lab 04)

El enunciado de la tarea pide comprobar en Network que no se ejecuten
peticiones por carácter. **Comprobación honesta:** en esta versión del catálogo
la búsqueda **no genera peticiones HTTP** en absoluto —`getProperties()` se
llama una vez al montar y el filtrado es de cliente, `?q=` nunca viaja al
backend—, así que el p95 de `GET /v1/properties/` que predice H-3 no puede
medirse con esta tarea: la hipótesis queda **no verificable aquí**, no
"verificada". Lo que sí queda garantizado es que:

* el catálogo sigue sin recibir peticiones por pulsación, ahora con una prueba
  de regresión que lo fija (`no lanza una petición HTTP por carácter tipeado`);
* el día que la búsqueda se delegue al backend, el debounce ya está en el punto
  exacto de publicación, que es lo que habría que medir.

### 3.2 Procedimiento manual en Network (DevTools)

Como el filtrado es de cliente, la pestaña **Network** no muestra tráfico por
tepeado; la escritura por carácter se observa en la barra de direcciones y en
**Performance**:

1. `pnpm run dev` y abrir el catálogo.
2. Escribir `miraflores` despacio, carácter a carácter.
   * **Network → Fetch/XHR**: un único `GET /v1/properties` (solo la carga
     inicial), ninguno más.
   * **Barra de direcciones**: permanece sin `?q=` mientras se escribe; al
     detenerse 300 ms aparece una sola vez `?q=miraflores` (no hay entradas
     apiladas en el historial: es un `replace`).
   * **Performance**: un solo commit que repinta la grilla y actualiza el
     contador, no uno por pulsación.
3. Borrar con *Limpiar* y comprobar que la URL queda vacía y **no** reaparece
   `?q=` 300 ms después.

## 4. Pruebas

* `pnpm test:coverage --ci` → **11 suites / 239 pruebas en verde**.
* Cobertura global: **98.78 % Statements / 95.70 % Branch / 99.08 % Functions**
  (umbral 80 %). `useDebounce.ts` y `useFilterParams.ts` al **100 %**.
* `pnpm run lint` → sin errores (solo la advertencia preexistente de
  `FilterSidebar.tsx`, ya registrada en `docs/13_TASK_WPO_PROP_02.md`).
* `pnpm run build` → en verde.
* Pruebas nuevas del debounce: 8 del hook + 9 de integración (**48** en las dos
  suites que las contienen).

Detalle de las pruebas nuevas (`Búsqueda con debounce`):

1. `no escribe en la URL ni refiltra mientras se escribe`
2. `publica una sola vez el texto final al dejar de escribir 300 ms`
3. `reinicia el margen en cada pulsación aunque la búsqueda dure más de 300 ms`
4. `no lanza una petición HTTP por carácter tipeado`
5. `escribe la búsqueda una sola vez y sin apilar historial`
6. `muestra en el input la búsqueda que llega por la URL`
7. `no resucita el término borrado cuando el debounce está pendiente`
8. `quitar el chip de búsqueda vacía el input y la URL`
9. `conserva la búsqueda al aplicar un filtro del panel`

## 5. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| Hook `useDebounce` implementado y configurado a 300 ms | ✅ `src/hooks/useDebounce.ts`, `SEARCH_DEBOUNCE_MS = 300` |
| Input de búsqueda vinculado con publicación diferida en la URL | ✅ `useDebounce` + efecto de publicación en `PropertyList.tsx` |
| Sin peticiones ni escrituras por cada carácter tipeado | ✅ 1 escritura de URL y 1 petición HTTP por búsqueda (verificado en Jest; procedimiento manual en §3.2) |
| El input sigue respondiendo al instante | ✅ estado local, cubierto por la prueba 1 |
| Pruebas, lint y build en verde | ✅ 239 pruebas, sin errores |

## 6. Notas y trazabilidad

* Documento origen: `Laboratorios/Laboratorio_04/*/Laboratorio_04.md`
  (hipótesis **H-3**, ítem **WPO-PROP-03** de la tabla de optimizaciones).
* Historia: `docs/scrum/sprint-2/planning.md` (`TASK-WPO-PROP-03`).
* Evidencia: `docs/scrum/sprint-2/evidencias/Anderson_Villanes/TASK-WPO-PROP-03/`.
* Efecto colateral favorable: la región viva del contador (`TASK-A11Y-PROP-03`)
  pasa a anunciarse una vez por búsqueda en lugar de una vez por pulsación.
* Fuera de alcance: la búsqueda sigue siendo de cliente. Delegarla en el backend
  (y con ello poder medir H-3) requiere un endpoint con `?q=`; este ticket solo
  prepara el punto de publicación.
