# Laboratorio 04 — Métricas de rendimiento (SLI / SLO) y optimización del Front-End

**Curso:** Proyecto Integrador 2
**Proyecto:** HouseBroker Perú
**Autor:** Jhon Ordonez
**Rol:** Scrum Master / Lead Engineering / Documentación
**Fecha de elaboración:** 07/09/2026
**Sprint:** Sprint 2 (Semanas 5–6, APF1)
**Historia de Usuario de referencia:** HU-PROP-02 — "Como usuario, quiero visualizar el catálogo de propiedades con fotos y estado del aviso para poder escoger las propiedades que mejor se ajusten a mis necesidades."
**Framework Front-End:** React 19 + TypeScript (Vite). *(Guía del laboratorio adaptada de Angular a React, según el stack del proyecto.)*
**Estado general del laboratorio:** Planificación de SLI/SLO, medición de línea base (bundle) y propuesta de optimización **sin implementar código en Front-End ni Back-End**.

---

## 1. Línea base

- **Servicio a medir:** Catálogo de propiedades (HU-PROP-02).
- **Contexto:** El catálogo es la pantalla principal por la que el usuario entra a la plataforma (Recorrido Crítico A desplegado). Su rendimiento define la primera impresión del producto.
- **Línea base actual (real, medida el 07/09/2026):**
  El Front-End aún se encuentra en estado de scaffold (plantilla Vite + React sin incremento desarrollado). Se ejecutó `npm run build` para registrar el tamaño del bundle base que servirá de "antes". Estas cifras **sí son reales** y quedan como evidencia:

  | Recurso | Tamaño | Gzip |
  |---|---|---|
  | `index.html` | 0.45 kB | 0.29 kB |
  | `index.css` | 4.10 kB | 1.47 kB |
  | `index.js` | 193.28 kB | 60.63 kB |
  | `hero.png` | 13.05 kB | – |
  | `react.svg` | 4.12 kB | 2.06 kB |
  | `vite.svg` | 8.70 kB | 1.60 kB |

- **Tiempo de build:** `✓ built in 78ms` (sobre caché) y `315ms` (primera ejecución). Nota: el tiempo de build **no** es una métrica de rendimiento para el usuario final; se documenta como referencia operativa.
- **Pendiente:** Medición con Lighthouse (sección 10), medición de latencia/tasa de error en Back-End y mediciones post-optimización (sección 15).

---

## 2. Servicio y recorrido crítico

**Recorrido Crítico A (seleccionado):** Landing → Catálogo → Detalle de propiedad.

| Paso | Pantalla/acción | Dependencia | RNF asociado |
|------|-----------------|-------------|--------------|
| 1 | Landing (hero + CTA "Ver propiedades") | Render React | RNF-01 (Toda la plataforma no mostrará errores 404 internos al usuario) |
| 2 | `GET /api/v1/properties/` → grilla de propiedades con fotos | Back-End + PostgreSQL | RNF-02 (el sistema debe responder en un tiempo máximo de 2.0 segundos), RNF-03 (99.5% de disponibilidad) |
| 3 | Clic en propiedad → detalle con estado del aviso | React Router + SDG | RNF-02 |

**Justificación de selección:** Es el recorrido que ejecuta el cliente al llegar a HouseBroker Perú; su degradación impacta directamente el KPI de negocio (marzo inicial a intención de contacto).

---

## 3. KPI de negocio

| KPI | Definición | Instrumento de medición | Meta académica |
|-----|------------|--------------------------|----------------|
| Tasa de conversión a intención de contacto | % de visitas al catálogo que terminan en "solicitar contacto" o "agendar visita" | Google Analytics / eventos de BD | >= 2.0% |
| Tiempo medio de visita al catálogo | Duración de la sesión en el flujo HU-PROP-02 | Google Analytics | >= 2 min |

**Relación con el rendimiento:** si LCP y la latencia de la API degradan, la tasa de conversión cae; el SLO técnico protege al KPI de negocio.

---

## 4. SLI técnicos (2–4)

| # | SLI | Descripción corta | Rol |
|----|-----|--------------------|-----|
| SLI-1 | **Latencia de catálogo** | Tiempo de respuesta de `GET /api/v1/properties/` (y render de la grilla) | Rapidez del recorrido crítico |
| SLI-2 | **Disponibilidad del servicio** | Fracción de peticiones al catálogo que responden correctamente | Confiabilidad |
| SLI-3 | **Tasa de error (Back-End)** | Proporción de respuestas de error HTTP 4xx/5xx sobre el total | Robustez |
| SLI-4 | **Estabilidad visual (CLS)** | Proporción de cargas del catálogo con Layout Shift aceptable | Calidad percibida al renderizar imágenes |

