# [TASK-A11Y-PROP-04] Accesibilidad de disponibilidad: switches, teclado, aria-live y auditoría AXE

**Issue:** #88
**Alcance:** `PropertyStatusSelector`, `ScheduleManager` (`frontend/src/components/availability`)
**Criterio de referencia:** WCAG 2.2 / WAI-ARIA APG, Nivel A y AA

---

## 1. Objetivo

Cerrar los 4 entregables del issue: switches con estado accesible, navegación
por teclado en selectores de fecha/hora, regiones `aria-live` para resultados,
y auditoría AXE con 0 violaciones de nivel A y AA.

## 2. Implementación por punto

### 2.1 Punto 1 — Switches de propiedad con `role="switch"` y `aria-checked`

Verificado en `ScheduleManager.tsx:199-209`: cada checkbox de día declara
`role="switch"`, `type="checkbox"`, `checked={slots.length > 0}` y
`aria-checked={slots.length > 0}`, consistentes entre sí en todo momento.
El foco se conserva al alternar con Espacio (cubierto por
`ScheduleManager.a11y.test.jsx`).

### 2.2 Decisión radiogroup vs switch en `PropertyStatusSelector`

**No** se migró el selector de estados a `role="switch"`. Un switch es un
toggle binario (on/off); el estado operativo de una propiedad es un enum
mutuamente excluyente de 5 valores (`Disponible`, `Reservado`, `Alquilado`,
`Vendido`, `Suspendido`). El patrón ARIA correcto es el radiogroup del
WAI-ARIA APG: `role="radiogroup"` + `role="radio"` con roving tabindex,
flechas circulares y `aria-checked`. Documentado como comentario JSDoc en
`PropertyStatusSelector.tsx:26-46`.

### 2.3 Punto 2 — Navegación por teclado en selectores de fecha/hora

Los únicos selectores de hora del área de disponibilidad son los
`input[type="time"]` de `ScheduleManager`. Ya están recorridos en orden por
Tab y editables por teclado en `ScheduleManager.a11y.test.jsx`
(tests de foco, orden y errores descritos). jsdom no implementa la edición
nativa por segmentos del `input[type=time]`, por lo que la suite asigna
valores con `fireEvent.change` (documentado en `ScheduleManager.test.jsx:44`).
Gap restante no automatizable en jsdom: edición por segmentos del nativo.

### 2.4 Punto 3 — Regiones aria-live

Cubierto por ambas suites `.a11y.test.jsx`:

* `ScheduleManager.tsx:317-321`: resumen de la semana con `aria-live="polite"`
  `aria-atomic="true"`; `:329-331`: feedback de guardado/error con
  `role="status"` `aria-live` `aria-atomic`.
* `PropertyStatusSelector.tsx:205-207`: feedback equivalente con
  `role="status"` `aria-live` `aria-atomic`.

Los tests `it.each([true, false])` de ambas suites (`anuncia el guardado o el
rechazo conservando el borrador` y `anuncia la respuesta del guardado por
teclado`) ya anuncian éxito y error tras guardar, por lo que no fue necesario
añadir tests nuevos.

### 2.5 Punto 4 — Auditoría AXE DevTools

* Instalados `jest-axe@11.0.0` y `axe-core@4.14.0` como devDependencies.
* Nuevo archivo `frontend/src/components/availability/axe.a11y.test.jsx`:
  ejecuta `axe()` (vía `jest-axe`) sobre `PropertyStatusSelector`
  (estado `DISPONIBLE`) y `ScheduleManager` (con una semana real con un
  slot de LUNES) montados en jsdom, con mocks de
  `../../services/availability` igual que en las suites existentes.
* Reglas desactivadas explícitamente en config: `color-contrast`
  (jsdom no calcula layout ni contraste real). Documentado en el propio
  archivo de test.

Resultado: **2 tests AXE pasan** — 0 violaciones A/AA reportadas.

## 3. Comandos y resultados

```
cd frontend
npm install -D jest-axe axe-core
npx jest --testPathPatterns "a11y|axe"   # 4 suites, 52 tests, OK
npx jest src/components/availability     # 7 suites, 99 tests, OK
npm run lint                             # OK (1 warning preexistente en FilterSidebar)
```

## 4. Limitaciones: jsdom vs lector de pantalla real

* AXE en jsdom valida el árbol ARIA, nombres accesibles, roles y atributos,
  pero **no** el orden de tabulación percibido, el contraste visual, ni la
  experiencia auditiva con NVDA/JAWS/VoiceOver.
* `input[type=time]`: jsdom no implementa el control segmentado nativo; los
  tests anotan el valor con `fireEvent.change`. La navegación por segmentos
  del nativo del navegador queda fuera de cobertura automatizada.
* Las regiones `aria-live` se verifican por atributos y contenido, no por el
  anuncio real del lector de pantalla.
* Recomendado como complemento: auditoría manual con VoiceOver/NVDA sobre el
  flujo completo de agendar visita y cambiar estado.
