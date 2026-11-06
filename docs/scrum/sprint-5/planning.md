# Sprint Planning — Sprint 5: Historial de Clientes, Observaciones y Chat en Tiempo Real

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 5 (Semanas 11–12)  
**Scrum Master:** Brandy Sinche  
**Equipo de Desarrollo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## Objetivo del Sprint (Sprint Goal)

> Implementar la ficha e historial consolidado del cliente y el módulo de registro de observaciones de atención para agentes en el CRM, junto con el sistema de chat en tiempo real entre cliente y agente mediante WebSockets, garantizando la integración Full-Stack, pruebas unitarias y cumplimiento del estándar de accesibilidad WCAG 2.2 AA.

---

## 1. Capacidad y Velocidad Estimada

- **Capacidad bruta:** 160 horas (4 desarrolladores × 20 h/semana × 2 semanas).
- **Capacidad efectiva:** 110 horas, considerando eventos Scrum, revisiones de PR y refactorización.
- **Story Points comprometidos:** 18 SP (`HU-CRM-03`: 5 SP | `HU-CRM-04`: 5 SP | `HU-SEC-03`: 8 SP).

---

## 2. Sprint Backlog

### [HU-CRM-03] Consultar ficha e historial del cliente (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-CRM-03` | Especificar contratos API REST OpenAPI 3.0 para `/api/v1/clients/{id}/profile` e historial de interacciones y citas. | Brandy Sinche | 3 | N/A |
| `TASK-UI-CRM-03` | Diseñar la interfaz de la ficha del cliente en Figma, incluyendo resumen de perfil, línea de tiempo (*timeline*) y propiedades de interés. | Jhon Ordoñez | 4 | N/A |
| `TASK-FRONT-CRM-03` | Implementar vista de ficha e historial del cliente en React consumiendo los endpoints del CRM. | Yohan Ñato | 8 | `TASK-ARC-CRM-03` |
| `TASK-BACK-CRM-03` | Desarrollar endpoints en Django REST Framework para consolidar datos de usuario, citas previas e inmuebles asociados al cliente. | Brandy Sinche | 6 | `TASK-ARC-CRM-03` |
| `TASK-TEST-CRM-03` | Implementar pruebas unitarias e integración en Jest / React Testing Library para el renderizado del historial del cliente. | Anderson Villanes | 4 | `TASK-FRONT-CRM-03` |
| `TASK-A11Y-CRM-03` | Garantizar accesibilidad en la línea de tiempo y componentes de la ficha mediante etiquetas semánticas y lectura clara para lectores de pantalla. | Jhon Ordoñez | 3 | `TASK-FRONT-CRM-03` |
| `TASK-WPO-CRM-03` | Implementar paginación o carga diferida en la lista de interacciones históricas para optimizar el rendimiento de la vista. | Anderson Villanes | 3 | `TASK-FRONT-CRM-03` |

---

### [HU-CRM-04] Registrar observaciones de atención (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-CRM-04` | Diseñar contrato API REST para `/api/v1/clients/{id}/notes` (`GET`, `POST`, `DELETE`) para el registro de notas de seguimiento. | Brandy Sinche | 3 | `TASK-ARC-CRM-03` |
| `TASK-UI-CRM-04` | Diseñar componente de notas/observaciones en Figma con formulario rápido y tarjetas cronológicas de comentarios del agente. | Jhon Ordoñez | 4 | `TASK-UI-CRM-03` |
| `TASK-FRONT-CRM-04` | Implementar interfaz en React para que el agente agregue y visualice observaciones en tiempo real dentro de la ficha del cliente. | Yohan Ñato | 8 | `TASK-ARC-CRM-04` |
| `TASK-BACK-CRM-04` | Desarrollar el modelo y endpoints en Django para almacenar observaciones asociadas al cliente y al agente emisor con marcas de tiempo. | Brandy Sinche | 6 | `TASK-BACK-CRM-03` |
| `TASK-TEST-CRM-04` | Pruebas unitarias backend y frontend para validar la creación correcta de notas y restricciones de permisos de autoría. | Anderson Villanes | 4 | `TASK-FRONT-CRM-04` |
| `TASK-A11Y-CRM-04` | Asegurar accesibilidad en el formulario de notas (etiquetas de campo, avisos de éxito mediante `aria-live`). | Jhon Ordoñez | 3 | `TASK-FRONT-CRM-04` |
| `TASK-WPO-CRM-04` | Aplicar actualización optimista (*Optimistic UI*) al registrar notas para que aparezcan instantáneamente en la interfaz. | Anderson Villanes | 3 | `TASK-FRONT-CRM-04` |

