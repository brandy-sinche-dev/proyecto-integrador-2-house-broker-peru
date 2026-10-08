# [TASK-A11Y-PROP-05] Accesibilidad de favoritos

**Issue:** #109 · **Fecha:** 2026-10-07

**Alcance:** corazones de tarjetas y detalle, contador de Guardados, anuncios de estado y aviso de login.

## Entregables

| Entregable | Evidencia |
| --- | --- |
| `aria-pressed` dinámico | Ya estaba implementado en `FavoriteButton`; se verifica también con Enter y Espacio. |
| Etiquetas descriptivas | Se conservan `Guardar {título}` y `Quitar {título} de guardados`. |
| `aria-live="polite"` | Región única y persistente en `App`, con `role="status"` y `aria-atomic="true"`. |
| Auditoría AXE A/AA | Cero violaciones reportadas en los componentes y estados auditados; revisiones manuales detalladas abajo. |

## Cambios incrementales

- La región de favoritos permanece montada fuera de las tarjetas: anuncia guardado,
  eliminación, error y restauración del estado anterior, incluso al retirar la última
  tarjeta de Guardados. La carga inicial de favoritos permanece silenciosa.
- El resultado del favorito pendiente tras el login también se anuncia.
- `LoginPrompt` coloca el foco en **Iniciar sesión**, mantiene Tab y Shift+Tab dentro
  del diálogo, cierra con Escape y devuelve el foco al control que lo abrió si sigue
  presente. Los cambios de callbacks no reinician el foco.
- El corazón del detalle utiliza el mismo rojo de las tarjetas cuando está guardado.
  Las tarjetas tienen fondo blanco opaco en el botón para conservar el contraste
  sobre cualquier fotografía; su anillo de foco dispone de un fondo blanco.
- El botón de cierre del aviso mide como mínimo 32 × 32 px.

## Pruebas automatizadas

Desde `frontend`:

```sh
pnpm lint
pnpm test:coverage --ci
pnpm run build
```

Resultado: **24 suites / 413 tests correctos**. Cobertura del conjunto configurado
en Jest: **98,50 % de sentencias / 95,93 % de ramas**; `FavoriteButton` y
`LoginPrompt` tienen 100 % y ahora están incluidos explícitamente en ese conjunto.
Lint termina sin errores, con los cuatro avisos existentes de `AuthContext`,
`FilterSidebar` y los efectos de `App`. Build correcto.

- `FavoriteButton.a11y.test.jsx`: AXE en ambos estados, Enter/Espacio y ausencia de
  activación accidental de la tarjeta.
- `LoginPrompt.a11y.test.jsx`: AXE, nombre/descripción, foco inicial, recorrido
  circular, Escape, cancelación, cierre por fondo, restauración en StrictMode y
  callbacks actualizados.
- `App.test.jsx`: anuncios de éxito/error, carga silenciosa, eliminación desde
  Guardados, intento tras login y restitución del foco al corazón.

En JSDOM se desactiva solamente la regla de contraste, porque no calcula layout.
Las reglas se seleccionan por etiquetas WCAG A/AA, no por gravedad del hallazgo.

## Auditoría en navegador

Motor **axe-core 4.14.0**, Chromium **153.0.8010.12**, sobre la aplicación Vite
con su CSS real y respuestas de API controladas en un contexto de navegador
aislado. No se modifican favoritos del servidor durante esta auditoría.
Etiquetas: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`; contraste activo.

**Nueve estados, cero violaciones reportadas:** catálogo anónimo; aviso de login
a 1280, 375 y 320 px de ancho; tarjeta guardada y contador; detalle guardado y sin
guardar; Guardados vacío tras eliminar; error de guardado anunciado.
Se verifica además la interacción con teclado y la ausencia de errores JavaScript.

Mediciones mediante estilos computados, usando la fórmula de luminancia WCAG:

| Elemento | Contraste | Tamaño del control |
| --- | --- | --- |
| Corazón de tarjeta sin guardar, sobre blanco | 4,47:1 | 36 × 36 px |
| Corazón guardado, tarjeta / detalle | 6,46:1 | 36 × 36 / 36 × 34 px |
| Corazón del detalle sin guardar, sobre blanco | 6,44:1 | 36 × 34 px |
| Cierre del aviso, sobre crema | 5,70:1 | 32 × 32 px |
| Título del aviso, sobre crema | 14,77:1 | — |
| Descripción del aviso, sobre crema | 7,10:1 | — |

El detalle guardado tenía 1,65:1 antes del ajuste; el botón translúcido de la
tarjeta podía bajar a 2,79:1 sobre una fotografía negra.

### Resultados que AXE requiere revisar manualmente

- `color-contrast` del título/descripción del aviso: el motor no determina el
  fondo por la superposición del modal. Se comprobaron el fondo crema opaco,
  los estilos computados, las relaciones de contraste de la tabla y la vista
  renderizada de escritorio/móvil.
- `label-content-name-mismatch` del cierre: el contenido visible es el símbolo
  ×, no una etiqueta textual. Su nombre accesible es **Cerrar**, con el símbolo
  decorativo oculto a tecnologías de asistencia.

Para repetir la revisión con AXE DevTools, analizar los botones `.hpc__icon-btn`
o `.hpd__fav`, el contador `.hdr__count`, la región
`[role="status"][aria-label="Favoritos"]` y el diálogo `.lprompt__dialog`
en los estados indicados. Con teclado: activar el corazón con Enter/Espacio,
recorrer el aviso con Tab/Shift+Tab y cerrar con Escape.

La evidencia cubre estos componentes y estados. Los anuncios se verifican por
atributos y cambios del DOM; no se ha realizado una escucha con NVDA/VoiceOver.
