# Sprint Planning — Sprint 2 (APF1 Final)

**Proyecto:** HouseBroker Perú  
**Fechas del Sprint:** Semanas 5 a 6  
**Scrum Master:** Brandy Sinche  
**Objetivo del Sprint (Sprint Goal):** Desarrollar e integrar la consulta del catálogo de propiedades con paginación y búsqueda avanzada mediante filtros dinámicos en React, utilizando Mocks de datos y cumpliendo con estándares de accesibilidad y pruebas automatizadas para la entrega del APF1.

---

## 1. Capacidad y Velocidad Estimada
* **Miembros del equipo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes.
* **Capacidad total:** 80 horas de trabajo efectivo.
* **Compromiso de Historias de Usuario:** 21 Puntos de Historia (`HU-PROP-02` y `HU-PROP-03`).

---

## 2. Alcance del Sprint Backlog

### HU-PROP-02 — Consultar catálogo de propiedades (13 Puntos)
| ID Tarea | Descripción Técnica | Asignado | Est. (h) |
| :--- | :--- | :--- | :---: |
| `TASK-ARC-PROP-02` | Especificar contrato API REST para paginación y catálogo | Brandy Sinche | 6 |
| `TASK-UI-PROP-02` | Diseñar prototipo interactivo en Figma del catálogo y detalle | Jhon Ordoñez | 10 |
| `TASK-FRONT-PROP-02` | Implementar vista de catálogo y detalle en React | Yohan Ñato | 16 |
| `TASK-MOCK-PROP-02` | Implementar servicio Mock para simulación de paginación | Brandy Sinche | 8 |
| `TASK-TEST-PROP-02` | Implementar pruebas unitarias de renderizado en Jest | Anderson Villanes | 10 |
| `TASK-A11Y-PROP-02` | Aplicar etiquetas ARIA y navegación por teclado (WCAG 2.2 AA) | Jhon Ordoñez | 6 |
| `TASK-WPO-PROP-02` | Optimizar carga perezosa de imágenes mediante React.lazy y Suspense | Anderson Villanes | 6 |

### HU-PROP-03 — Buscar propiedades mediante filtros (8 Puntos)
| ID Tarea | Descripción Técnica | Asignado | Est. (h) |
| :--- | :--- | :--- | :---: |
| `TASK-ARC-PROP-03` | Especificar contrato API REST para parámetros de búsqueda | Brandy Sinche | 4 |
| `TASK-UI-PROP-03` | Diseñar panel de filtros reactivo en Figma | Jhon Ordoñez | 6 |
| `TASK-FRONT-PROP-03` | Implementar lógica de filtrado dinámico y combinación en React | Yohan Ñato | 12 |
| `TASK-MOCK-PROP-03` | Implementar servicio Mock para respuestas de búsqueda filtrada | Brandy Sinche | 6 |
| `TASK-TEST-PROP-03` | Implementar pruebas unitarias para combinación de filtros en Jest | Anderson Villanes | 8 |
| `TASK-A11Y-PROP-03` | Aplicar accesibilidad en formularios de filtro, inputs y sliders | Jhon Ordoñez | 4 |
| `TASK-WPO-PROP-03` | Aplicar debounce en inputs de búsqueda para optimizar rendimiento | Anderson Villanes | 4 |

---

## 3. Definición de Listo (DoR)
* Especificación OpenAPI v1.1 lista con los endpoints de consulta `/api/v1/properties` y sus parámetros `page`, `limit` y query params de filtrado.
* Prototipos Figma aprobados para versión desktop y mobile del catálogo.

---

## 4. Definición de Terminado (DoD)
* Código integrado en `main` mediante Pull Request aprobado.
* Paginación y filtros dinámicos funcionando en la interfaz de React con datos de Mocks.
* Pruebas unitarias de ambos componentes ejecutándose correctamente en Jest.
* Auditoría de accesibilidad WCAG 2.2 aprobada en AXE DevTools.