---

### [HU-SEC-03] Comunicarse con un agente mediante chat en tiempo real (8 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-SEC-03` | Diseñar arquitectura de comunicación por WebSockets (Django Channels / Redis) y contratos de API REST para historial de mensajes. | Brandy Sinche | 5 | N/A |
| `TASK-UI-SEC-03` | Diseñar ventana de chat flotante / panel de mensajería responsivo en Figma (burbujas de chat, indicador de envío y estado de lectura). | Jhon Ordoñez | 6 | N/A |
| `TASK-FRONT-SEC-03` | Implementar cliente de WebSockets y componentes de chat en React con soporte para envío y recepción de mensajes en tiempo real. | Yohan Ñato | 14 | `TASK-ARC-SEC-03` |
| `TASK-BACK-SEC-03` | Configurar Django Channels, Consumers de WebSockets y persistencia de mensajes de chat en base de datos PostgreSQL. | Brandy Sinche | 10 | `TASK-ARC-SEC-03` |
| `TASK-TEST-SEC-03` | Implementar pruebas unitarias e integración para simulación de canales WebSocket y renderizado de mensajes en frontend. | Anderson Villanes | 6 | `TASK-FRONT-SEC-03` |
| `TASK-A11Y-SEC-03` | Aplicar accesibilidad en el chat: anuncio automático de nuevos mensajes mediante `aria-live="polite"` y navegación por teclado en la entrada de texto. | Jhon Ordoñez | 4 | `TASK-FRONT-SEC-03` |
| `TASK-WPO-SEC-03` | Optimizar el rendimiento del chat mediante *auto-scroll* inteligente y limitación de carga de historial antiguo (*infinite scroll*). | Anderson Villanes | 3 | `TASK-FRONT-SEC-03` |

---

## 3. Definition of Ready (DoR)

- Criterios de aceptación definidos y validados por el Product Owner en formato Given-When-Then para la ficha de cliente, observaciones y chat en tiempo real.
- Contratos OpenAPI 3.0 y especificación de eventos WebSocket redactados y aprobados.
- Prototipos de Figma para el historial del cliente, el módulo de notas y la interfaz de chat terminados.
- Estimación realizada por el equipo mediante Planning Poker.

---

## 4. Definition of Done (DoD)

- Código integrado en la rama `main` mediante Pull Request con al menos una revisión y aprobación por pares.
- Cobertura de pruebas unitarias ≥ 80% en los módulos desarrollados (CRM y WebSockets).
- Endpoints REST y canales WebSocket probados con baja latencia en Staging.
- Cero errores críticos en SonarQube / ESLint.
- Auditoría de AXE DevTools superada sin violaciones de nivel A o AA en los componentes interactivos y de mensajería.

---

## 5. Criterios de Éxito

Al finalizar el Sprint 5 se debe poder demostrar:

1. Los agentes pueden consultar una ficha detallada e historial de interacciones de cada cliente desde el CRM.
2. Los agentes pueden registrar, visualizar y almacenar notas u observaciones de atención de manera inmediata.
3. Clientes y agentes pueden establecer una comunicación fluida en tiempo real mediante el chat integrado.
4. Integración funcional robusta entre React, Django REST Framework y Django Channels.
5. Cumplimiento de las métricas de accesibilidad y pruebas conforme a la DoD.

**Importante:** las métricas de cobertura, rendimiento y accesibilidad deben registrarse únicamente después de ejecutar las pruebas. No se deben inventar resultados.

---

## 6. Entregables

- Incremento funcional del CRM (Ficha de Cliente y Observaciones).
- Módulo funcional de Chat en Tiempo Real entre Cliente y Agente.
- Documentación OpenAPI y diagramas de arquitectura de WebSockets actualizados.
- Pantallas y componentes finalizados en Figma.
- Suite de pruebas unitarias e integración.
- Reporte de auditoría de accesibilidad WCAG 2.2 AA.
- Pull Requests revisados y fusionados a `main`.
- Sprint Review.
- Retrospectiva y plan de acción para el Sprint 6.
