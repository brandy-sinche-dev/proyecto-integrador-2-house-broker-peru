# Sprint Review — Sprint 5: Historial de Clientes, Observaciones y Chat

**Proyecto:** HouseBroker Perú  
**Fecha de Revisión:** Final de la Semana 12 (23 de octubre de 2026)  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Asistentes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes, Product Owner

---

## 1. Objetivo de la Revisión

Presentar el incremento funcional enfocado en la consolidación del CRM comercial y el canal de comunicación en tiempo real:
1. Ficha integral e historial cronológico del cliente con sus citas, inmuebles de interés y notas previas.
2. Módulo de registro y consulta de observaciones de atención para agentes con actualización en tiempo real.
3. Chat interactivo en tiempo real entre cliente y agente inmobiliario basado en WebSockets (Django Channels + Redis).

---

## 2. Demostración del Incremento Funcional

### Funcionalidades Demostradas

* **Ficha e Historial del Cliente (HU-CRM-03):**
  * Vista accesible `ClientProfileView` dentro del panel de administración y agente.
  * Resumen de contacto, estado de cuenta, fecha de registro y citas completadas vs canceladas.
  * Línea de tiempo cronológica (*timeline*) con historial de citas, visitas agendadas y propiedades marcadas como favoritas.
* **Observaciones de Atención (HU-CRM-04):**
  * Formulario rápido para que el agente registre notas tras una llamada o visita presencial.
  * Almacenamiento seguro en PostgreSQL con autoría, marca de tiempo y confidencialidad (no visible para clientes).
  * Mutación optimista en React: las notas se renderizan al instante con opción de reintento ante fallos de conexión.
* **Chat en Tiempo Real con Agente (HU-SEC-03):**
  * Ventana de chat responsiva y flotante (`AssistantWidget` / `ChatWindow`) con soporte para alternar entre asistente y agente.
  * Handshake autenticado por WebSocket mediante JWT.
  * Envío y recepción bidireccional instantánea de mensajes con indicador de lectura y estado de conexión.
  * Accesibilidad: llegada de nuevos mensajes anunciada mediante `aria-live="polite"` y control total por teclado.

---

## 3. Estado de las Historias de Usuario

| ID Historia | Título | Estado | Puntos Comprometidos | Puntos Entregados |
| :--- | :--- | :---: | :---: | :---: |
| `HU-CRM-03` | Consultar ficha e historial del cliente | **DONE** | 5 | 5 |
| `HU-CRM-04` | Registrar observaciones de atención | **DONE** | 5 | 5 |
| `HU-SEC-03` | Comunicarse con un agente mediante chat | **DONE** | 8 | 8 |

**Velocidad comprometida:** 18 SP  
**Velocidad entregada:** 18 SP  
**Cumplimiento del Sprint Goal:** 100%

---

## 4. Métricas de Calidad y Pruebas

| Métrica | Resultado | Fuente / Evidencia |
| :--- | :--- | :--- |
| Pruebas backend de perfil y notas de cliente | 28/28 aprobadas | `backend/apps/clients/tests/` |
| Pruebas backend de WebSockets y autenticación | 14/14 aprobadas | `backend/apps/users/tests/` |
| Pruebas frontend (Jest + RTL) de CRM y Chat | 56/56 aprobadas | `ClientProfileView.test.jsx`, `appointments.test.jsx` |
| Cobertura backend consolidada | 93.8% | `backend/htmlcov/index.html` |
| Accesibilidad WCAG 2.2 AA (AXE DevTools) | 0 violaciones | Auditoría de chat y ficha de cliente |

---

## 5. Evidencias Entregadas

* Contratos OpenAPI 3.0 en `docs/api/openapi_spec.yaml` actualizados con `/api/v1/clients/`.
* Aplicación `backend/apps/clients/` (modelos `ClientProfile`, `ClientNote`, vistas, serializers y tests).
* Configuración ASGI en `backend/config/asgi.py` y consumers de WebSocket.
* Componentes frontend en `frontend/src/components/crm/ClientProfileView.tsx` y `ClientProfileView.css`.
* Suite de pruebas automatizadas documentada en `docs/12_Pruebas_Automatizadas.md`.

---

## 6. Retroalimentación del Product Owner

* **Fortalezas:** El CRM ahora proporciona una visión 360° de las necesidades del cliente inmobiliario. La velocidad de mensajería con Channels y Redis es óptima y la UI no sufre retardos.
* **Preparación para el Sprint 6 (IA):**
  1. El chat debe servir de base para integrar el asistente virtual inteligente (HU-AI-01).
  2. Las notas del cliente y su historial de visitas servirán como insumo clave para alimentar el contexto y generar recomendaciones personalizadas de IA (HU-AI-02 y HU-AI-03).
  3. Asegurar que la derivación de IA a agente humano (HU-AI-04) transfiera el historial sin interrupciones.
