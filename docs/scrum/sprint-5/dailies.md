# Bitácora de Daily Scrums — Sprint 5: Historial de Clientes, Observaciones y Chat

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 5 (Semanas 11–12: 12/10/2026 – 23/10/2026)  
**Integrantes:** Brandy Sinche (Scrum Master / Lead), Jhon Ordoñez (PO Simulado / Dev), Yohan Ñato (Analyst / Dev), Anderson Villanes (QA / Dev)

---

## Día 1: Lunes 12/10/2026
* **Duración:** 14 minutos (09:00 AM – 09:14 AM)
* **Asistencia:** Todos presentes (Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes).
* **Sincronización:**
  * **Brandy Sinche:** Especificó el contrato OpenAPI para `/api/v1/clients/{id}/profile`, `/api/v1/clients/{id}/notes` y la arquitectura de WebSockets con Django Channels + Redis. Hoy configurará el contenedor Redis en Docker Compose. Sin bloqueos.
  * **Jhon Ordoñez:** Concluyó los wireframes de la Ficha del Cliente (resumen de perfil, historial de visitas y citas) y el componente de notas del agente. Hoy diseñará el widget de chat flotante. Sin bloqueos.
  * **Yohan Ñato:** Implementó el helper estandarizado `unwrapList` en todos los servicios de frontend para garantizar compatibilidad con la paginación de DRF. Hoy creará la estructura de `ClientProfileView`. Sin bloqueos.
  * **Anderson Villanes:** Diseñó los casos de prueba para el historial del cliente y el registro de notas. Hoy preparará la suite de pruebas unitarias para consumers de Channels. Sin bloqueos.
* **Evidencia:** Contratos API en `docs/api/openapi_spec.yaml` y `infra/docker-compose.yml` actualizado con Redis.

---

## Día 2: Miércoles 14/10/2026
* **Duración:** 12 minutos (09:00 AM – 09:12 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Implementó el modelo `ClientNote` y endpoints REST de consulta de perfil consolidado en `backend/apps/clients/`. Hoy iniciará la implementación de los Consumers ASGI para el chat. Sin bloqueos.
  * **Jhon Ordoñez:** Terminó las pantallas del widget de chat en Figma, incluyendo estados de conexión, mensajes enviados, recibidos y burbuja de notificación. Hoy apoyará en accesibilidad de la línea de tiempo. Sin bloqueos.
  * **Yohan Ñato:** Construyó los componentes `ClientProfileView` y `ClientNotesList` con capacidad de registrar observaciones de atención mediante formulario con atajo de teclado (`Ctrl+Enter`). Sin bloqueos.
  * **Anderson Villanes:** Creó pruebas unitarias para `ClientProfileView` y validación de permisos: solo los agentes y administradores pueden acceder a las notas internas. Sin bloqueos.
* **Evidencia:** Componentes en `frontend/src/components/crm/` y modelos en `backend/apps/clients/`.

---

## Día 3: Lunes 19/10/2026
* **Duración:** 15 minutos (09:00 AM – 09:15 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Conectó Django Channels con la persistencia en PostgreSQL y autenticación de canales mediante token JWT en handshake. Hoy revisará la reconexión automática ante caídas de red. Sin bloqueos.
  * **Jhon Ordoñez:** Supervisó los contrastes de color en el chat y las etiquetas accesibles `aria-live="polite"` para la llegada de nuevos mensajes. Hoy diseñará la vista de auditoría de conversaciones. Sin bloqueos.
  * **Yohan Ñato:** Implementó el hook `useChatWebSocket` en React para manejar apertura de socket, envío de mensajes y buffer de mensajes entrantes. **Bloqueo:** Reconexión infinita en modo estricto de React; resuelto limpiando el cleanup del effect en desmontaje.
  * **Anderson Villanes:** Añadió pruebas automatizadas para simular intercambios de mensajes en tiempo real y pruebas de carga diferida en el historial del cliente. Sin bloqueos.
* **Evidencia:** `useChatWebSocket.ts`, `ChatWindow.tsx` y tests de WebSockets en backend.

---

## Día 4: Miércoles 21/10/2026
* **Duración:** 11 minutos (09:00 AM – 09:11 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Realizó pruebas de integración del chat y CRM en entorno local y Docker Compose. Verificó que los mensajes persistan y se asocien a la ficha del cliente. Sin bloqueos.
  * **Jhon Ordoñez:** Corrió la auditoría de accesibilidad AXE en el chat y ficha de cliente: cero violaciones de nivel AA. Hoy redactará el reporte de accesibilidad. Sin bloqueos.
  * **Yohan Ñato:** Afino los detalles visuales de la línea de tiempo y la actualización optimista de notas en el CRM. Sin bloqueos.
  * **Anderson Villanes:** Ejecutó la suite completa de pruebas de backend (Pytest con cobertura > 93%) y frontend (Jest con > 450 pruebas aprobadas). Preparó el incremento para la Sprint Review. Sin bloqueos.
* **Evidencia:** Reporte de pruebas unitarias y cobertura en `backend/htmlcov/` y merge a `main`.
