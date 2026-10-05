# Evidencia — TASK-WPO-PROP-03 (Anderson Villanes)

Debounce de 300 ms en la búsqueda por texto del catálogo de propiedades
(Sprint 2 · HU-PROP-03 · WPO-PROP-03).

## Contenido

| Archivo | Descripción |
| ------- | ----------- |
| `2026-10-05_pruebas-debounce-detalle.txt` | Las 48 pruebas de las dos suites que cubren el debounce, una por línea con su estado (`OK`). Es la evidencia principal: incluye las 9 de integración `Búsqueda con debounce`. |
| `2026-10-05_pruebas-debounce-verbose.txt` | Salida de `jest` de esas mismas dos suites. |
| `2026-10-05_pruebas-cobertura.txt` | `pnpm test:coverage --ci` completo (11 suites / 239 pruebas) con la tabla de cobertura. |
| `2026-10-05_lint.txt` | `pnpm run lint` (oxlint). |
| `2026-10-05_build.txt` | `pnpm run build` (`tsc -b && vite build`). |

## Comandos ejecutados

```bash
cd frontend
pnpm exec jest src/hooks/useDebounce.test.jsx src/components/properties/PropertyList.test.jsx --verbose
pnpm test:coverage --ci
pnpm run lint
pnpm run build
```

## Resultados

* **11 suites / 239 pruebas en verde**; cobertura 98.78 % statements / 95.70 %
  branches (umbral 80 %). `useDebounce.ts` y `useFilterParams.ts` al 100 %.
* Lint sin errores (solo la advertencia preexistente de `FilterSidebar.tsx`).
* Build de producción en verde.

### Comprobación del comportamiento

Búsqueda de `miraflores` (10 caracteres), según las pruebas de integración:

| Evento | Antes | Después |
| ------ | ---: | ------: |
| Escrituras en la URL | 10 | **1** (`?q=miraflores`) |
| Peticiones `GET /v1/properties` | 1 | **1** |
| Caracteres visibles al instante en el input | 10 | **10** |

Pruebas que lo fijan:

* `escribe la búsqueda una sola vez y sin apilar historial` — cuenta las
  navegaciones reales de React Router y exige exactamente una.
* `no lanza una petición HTTP por carácter tipeado` — `mock.history.get` sigue
  con un único `GET` tras tipear y esperar el debounce.
* `no escribe en la URL ni refiltra mientras se escribe` — durante la escritura
  la URL sigue vacía y el input ya muestra el texto completo.
* `no resucita el término borrado cuando el debounce está pendiente` — borrar
  con el temporizador en vuelo no hace reaparecer el término.

> La búsqueda del catálogo es de cliente (`getProperties()` se llama una vez al
> montar), por lo que en Network no hay tráfico por pulsación que medir. El
> procedimiento manual para comprobarlo en DevTools está en
> `docs/16_TASK_WPO_PROP_03.md` §3.2.

Evidencia en texto; no se adjuntan capturas de pantalla del navegador porque la
verificación se hizo con reloj falso en Jest, que es determinista. El paso
manual queda descrito en el documento de la tarea.
