# Bitácora de Daily Scrums — Sprint 3: Autenticación y Disponibilidad

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 3 (Semanas 7–8)  
**Integrantes:** Brandy Sinche (Scrum Master / Dev 1), Jhon Ordoñez (Dev 2), Yohan Ñato (Dev 3), Anderson Villanes (Dev 4)

---

## Día 1: Lunes 14/09/2026
* **Duración:** 12 minutos (09:00 AM - 09:12 AM)
* **Asistencia:** Brandy Sinche (Presente), Jhon Ordoñez (Presente), Yohan Ñato (Presente), Anderson Villanes (Presente)
* **Sincronización:**
  * **Brandy Sinche:** Cerró el contrato OpenAPI de `/api/v1/auth/register`, `/auth/login` y `/auth/refresh` con roles Cliente, Agente y Administrador. Hoy iniciará la implementación con `simplejwt` y permisos por rol. Sin bloqueos.
  * **Jhon Ordoñez:** Entregó los wireframes de Login y Registro con estados de error y validación. Hoy completará el flujo de selección de rol. Sin bloqueos.
  * **Yohan Ñato:** Preparó el `AuthContext` y las rutas protegidas. Hoy conectará el formulario de Login con el servicio de autenticación. Sin bloqueos.
  * **Anderson Villanes:** Definió los casos de prueba del flujo de autenticación. Hoy configurará los mocks de `auth` en Jest. Sin bloqueos.
* **Evidencia:** Contrato en `docs/api/openapi_spec.yaml` y componentes en `frontend/src/components/auth/`.

---

## Día 2: Miércoles 16/09/2026
* **Duración:** 10 minutos (09:00 AM - 09:10 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Implementó registro, login y refresh con JWT en cookies HttpOnly y control RBAC. Hoy abordará el flujo de recuperación de contraseña. Sin bloqueos.
  * **Jhon Ordoñez:** Terminó las pantallas de Login y Registro con `autocomplete` y mensajes de error asociados por `aria-describedby`. Hoy diseñará el flujo "Olvidé mi contraseña". Sin bloqueos.
  * **Yohan Ñato:** Integró la sesión en el frontend y el cierre de sesión. Hoy implementará la solicitud de recuperación y el formulario de nueva clave. Sin bloqueos.
  * **Anderson Villanes:** Cubrió login, registro y redirección por rol. **Bloqueo:** las pruebas leían el token desde localStorage; se ajustaron al nuevo esquema de cookies HttpOnly.
* **Evidencia:** Endpoints de autenticación y pruebas en `backend/apps/users/tests/test_auth.py`.

---

## Día 3: Lunes 21/09/2026
* **Duración:** 13 minutos (09:00 AM - 09:13 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Definió los contratos de `/properties/{id}/status` y `/properties/{id}/schedules`. Hoy implementará las transiciones de estado y el CRUD de franjas. Sin bloqueos.
  * **Jhon Ordoñez:** Diseñó el panel de disponibilidad con selector de días y horas y switches accesibles. Hoy revisará el foco y los roles ARIA del panel. Sin bloqueos.
  * **Yohan Ñato:** Implementó el panel del agente con actualización optimista de estado. Hoy integrará la configuración semanal de horarios. Sin bloqueos.
  * **Anderson Villanes:** Añadió pruebas de permisos: solo el agente asignado o el administrador cambian el estado. Hoy cubrirá la validación de solapamiento de franjas. Sin bloqueos.
* **Evidencia:** `PropertyAvailabilityPanel.tsx`, `ScheduleEditor.tsx` y pruebas de disponibilidad.

---

## Día 4: Miércoles 23/09/2026
* **Duración:** 11 minutos (09:00 AM - 09:11 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Cerró el envío de correos de recuperación con token de un solo uso y límite de intentos. Hoy consolidará la evidencia del Sprint 3. Sin bloqueos.
  * **Jhon Ordoñez:** Ejecutó la auditoría AXE de los formularios de autenticación y del panel de disponibilidad. Hoy documentará los resultados. Sin bloqueos.
  * **Yohan Ñato:** Verificó el flujo completo de recuperación y la actualización optimista del panel. Hoy preparará la demostración para el review. Sin bloqueos.
  * **Anderson Villanes:** Corrió la suite de autenticación, permisos y disponibilidad en verde e integró el PR final. Sin bloqueos.
* **Evidencia:** Reporte de accesibilidad en `docs/16_TASK_A11Y_PROP_04.md` y pruebas en `backend/apps/users/tests/` y `backend/apps/properties/tests/`.
