# Sprint Planning — Sprint 4: Reservas de Citas, Gestión de Visitas y Favoritos

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 4 (Semanas 9–10)  
**Scrum Master:** Brandy Sinche  
**Equipo de Desarrollo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## Objetivo del Sprint (Sprint Goal)

> Implementar el flujo completo de reserva y gestión de citas de visita a propiedades con confirmación e integración de calendario, habilitar la funcionalidad de guardar propiedades favoritas para clientes, garantizando la trazabilidad entre React y Django REST Framework, cobertura de pruebas unitarias ≥ 80% y cumplimiento del estándar de accesibilidad WCAG 2.2 AA.

---

## 1. Capacidad y Velocidad Estimada

- **Capacidad bruta:** 160 horas (4 desarrolladores × 20 h/semana × 2 semanas).
- **Capacidad efectiva:** 110 horas, considerando eventos Scrum, revisiones de PR y refactorización.
- **Story Points comprometidos:** 18 SP (`HU-CRM-01`: 8 SP | `HU-CRM-02`: 5 SP | `HU-PROP-05`: 5 SP).

---

## 2. Sprint Backlog

### [HU-CRM-01] Agendar visita a una propiedad (8 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-CRM-01` | Especificar contratos API REST OpenAPI 3.0 para `/api/v1/appointments` (creación y consulta de citas) e integración de calendarios. | Brandy Sinche | 5 | N/A |
| `TASK-UI-CRM-01` | Diseñar modal/vista de reserva de citas en Figma, incluyendo selector de fechas/horarios disponibles y tarjeta de confirmación. | Jhon Ordoñez | 6 | N/A |
| `TASK-FRONT-CRM-01` | Implementar formulario interactivo de agendamiento en React consumiendo los bloques de horarios configurados en el Sprint 3 (`HU-PROP-04`). | Yohan Ñato | 14 | `TASK-ARC-CRM-01` |
| `TASK-BACK-CRM-01` | Desarrollar endpoint de agendamiento en Django REST Framework con validación de no-solapamiento y envío de correo de confirmación. | Brandy Sinche | 10 | `TASK-ARC-CRM-01` |
| `TASK-TEST-CRM-01` | Implementar pruebas unitarias e integración en Jest / React Testing Library para el flujo de reserva y escenarios de error. | Anderson Villanes | 6 | `TASK-FRONT-CRM-01` |
| `TASK-A11Y-CRM-01` | Aplicar accesibilidad en el modal de reserva y selector de fechas (manejo de foco, teclas `Esc`/`Tab` y etiquetas ARIA). | Jhon Ordoñez | 4 | `TASK-FRONT-CRM-01` |
| `TASK-WPO-CRM-01` | Optimizar la respuesta percibida aplicando estados de carga esqueléticos (*Skeletons*) y validación síncrona de disponibilidad. | Anderson Villanes | 3 | `TASK-FRONT-CRM-01` |

---

### [HU-CRM-02] Gestionar citas y solicitudes (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-CRM-02` | Diseñar contrato API REST para `/api/v1/appointments/{id}/status` para acciones de confirmación, reprogramación y cancelación. | Brandy Sinche | 3 | `TASK-ARC-CRM-01` |
| `TASK-UI-CRM-02` | Diseñar panel de gestión de citas en Figma para Clientes y Agentes (filtros por estado: Pendiente, Confirmada, Cancelada, Realizada). | Jhon Ordoñez | 4 | `TASK-UI-CRM-01` |
| `TASK-FRONT-CRM-02` | Implementar vista de listado/tabla de citas en React con acciones de cambio de estado y alertas de confirmación. | Yohan Ñato | 8 | `TASK-FRONT-CRM-01` |
| `TASK-BACK-CRM-02` | Implementar lógica de negocio en Django para actualizar estados de cita, enviando notificaciones por correo ante cancelaciones o cambios. | Brandy Sinche | 6 | `TASK-BACK-CRM-01` |
| `TASK-TEST-CRM-02` | Pruebas unitarias backend para verificar transiciones válidas de estado (ej. una cita realizada no puede cancelarse) y permisos de usuario. | Anderson Villanes | 4 | `TASK-FRONT-CRM-02` |
| `TASK-A11Y-CRM-02` | Garantizar accesibilidad en la tabla de citas mediante encabezados de tabla explícitos (`<th scope="col">`) y mensajes de confirmación audibles. | Jhon Ordoñez | 3 | `TASK-FRONT-CRM-02` |
| `TASK-WPO-CRM-02` | Implementar actualización optimista en el cliente (*Optimistic UI*) al confirmar o cancelar citas para evitar retrasos visuales. | Anderson Villanes | 3 | `TASK-FRONT-CRM-02` |