---

## 5. Fichas de medición

### SLI-1 — Latencia de catálogo
| Campo | Valor |
|---|---|
| Fórmula | `SLI = p50 / p95 / p99 de (tiempo de respuesta de GET /api/v1/properties/)` |
| Numerador | Suma de tiempos (para percentiles) |
| Denominador | Total de peticiones exitosas |
| Fuente de medición | Back-End: tiempos en DRF/Django (middleware de logging) + Lado cliente: `performance.now()` |
| Ventana de medición | 30 días calendario (ventana de diagnóstico) |
| Responsable | Jhon Ordoñez (Back-End), Jhon Ordonez (Doc) |

### SLI-2 — Disponibilidad del catálogo
| Campo | Valor |
|---|---|
| Fórmula | `SLI = peticiones válidas exitosas / peticiones totales` |
| Numerador | Peticiones 2xx/3xx |
| Denominador | Total de peticiones al endpoint |
| Fuente | Logs del Back-End + Health-check (`/api/health/`) |
| Ventana | 30 días |
| Responsable | Jhon Ordoñez |

### SLI-3 — Tasa de error
| Campo | Valor |
|---|---|
| Fórmula | `SLI = peticiones con error (4xx+5xx) / peticiones totales` |
| Numerador | Peticiones 4xx/5xx |
| Denominador | Total de peticiones |
| Fuente | Logs DRF (Sentry/estructura de logs) |
| Ventana | 30 días |
| Responsable | Jhon Ordoñez |

### SLI-4 — Estabilidad visual (CLS)
| Campo | Valor |
|---|---|
| Fórmula | `SLI = cargas con CLS <= 0.10 / cargas totales` |
| Numerador | Cargas estables |
| Denominador | Total de cargas medidas |
| Fuente | Lighthouse / CruX (Web Vitals) |
| Ventana | Análisis por muestra (no medido aún) |
| Responsable | Yohan Ñato (Front-End) |

---

## 6. SLO (provisionales)

> **Nota:** Los SLO se declaran **provisionales**. Se ajustarán una vez se obtengan datos reales del SLI tras la implementación. Se apoyan en los RNF del SRS (RNF-02: respuesta <= 2.0 s; RNF-03: 99.5% de disponibilidad).

| SLI | SLO provisional | Basado en |
|-----|-----------------|-----------|
| SLI-1 Latencia | `p95 <= 2.0 s` (catálogo) | RNF-02 |
| SLI-2 Disponibilidad | `>= 99.5%` | RNF-03 |
| SLI-3 Tasa de error | `< 0.5%` de peticiones | Buenas prácticas |
| SLI-4 CLS | `>= 98% de cargas con CLS <= 0.10` *(pendiente validar con datos)* | Web Vitals |

---

## 7. Presupuesto de error (Error Budget)

**Fórmula:** `Error Budget = 100% − SLO`

| SLO | Error Budget | Tiempo/mes (30 días) |
|-----|--------------|----------------------|
| 99.5% disponibilidad | 0.5% | 3.6 horas/mes de indisponibilidad tolerada |
| 99.0% latencia p95 2.0 s | (frente al 100%) | Se mide como % de peticiones fuera de rango |

**Regla de gestión:** si el consumo de presupuesto supera el 70% en los primeros 20 días del mes, el equipo detiene funciones nuevas del Sprint y prioriza la mejora de rendimiento (TASK-WPO-PROP-*) hasta recuperar margen.

---

## 8. Propuesta académica de SLA

> SLA = compromiso contractual. En ámbito académico se documenta como propuesta del entregable APF1.

| Servicio | SLA propuesto |
|---|---|
| Disponibilidad del portal (horario de sustentación/demo) | 99.0% en horas de evaluación |
| Tiempo de respuesta API catálogo | p95 <= 2.0 s |
| Ventana de soporte | Semanas 5 a 16 del cronograma |
| Penalización académica (no monetaria) | Pérdida de 10% de la nota de Release en cada incumplimiento |
| Responsable de reporte | Jhon Ordonez (Scrum Master) cada Retrospectiva |

---

