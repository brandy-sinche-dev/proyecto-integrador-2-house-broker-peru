# Sprint Review — Sprint 4 (Hito APF 2)

**Proyecto:** HouseBroker Perú  
**Fecha de Revisión:** Final de la Semana 10 (09 de octubre de 2026)  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Asistentes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes, Profesor / Evaluador Académico APF 2

---

## 1. Objetivo de la Revisión

Presentar ante el evaluador y el Product Owner el incremento correspondiente al **Hito APF 2 (Avance de Proyecto Final 2)**:
1. Integración Full-Stack entre React 19 y Django REST Framework con base de datos relacional PostgreSQL.
2. Flujo completo de agendamiento y reserva de visitas a inmuebles según las franjas horarias configuradas por los agentes.
3. Panel de gestión y seguimiento de citas para clientes y agentes con control de estados.
4. Módulo de inmuebles favoritos con persistencia optimista en catálogo y vista dedicada.

---

## 2. Demostración del Incremento Funcional (Hito APF 2)

### Funcionalidades Demostradas

* **Agendamiento de Visitas (HU-CRM-01):**
  * Acceso desde la tarjeta del catálogo o la vista de detalle mediante el botón "Agendar visita".
  * Selector dinámico `DateSlotsPicker` que consulta los horarios disponibles del agente asignado al inmueble.
  * Formulario de reserva con validación de datos de contacto y notas del cliente.
  * Regla de negocio en backend: rechazo automático de solapamientos para la misma propiedad o el mismo agente en una misma franja horaria.
* **Gestión de Citas (HU-CRM-02):**
  * Panel de citas para el cliente con listado cronológico de visitas solicitadas y estado (`PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `REALIZADA`).
  * Panel de citas para el agente: opciones para confirmar, reprogramar o cancelar una visita con notificación automática de estado.
  * Accesibilidad mediante tablas semánticas y foco gestionado en modales (`Esc`/`Tab`).
* **Favoritos de Propiedades (HU-PROP-05):**
  * Botón interactivo de "Guardar" / corazón en `PropertyCard` y `PropertyDetail` con atributo accesible `aria-pressed`.
  * Persistencia en PostgreSQL mediante el modelo `Favorite` y mutación optimista con React Query (actualización inmediata de UI y revert en caso de error).
  * Vista dedicada "Mis Favoritos" con filtros aplicables sobre la selección guardada.
  * Persistencia de intención: si un usuario anónimo presiona favorito, se guarda temporalmente en `localStorage` y se sincroniza automáticamente tras iniciar sesión.

---

## 3. Estado de las Historias de Usuario

| ID Historia | Título | Estado | Puntos Comprometidos | Puntos Entregados |
| :--- | :--- | :---: | :---: | :---: |
| `HU-CRM-01` | Agendar una visita | **DONE** | 8 | 8 |
| `HU-CRM-02` | Gestionar citas | **DONE** | 5 | 5 |
| `HU-PROP-05` | Guardar propiedades favoritas | **DONE** | 5 | 5 |

**Velocidad comprometida:** 18 SP  
**Velocidad entregada:** 18 SP  
**Cumplimiento del Hito APF 2:** 100%

---

## 4. Métricas de Calidad y Pruebas

| Métrica | Resultado | Fuente / Evidencia |
| :--- | :--- | :--- |
| Pruebas backend de citas y transiciones | 32/32 aprobadas | `backend/apps/appointments/tests/` |
| Pruebas backend de favoritos | 16/16 aprobadas | `backend/apps/properties/tests/test_favorites.py` |
| Pruebas frontend (Jest + RTL) | 68/68 aprobadas | `AppointmentModal.test.jsx`, `FavoriteButton.test.jsx`, etc. |
| Cobertura backend en apps evaluadas | 92.4% | Reporte HTML Coverage |
| Cobertura frontend en componentes CRM | 94.1% | Reporte Jest Coverage |
| Accesibilidad WCAG 2.2 AA (AXE DevTools) | 0 violaciones | Auditoría de modales y tablas |

---

## 5. Evidencias Presentadas

* Contratos OpenAPI v3.0 actualizados para appointments y favorites en `docs/api/openapi_spec.yaml`.
* Código backend en `backend/apps/appointments/` y `backend/apps/properties/models.py`.
* Código frontend en `frontend/src/components/crm/` y `frontend/src/services/appointments.ts`.
* Script de docker compose `infra/docker-compose.yml` ejecutando PostgreSQL, backend y frontend.

---

## 6. Retroalimentación del Evaluador Académico

* **Fortalezas destacadas:** Excelente arquitectura Full-Stack; la separación de responsabilidades entre el servicio de disponibilidad y el agendamiento es sólida. La persistencia optimista de favoritos y el rescate de favoritos para usuarios anónimos aporta una gran experiencia de usuario.
* **Sugerencias de mejora:**
  1. Para el módulo CRM del Sprint 5, enriquecer la ficha del cliente con las notas internas que tome el agente después de cada visita.
  2. Iniciar la preparación de la infraestructura de WebSockets para el chat en tiempo real planificado en el siguiente sprint.
* **Dictamen:** **Hito APF 2 Aprobado con felicitación.**