---

### [HU-PROP-05] Guardar propiedades en favoritos (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-PROP-05` | Diseñar contrato API REST para `/api/v1/favorites` (`GET`, `POST`, `DELETE`) para la gestión de inmuebles guardados por el cliente. | Brandy Sinche | 3 | N/A |
| `TASK-UI-PROP-05` | Diseñar botón de interacción ("Corazón" / Guardar) en `PropertyCard` y vista "Mis Favoritos" en Figma. | Jhon Ordoñez | 4 | N/A |
| `TASK-FRONT-PROP-05` | Implementar botón toggle de favoritos con persistencia de estado en el catálogo y vista dedicada "Mis Favoritos" en React. | Yohan Ñato | 8 | `TASK-ARC-PROP-05` |
| `TASK-BACK-PROP-05` | Crear modelo y endpoints en Django REST Framework para almacenar la relación `User <-> FavoriteProperty` con consulta optimizada. | Brandy Sinche | 6 | `TASK-ARC-PROP-05` |
| `TASK-TEST-PROP-05` | Pruebas de integración frontend para agregar/remover favoritos y verificar la persistencia de estado post-recarga. | Anderson Villanes | 4 | `TASK-FRONT-PROP-05` |
| `TASK-A11Y-PROP-05` | Garantizar que el botón de favoritos cambie dinámicamente su atributo `aria-pressed="true|false"` y anuncie la acción al lector de pantalla. | Jhon Ordoñez | 3 | `TASK-FRONT-PROP-05` |
| `TASK-WPO-PROP-05` | Optimizar las peticiones de marcación de favoritos mediante *Debounce* o ejecución asíncrona no bloqueante en la UI. | Anderson Villanes | 3 | `TASK-FRONT-PROP-05` |

---

## 3. Definition of Ready (DoR)

- Criterios de aceptación definidos y validados por el Product Owner en formato Given-When-Then para agendamiento, gestión de citas y favoritos.
- Contratos OpenAPI 3.0 para los módulos `/api/v1/appointments` y `/api/v1/favorites` redactados y aprobados.
- Prototipos y componentes interactivos de citas y sección de favoritos terminados en Figma.
- Estimación realizada por el equipo de desarrollo mediante Planning Poker.

---

## 4. Definition of Done (DoD)

- Código integrado en la rama `main` mediante Pull Request con al menos una aprobación de revisión por pares.
- Cobertura de pruebas unitarias ≥ 80% en los módulos de reservas, gestión de estados de citas y controlador de favoritos.
- Endpoints REST probados y respondiendo en un tiempo menor a 300 ms en Staging.
- Notificaciones de correo transaccional de citas enviadas correctamente durante el flujo de prueba.
- Cero errores críticos en evaluaciones de SonarQube / ESLint.
- Auditoría de AXE DevTools superada sin violaciones de nivel A o AA en vistas de reservas, tablas y botones de interacción.

---

## 5. Criterios de Éxito

Al finalizar el Sprint 4 se debe poder demostrar (Hito **APF2**):

1. Un cliente puede seleccionar una fecha/hora disponible y agendar una visita a una propiedad.
2. El cliente y el agente reciben la confirmación correspondiente y pueden ver la cita en sus paneles.
3. El agente o cliente pueden confirmar, reprogramar o cancelar una cita con actualización inmediata de estado.
4. Un cliente autenticado puede marcar/desmarcar propiedades como favoritas y acceder a su lista guardada.
5. Integración funcional probada entre React y Django REST Framework.
6. Cumplimiento de las métricas de rendimiento, pruebas y accesibilidad según la DoD.

**Importante:** las métricas de cobertura, rendimiento y accesibilidad deben registrarse únicamente después de ejecutar las pruebas. No se deben inventar resultados.

---

## 6. Entregables

- Incremento funcional del CRM de Citas (Agendamiento y Gestión de Visitas).
- Módulo funcional de Favoritos para Clientes.
- Documentación OpenAPI 3.0 actualizada para los módulos de Citas y Favoritos.
- Componentes y flujos finalizados en Figma para el Hito APF2.
- Suite de pruebas unitarias e integración de los módulos del Sprint.
- Reporte de auditoría de accesibilidad WCAG 2.2 AA.
- Pull Requests revisados y fusionados a `main`.
- Demostración funcional en el Sprint Review (**APF2**).
- Retrospectiva y plan de acción para el Sprint 5.
