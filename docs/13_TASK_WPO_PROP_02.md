# [TASK-WPO-PROP-02] Optimización WPO del catálogo (lazy loading, code splitting y memoización)

## 1. Objetivo

Optimizar el rendimiento de carga del catálogo de propiedades aplicando las
técnicas definidas en el Laboratorio 04 (sección 12) y exigidas por el sprint:

* **WPO-PROP-01** — Code splitting por rutas con `React.lazy` + `Suspense`.
* **WPO-PROP-02** — Carga diferida de imágenes (`loading="lazy"`, `decoding="async"`) con reserva de dimensión (`aspect-ratio` / `width`-`height`).
* **WPO-PROP-04** — Memoización de componentes de listado (`React.memo`, callbacks estables).
* **WPO-PROP-05** — Instrumentación de Web Vitals (LCP/CLS) en consola.

Además se limita el bundle inicial excluyendo librerías que no se usan en producción
(`axios-mock-adapter` y los datos mock).

## 2. Cambios implementados

| Archivo | Cambio | Ticket |
| ------- | ------ | ------ |
| `src/components/properties/PropertyDetail.tsx` + `.css` | Nueva página de detalle de inmueble (ruta `/properties/:id`), cargada de forma diferida. Hero con `fetchPriority="high"`, esqueleto de carga y estados de error. | WPO-PROP-01 |
| `src/App.tsx` | `React.lazy` + `Suspense` para `PropertyList` y `PropertyDetail`; integración de `react-router-dom` (`Routes`/`Route` + `useNavigate`/`useLocation`). Callbacks `toggleSave`/`toggleVisit`/`navigate`/`openProperty` memoizados con `useCallback`. | WPO-PROP-01/04 |
| `src/components/properties/PropertyCard.tsx` | Envuelto en `React.memo`. Render condicional de imagen de portada (`images[]` del backend o `link_galeria`) con `loading="lazy"`, `decoding="async"`, `width`/`height`. Título accionable mediante `onOpen` para navegar al detalle. | WPO-PROP-01/02/04 |
| `src/components/properties/PropertyCard.css` | `.hpc__img` con `object-fit: cover` y contenedor de altura fija (evita CLS). `.hpc__title-btn`. | WPO-PROP-02 |
| `src/components/properties/PropertyList.tsx` | Nueva prop opcional `onOpen` conectada a cada tarjeta. | WPO-PROP-01 |
| `src/services/types.ts` | Tipo `PropertyImage` y campo opcional `images` en `Property`. | WPO-PROP-02 |
| `src/main.tsx` | Import dinámico de los mocks (no bloquea el primer render); `reportWebVitals()`. | WPO-PROP-05 |
| `src/utils/webVitals.ts` | Observadores de `largest-contentful-paint` y `layout-shift`; imprime LCP/CLS en consola. | WPO-PROP-05 |
| `vite.config.ts` | `manualChunks` (función) para separar `react-vendor` del código de la aplicación. | WPO-PROP-01 |
| `package.json` | `axios-mock-adapter` movido de `dependencies` a `devDependencies`. | Bundle |
| `jest.config.cjs` | `PropertyDetail.tsx` incluido en `collectCoverageFrom`; `testTimeout` global de 20 s para pruebas de interacción lentas. | Pruebas |

> La rama base de medición es `TASK-FRONT-PROP-02` (catálogo ya implementado); el
> trabajo WPO parte de ahí.

## 3. Resultado: bundle antes / después

La medición se realizó con `pnpm build` (`tsc -b && vite build`) sobre el mismo
proyecto, antes y después de los cambios.

| Recurso | Antes | Después |
| ------- | ----: | ------: |
| **JS inicial (entry + runtime + vendor)** | **353.22 kB / 116.73 kB gzip** | **238.47 kB / 76.85 kB gzip** |
| `index` (entry de la app) | incluido en lo anterior | 8.60 kB / 3.08 kB gzip |
| `react-vendor` (React + ReactDOM + React Router) | incluido | 229.16 kB / 73.35 kB gzip |
| Chunk catálogo (`PropertyList` + `axios` + `money`) | incluido | 73.33 kB / 25.73 kB gzip (diferido) |
| Chunk detalle (`PropertyDetail`) | — | 3.64 kB / 1.27 kB gzip (diferido) |
| Chunk mocks (`axios-mock-adapter` + fixtures) | **incluido en el inicial** | 66.44 kB / 23.73 kB gzip (diferido, solo demo) |