## 9. Riesgos de rendimiento

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| 1 | Bundle de JS crezca con el catálogo (imágenes/SDKs) | Media | Alto | Code splitting + `React.lazy` por ruta |
| 2 | LCP alto por imágenes de propiedades sin lazy loading ni optimización | Media | Alto | `loading="lazy"` + propuestas WPO-PROP-02 |
| 3 | Consulta de catálogo lenta por JOINs/índices en BD | Media | Medio | Índices en `properties` + paginación DRF (PAGE_SIZE=10) |
| 4 | CLS por imágenes sin dimensiones (aspect-ratio) | Media | Medio | Atributos `width/height` + reserva de espacio |
| 5 | Sin alertas tempranas (no hay monitoreo continuo) | Alta | Medio | Instrumentación con `performance.now()` y logs |

---

## 10. Línea base con Lighthouse

| Métrica | Umbral recomendado | Valor obtenido | Estado |
|---------|--------------------|----------------|--------|
| LCP (Largest Contentful Paint) | <= 2.5 s | — | **Pendiente de medición** |
| CLS (Cumulative Layout Shift) | <= 0.10 | — | **Pendiente de medición** |
| TBT (Total Blocking Time) | <= 200 ms | — | **Pendiente de medición** |
| FCP (First Contentful Paint) | <= 1.8 s | — | **Pendiente de medición** |
| SI (Speed Index) | <= 3.4 s | — | **Pendiente de medición** |
| Puntuación Performance | — | — | **Pendiente de medición** |

> **Evidencia real disponible:** salida de `npm run build` (bundle de la sección 1). Screenshot de Lighthouse se adjuntará como evidencia al ejecutarlo (pendiente).

---

## 11. Hipótesis técnica

Formato: *Si aplicamos X, entonces Y mejorará, porque Z.*

| # | Hipótesis |
|---|-----------|
| H-1 | **Si** aplicamos `React.lazy` + `Suspense` al enrutado del catálogo (carga diferida de la grilla), **entonces** el LCP mejorará, **porque** se reduce el JavaScript inicial que el navegador debe parsear y ejecutar antes de pintar el hero. |
| H-2 | **Si** cargamos las imágenes de propiedades con `loading="lazy"` + `decoding="async"` y `aspect-ratio` definido, **entonces** el CLS mejorará y la latencia percibida de la grilla baja, **porque** el navegador no hará layout shift y descargará solo lo visible. |
| H-3 | **Si** paginamos y debounceamos las búsquedas del catálogo (TASK-WPO-PROP-03), **entonces** el p95 de `GET /api/v1/properties/` bajará, **porque** se reducen peticiones innecesarias al Back-End. |
| H-4 | **Si** limitamos el bundle con `import()` para las dependencias pesadas, **entonces** el TBT mejorará, **porque** se ejecuta menos código de forma síncrona en el hilo principal. |

---

## 12. Optimización propuesta para React (sin implementar)

> Estas tareas **no se han implementado** (no se tocó código de Front-End ni Back-End). Son la propuesta del laboratorio, trazable con el Sprint 2.

| Tarea | Descripción | Tickets |
|-------|-------------|---------|
| WPO-PROP-01 | Code splitting por rutas con `React.lazy` + `Suspense` | TASK-WPO-PROP-02 |
| WPO-PROP-02 | Carga diferida de imágenes (`loading="lazy"`, `decoding="async"`) y reserva de dimensión (`aspect-ratio`) | TASK-WPO-PROP-02 |
| WPO-PROP-03 | Debounce en los inputs de búsqueda/filtro del catálogo | TASK-WPO-PROP-03 |
| WPO-PROP-04 | Memoización de componentes de listado (`React.memo` en `PropertyCard`, memoizar callbacks) | TASK-WPO-PROP-02 |
| WPO-PROP-05 | `ReportWebVitals`/handler de métricas para registrar LCP/CLS en consola (solo instrumentación) | TASK-WPO-PROP-02 |

---

## 13. Instrumentación propuesta (performance.now)

No implementada aún. Snippet de referencia que se usará en el Front-End (REACT — equivalente solicitado al adaptar de Angular):

```ts
// utils/measure.ts (PROPUESTA — no implementada)
export function measureTiming(label: string): () => void {
  const start = performance.now();
  return () => {
    const ms = performance.now() - start;
    console.log(`[PERF] ${label}: ${ms.toFixed(2)} ms`);
    // Envío opcional a estructura de logs
    return ms;
  };
}

// Uso previsto en el catálogo (HU-PROP-02):
// const end = measureTiming('catalogo fetch-a-render');
// const data = await fetch('/api/v1/properties/');
// setPropiedades(data.results);
// end(); // se registra el tiempo fetch -> render de la grilla
```

