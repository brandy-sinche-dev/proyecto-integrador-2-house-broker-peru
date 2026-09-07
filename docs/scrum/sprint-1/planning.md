# Sprint Planning — Sprint 1 (APF1)

**Proyecto:** HouseBroker Perú  
**Fechas del Sprint:** Semanas 3 a 4  
**Scrum Master:** Brandy Sinche  
**Objetivo del Sprint (Sprint Goal):** Entregar el primer incremento funcional de la plataforma permitiendo la creación, edición y visualización pormenorizada de propiedades mediante un flujo interactivo en React validado por pruebas unitarias, accesibilidad WCAG y datos simulados vía Mocks.

---

## 1. Capacidad y Velocidad Estimada
* **Miembros del equipo:** 4 desarrolladores.
* **Capacidad total:** 80 horas de trabajo efectivo.
* **Compromiso de Historia de Usuario:** 13 Puntos de Historia (HU-PROP-01).

---

## 2. Alcance del Sprint Backlog

### HU-PROP-01 — Registrar y editar propiedades (13 Puntos)

| ID Tarea | Descripción Técnica | Asignado | Puntos | Est. (h) |
| :--- | :--- | :--- | :---: | :---: |
| `TASK-ARC-PROP-01` | Especificar esquema inicial de Propiedades en Swagger y ERD v1.0 | Dev 1 | 1 | 8 |
| `TASK-UI-PROP-01` | Diseñar prototipo interactivo en Figma con los 5 estados de UI | Dev 2 | 2 | 12 |
| `TASK-FRONT-PROP-01` | Implementar formulario y listado en React (Components y Hooks) | Dev 3 | 3 | 20 |
| `TASK-MOCK-PROP-01` | Implementar Axios Mock Adapter para simular respuestas de API REST | Dev 1 | 2 | 10 |
| `TASK-TEST-PROP-01` | Implementar pruebas unitarias del formulario en Jest y React Testing Library | Dev 4 | 2 | 12 |
| `TASK-A11Y-PROP-01` | Aplicar accesibilidad WCAG 2.2 AA (atributos aria-* y navegación por teclado) | Dev 2 | 2 | 10 |
| `TASK-WPO-PROP-01` | Optimizar rendimiento mediante React.lazy() y Suspense | Dev 4 | 1 | 8 |

---

## 3. Definición de Listo (Definition of Ready - DoR)
* Criterios de aceptación de la `HU-PROP-01` claramente definidos.
* Mocks de datos estructurados según el contrato API acordado.
* Entorno de React y Jest configurado en el repositorio base.

---

## 4. Definición de Terminado (Definition of Done - DoD)
* Código integrado en la rama `main` mediante Pull Request revisado por al menos 1 pares.
* Prototipo en Figma validado y alineado con la interfaz React.
* Pruebas unitarias ejecutándose al 100% en Jest.
* Cumplimiento de criterios WCAG 2.2 AA verificado mediante AXE DevTools.