**Reducción del JS inicial: −114.75 kB crudos (−32.5 %) y −39.88 kB gzip (−34.2 %).**

Hallazgo principal: antes, `axios-mock-adapter` y las fixtures (≈66 kB / 23.7 kB
gzip) se empaquetaban en el bundle inicial pese a ser una dependencia de
desarrollo, porque `setupMocks` se importaba de forma estática. Ahora se cargan
bajo demanda y quedan totalmente fuera de la carga inicial de producción.

## 4. Resultado: Lighthouse (LCP / CLS)

Auditoría ejecutada con **Lighthouse 11.7.1** sobre `vite preview` (build de
producción), navegador headless **Microsoft Edge**, perfil móvil por defecto
(CPU 4× + red lenta simulada). Para poder renderizar el catálogo sin levantar el
backend se habilitó `VITE_ENABLE_MOCKS=true` (por eso la carga incluye el chunk de
mocks; en producción ese chunk no se descarga).

| Métrica | Resultado | Umbral (Lab 04) |
| ------- | --------: | ---------------- |
| FCP | 2.42 s | — |
| **LCP** | **3.26 s** | ≤ 2.5 s (no alcanzado bajo throttling móvil simulado) |
| **CLS** | **0.000** | ≤ 0.10 ✅ |
| TBT | 258 ms | — |
| Performance score | 84 | — |

El **CLS 0** confirma la hipótesis **H-2** del laboratorio: reservar dimensiones
(`width`/`height` en la imagen y altura fija `256px` en `.hpc__media`) elimina el
desplazamiento de layout. La medición con render bloqueado por mocks arrojaba
CLS 0.18; al no bloquear el primer render (import dinámico sin `await`) bajó a 0.

El **LCP** no cumple el objetivo provisional bajo throttling móvil; el mayor
consumidor es el arranque de React (~229 kB de `react-vendor`). Se documenta como
resultado honesto y queda como línea de mejora (SSR/prerender del shell).

## 5. Pruebas

* `pnpm test:coverage` → **6 suites / 83 pruebas en verde**.
* Cobertura global: **98.25 % sentencias / 94.34 % ramas** (umbral 80 %).
* `PropertyDetail.tsx`: 95.83 % sentencias / 90.24 % ramas.
* Nuevas pruebas: imagen lazy y `onOpen` en `PropertyCard.test.jsx`; suite completa
  `PropertyDetail.test.jsx` (datos, imagen, planos, error + reintento y volver).
* `pnpm run lint` → sin errores (solo una advertencia preexistente en `FilterSidebar.tsx`).
* `pnpm run build` → en verde.

## 6. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| `React.lazy` + `Suspense` por rutas | ✅ `PropertyList` y `PropertyDetail` diferidos |
| Imágenes con `loading="lazy"` + `decoding="async"` + dimensiones | ✅ `PropertyCard` / `PropertyDetail` |
| `React.memo` y callbacks memoizados | ✅ `PropertyCard` + `useCallback` en `App` |
| Instrumentación LCP/CLS | ✅ `utils/webVitals.ts` |
| Bundle inicial reducido | ✅ −32.5 % crudo / −34.2 % gzip |
| CLS ≤ 0.10 | ✅ 0.000 |
| Puebas ≥ 80 % | ✅ 98.25 % |
| `pnpm test` / `build` / `lint` en verde | ✅ |

## 7. Notas y trazabilidad

* Documento origen: `Laboratorios/Laboratorio_04/Brandy_Sinche/Laboratorio_04.md`
  (secciones 12, 13 y 15) — hipótesis H-1/H-2/H-4.
* Evidencia: `docs/scrum/sprint-2/evidencias/Anderson_Villanes/TASK-WPO-PROP-02/`.
* `TASK-WPO-PROP-03` (debounce) es una tarea independiente y no forma parte de este alcance.