Criterio de aceptación de la instrumentación: registrar el tiempo desde `fetch` hasta el render visible de la primera fila de propiedades, al menos una muestra cada 20 segundos de uso.

---

## 14. Pruebas

| # | Prueba | Tipo | Estado |
|---|--------|------|--------|
| 1 | Build de producción (`npm run build`) | Automática | **Ejecutada** (evidencia sección 1) |
| 2 | Corrección del scaffold (`manage.py check` en Back-End) | Automática | **Ejecutada** (Lab 2) |
| 3 | Auditoría Lighthouse (rendimiento, accesibilidad, SEO) | Manual/Automática | **Pendiente** |
| 4 | Simulación de red lenta (DevTools) al catálogo | Manual | **Pendiente** |
| 5 | Verificación de estabilidad visual (toggle CLS) | Manual | **Pendiente** |
| 6 | Monitoreo de logs Back-End (latencia/tasa de error) | Automática | **Pendiente** |

---

## 15. Medición antes / después

| Métrica | Antes (real) | Después | Diferencia | Variación % |
|---------|---------------|---------|------------|-------------|
| Bundle JS crudo | **193.28 kB** | Pendiente de medición | — | — |
| Bundle JS gzip | **60.63 kB** | Pendiente de medición | — | — |
| CSS | **4.10 kB (1.47 kB gzip)** | Pendiente de medición | — | — |
| LCP | Pendiente de medición | Pendiente de medición | — | — |
| CLS | Pendiente de medición | Pendiente de medición | — | — |
| TBT | Pendiente de medición | Pendiente de medición | — | — |
| p95 latencia API | Pendiente de medición | Pendiente de medición | — | — |
| Tasa de error | Pendiente de medición | Pendiente de medición | — | — |

> Compromiso: los datos "Pendiente" se completan al ejecutar la auditoría y tras implementar TASK-WPO-PROP-02/03, respetando la regla de no inventar métricas.

---

## 16. Conclusión

1. La base del proyecto quedó preparada para medir: el bundle del scaffold es la línea base real (JS único de ~193 kB crudo / 60.6 kB gzip) y el Back-End expone `/api/health/`.
2. Se definieron 4 SLI (latencia, disponibilidad, tasa de error, CLS) con SLO **provisionales**, alineados a los RNF-02/RNF-03 del proyecto.
3. Las optimizaciones propuestas (React.lazy/Suspense, imágenes lazy, debounce, memoización) **no se implementaron** — se documentan como parte del Sprint 2.
4. El laboratorio queda ejecutable: próximos pasos son correr Lighthouse y completar la tabla antes/después con datos reales.

---

## 17. Riesgos residuales

| # | Riesgo residual | Nivel aceptado | Plan de contingencia |
|---|-----------------|----------------|----------------------|
| 1 | SLO provisional sin validación de datos reales | Aceptado (bajo) | Recalibrar en Retrospectiva del Sprint 2 |
| 2 | Lighthouse requiere navegador Chrome instalado/estable | Aceptado | Ejecutar en la máquina de Yohan (Front-End) |
| 3 | El bundle crecerá al implementar el catálogo real antes de poder optimizarlo | Aceptado | Mantener registro baseline; aplicar WPO-PROP-* en el mismo Sprint |
| 4 | No hay monitoreo 24/7 en el entorno académico | Aceptado | Medición por ventanas de evaluación |

---

## 18. PR y evidencias

- **Pull Request previsto:** rama `feature/WPO-catalogo-rendimiento` sobre `develop` (aún **no creada**, no se toca git).
- **Evidencia 1 (real):** registro del build de producción (sección 1) — carpeta `dist/` generada por Vite.
- **Evidencia 2 (pendiente):** screenshot de Lighthouse con LCP/CLS/TBT (sección 10).
- **Evidencia 3 (pendiente):** captura de red de DevTools mostrando tiempos del `GET /api/v1/properties/`.
- **Ubicación de evidencias:** `Laboratorios/Laboratorio_04/Brandy_Sinche/evidencias/` (por asociar al crear la carpeta).

---

*Registro de ejecución: 07/09/2026 — Sin implementación de código en Front-End ni en Back-End para este laboratorio; solo se documentó la línea base con el build existente.*
