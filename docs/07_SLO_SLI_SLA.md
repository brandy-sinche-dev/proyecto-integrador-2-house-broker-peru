# 07 — SLI / SLO / SLA (Métricas de rendimiento del producto)

**Proyecto:** HouseBroker Perú
**Autor:** Brandy Sinche (Scrum Master / Lead Engineering / Documentación)
**Fecha de creación:** 07/09/2026
**Ámbito:** En este documento se consolida el acuerdo transversal de calidad del producto: indicadores de rendimiento, objetivos de servicio y compromisos académicos. No es un documento por Sprint; se referencia y ajusta desde cada planning.

---

## 1. Objetivo

Definir cómo se mide la calidad de servicio del sistema (SLI), qué niveles se comprometen (SLO) y qué promesa de servicio se entrega (SLA), de forma trazable con los Requerimientos No Funcionales del SRS:

- RNF-01: La plataforma no mostrará errores 404 internos.
- RNF-02: El sistema debe responder en un tiempo máximo de 2.0 segundos.
- RNF-03: 99.5% de disponibilidad del sistema.

---

## 2. SLI (Service Level Indicators) — Indicadores

Los SLI son los indicadores técnicos con los que se mide la calidad del servicio. Se definen como una proporción (bueno / total) o como percentiles de tiempo.

| # | SLI | Descripción | SLI asociado al recorrido crítico |
|---|-----|-------------|-----------------------------------|
| SLI-1 | Latencia de catálogo | Tiempo de respuesta del catálogo de propiedades (p50 / p95 / p99) | HU-PROP-02 (catálogo) |
| SLI-2 | Disponibilidad | Proporción de peticiones que responden correctamente | Todo el sistema |
| SLI-3 | Tasa de error | Proporción de respuestas HTTP 4xx/5xx sobre el total | Todo el sistema |
| SLI-4 | Estabilidad visual (CLS) | Proporción de cargas sin movimiento inesperado del layout | Front-End |

---

## 3. Fichas de medición de SLI

Cada SLI tiene una ficha con fómula, numerador, denominador, fuente, ventana y responsable.

> **Regla del proyecto:** cuando un SLI aún no se ha medido con datos reales, el valor se registra como *"Pendiente de medición"*. No se inventan métricas.

### FICHA SLI-01 — Latencia de catálogo

| Campo | Valor |
|---|---|
| Fórmula | `SLI = p50 / p95 / p99 del tiempo de respuesta de GET /api/v1/properties/` |
| Numerador | Suma de tiempos de respuesta (para percentiles) |
| Denominador | Total de peticiones exitosas |
| Fuente | Back-End: middleware/logging de DRF; Front-End: `performance.now()` |
| Ventana | 30 días calendario |
| Responsable | Jhon Ordoñez (Back-End) / Brandy Sinche (Doc) |
| Valor actual | Pendiente de medición |

### FICHA SLI-02 — Disponibilidad

| Campo | Valor |
|---|---|
| Fórmula | `SLI = peticiones exitosas (2xx/3xx) / peticiones totales` |
| Numerador | Peticiones con respuesta 2xx/3xx |
| Denominador | Total de peticiones recibidas |
| Fuente | Logs del Back-End + health check (`/api/health/`) |
| Ventana | 30 días calendario |
| Responsable | Jhon Ordoñez (Back-End) |
| Valor actual | Pendiente de medición |

### FICHA SLI-03 — Tasa de error

| Campo | Valor |
|---|---|
| Fórmula | `SLI = peticiones con error (4xx+5xx) / peticiones totales` |
| Numerador | Peticiones con respuesta 4xx/5xx |
| Denominador | Total de peticiones recibidas |
| Fuente | Logs de DRF / estructura de errores |
| Ventana | 30 días calendario |
| Responsable | Jhon Ordoñez (Back-End) |
| Valor actual | Pendiente de medición |

### FICHA SLI-04 — Estabilidad visual (CLS)

| Campo | Valor |
|---|---|
| Fórmula | `SLI = cargas con CLS <= 0.10 / cargas totales` |
| Numerador | Cargas sin layout shift significativo |
| Denominador | Total de cargas medidas |
| Fuente | Lighthouse / Core Web Vitals |
| Ventana | Por auditoría (muestra) |
| Responsable | Yohan Ñato (Front-End) |
| Valor actual | Pendiente de medición |

---

## 4. SLO (Service Level Objectives) — Objetivos

Los SLO son los niveles objetivos que el equipo se compromete a cumplir a partir de los SLI. Son **provisionales** hasta que existan datos reales y se reajustan en las retrospectivas.

| SLI | SLO provisional | Justificación |
|-----|-----------------|---------------|
| SLI-1 Latencia | p95 <= 2.0 s | RNF-02 |
| SLI-2 Disponibilidad | >= 99.5% | RNF-03 |
| SLI-3 Tasa de error | < 0.5% de peticiones | Buenas prácticas |
| SLI-4 CLS | >= 98% de cargas con CLS <= 0.10 | Core Web Vitals |

### 4.1 Presupuesto de error (Error Budget)

| SLO | Error Budget (100% − SLO) | Tiempo/mes (30 días) |
|-----|------------------------------|----------------------|
| 99.5% de disponibilidad | 0.5% | 3.6 horas/mes |

**Regla de gestión:** si el consumo del presupuesto de error supera el 70% antes del día 20 del mes, el equipo detiene el desarrollo de nuevas funciones del Sprint y prioriza la mejora de rendimiento.

---

## 5. SLA (Service Level Agreement) — Compromiso

En el contexto académico no existe un contrato comercial; el SLA se define como la propuesta de compromiso de servicio del entregable.

| Ítem | Compromiso propuesto |
|------|-----------------------|
| Disponibilidad | 99.0% en horas de sustentación/demo |
| Latencia de API (catálogo) | p95 <= 2.0 s |
| Tiempo de reparación de fallo | Dentro de la ventana de soporte del Sprint |
| Ventana de soporte | Semanas 5 a 16 del cronograma del proyecto |
| Penalización académica | Pérdida de 10% de la nota de Release por incumplimiento |
| Responsable de reporte | Brandy Sinche (Scrum Master) — cada Retrospectiva |

---

## 6. Ciclo de actualización

1. Al inicio de cada Sprint, el `planning.md` referencia este documento y registra cambios en SLO si aplica.
2. Al cerrar cada Sprint, en la retrospectiva se comparan SLI medidos vs. SLO comprometidos.
3. Si un SLO no se cumple, se priorizan tareas de rendimiento (categoría WPO).

---

## 7. Evidencias

| Evidencia | Estado | Ubicación |
|-----------|--------|-----------|
| Bundle de producción (build) | Real (07/09/2026) | `Laboratorios/Laboratorio_04/Brandy_Sinche/` |
| Auditoría Lighthouse (LCP/CLS/TBT) | Pendiente de medición | `Laboratorios/Laboratorio_04/Brandy_Sinche/evidencias/` |
| Logs/latencia de API | Pendiente de medición | — |

---

*Documento consolidado del proyecto. Origen del contenido: Laboratorio 4 (métricas de rendimiento). Fecha de creación: 07/09/2026.*