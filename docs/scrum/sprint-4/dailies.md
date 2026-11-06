# Bitácora de Daily Scrums — Sprint 4: Citas, Visitas y Favoritos (Hito APF 2)

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 4 (Semanas 9–10: 28/09/2026 – 09/10/2026)  
**Integrantes:** Brandy Sinche (Scrum Master / Lead), Jhon Ordoñez (PO Simulado / Dev), Yohan Ñato (Analyst / Dev), Anderson Villanes (QA / Dev)

---

## Día 1: Lunes 28/09/2026
* **Duración:** 12 minutos (09:00 AM – 09:12 AM)
* **Asistencia:** Todos presentes (Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes).
* **Sincronización:**
  * **Brandy Sinche:** Especificó el contrato OpenAPI para `/api/v1/appointments` (creación y consulta) y `/api/v1/favorites`. Hoy comenzará el modelado de datos en Django para `Appointment` y la relación `Favorite`. Sin bloqueos.
  * **Jhon Ordoñez:** Concluyó el diseño en Figma del modal interactivo de reserva de citas y el selector de fecha/hora. Hoy diseñará el botón de favoritos en `PropertyCard` y la vista de "Mis Favoritos". Sin bloqueos.
  * **Yohan Ñato:** Revisó los componentes de UI del Sprint 3 y preparó el estado global para citas y favoritos en React. Hoy creará la estructura del modal `AppointmentModal`. Sin bloqueos.
  * **Anderson Villanes:** Configuró las fixtures compartidas en Pytest y Jest para simular clientes autenticados. Hoy redactará los casos de prueba para el agendamiento y no-solapamiento de visitas. Sin bloqueos.
* **Evidencia:** Contratos en `docs/api/openapi_spec.yaml` y wireframes en Figma.

---

## Día 2: Miércoles 30/09/2026
* **Duración:** 14 minutos (09:00 AM – 09:14 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Desarrolló los endpoints de reserva (`POST /api/v1/appointments`) con validación de no-solapamiento de citas contra la disponibilidad del agente. Hoy implementará la máquina de estados de cita (`CONFIRMADA`, `CANCELADA`, `REALIZADA`). Sin bloqueos.
  * **Jhon Ordoñez:** Añadió la señalética de accesibilidad en Figma: enfoque de teclado, etiquetas ARIA para el calendario y contraste de colores en el botón de favoritos. Hoy diseñará la tabla de citas de agente. Sin bloqueos.
  * **Yohan Ñato:** Conectó el selector de fechas `DateSlotsPicker` consumiendo las franjas horarias reales configuradas en `HU-PROP-04`. Hoy integrará la llamada al endpoint de creación de cita. **Bloqueo:** Discrepancia en el formato de fecha ISO con zona horaria de Lima; resuelto acordando UTC en API y conversión local en cliente.
  * **Anderson Villanes:** Implementó las primeras pruebas unitarias del modal de citas y del selector de horas. Hoy iniciará pruebas para la mutación optimista de favoritos en React Query. Sin bloqueos.
* **Evidencia:** `AppointmentModal.tsx`, `DateSlotsPicker.tsx` y endpoints en `backend/apps/appointments/`.

---

## Día 3: Lunes 05/10/2026
* **Duración:** 11 minutos (09:00 AM – 09:11 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Culminó los endpoints de actualización de estado de citas (`PATCH /api/v1/appointments/{id}/status`) y el modelo `Favorite` con índice único por `(user, property)`. Hoy apoyará en la integración de favoritos en el catálogo. Sin bloqueos.
  * **Jhon Ordoñez:** Validó los flujos de cambio de estado en la tabla de citas de agente. Hoy ejecutará la revisión preliminar de accesibilidad con AXE en el flujo de favoritos y citas. Sin bloqueos.
  * **Yohan Ñato:** Implementó el botón de toggle de favoritos en `PropertyCard` y `PropertyDetail` con sincronización en tiempo real vía `useMutation` y caché de React Query. Hoy construirá la vista de "Mis Favoritos". Sin bloqueos.
  * **Anderson Villanes:** Verificó la prevención de solapamientos con pruebas automatizadas en Django (test unitarios y de integración de citas). Hoy aumentará la cobertura de la tabla de citas. Sin bloqueos.
* **Evidencia:** `FavoriteButton.tsx`, `AppointmentListTable.tsx` y pruebas en `backend/apps/appointments/tests/`.

---

## Día 4: Miércoles 07/10/2026
* **Duración:** 13 minutos (09:00 AM – 09:13 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Revisó los Pull Requests de citas y favoritos. Realizó pruebas de integración full-stack entre React y Django con base de datos PostgreSQL. Todo operativo. Sin bloqueos.
  * **Jhon Ordoñez:** Finalizó el reporte de auditoría AXE: cero violaciones críticas de nivel AA en `AppointmentModal`, `FavoriteButton` y la tabla de citas. Hoy redactará el acta de entrega APF 2. Sin bloqueos.
  * **Yohan Ñato:** Añadió anuncios `aria-live` en la acción de agregar/quitar favoritos y al confirmar una cita. Realizó pruebas manuales de extremo a extremo. Sin bloqueos.
  * **Anderson Villanes:** Corrió la suite completa de pruebas: frontend y backend en verde con cobertura superior al 88%. Preparó la demostración del Hito APF 2. Sin bloqueos.
* **Evidencia:** Suite de pruebas pasando al 100%, reporte de accesibilidad y merge a `main`.
