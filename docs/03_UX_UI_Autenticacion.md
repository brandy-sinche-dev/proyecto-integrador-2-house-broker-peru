# 03. Diseño UX/UI de Autenticación y Seguridad

**Proyecto:** Sistema Web Inteligente de Gestión Inmobiliaria  
**Organización / Cliente:** HouseBroker Perú  
**Documento:** Especificación de Pantallas de Acceso y Seguridad  
**Versión:** 1.1  
**Fecha:** Septiembre 2026  
**Task Asociada:** TASK-UI-SEC-01  

---

## 1. Objetivo

Diseñar la experiencia de usuario (UX) e interfaz gráfica (UI) para los flujos de acceso, seguridad, control de sesiones y notificaciones del sistema HouseBroker Perú.

---

## 2. Diseños y Flujos Realizados

### 2.1. Inicios de Sesión y Seguridad (Login)
- **Pantalla de Inicio de Sesión:** Formulario limpio con autenticación por correo y contraseña, validación de campos en cliente/servidor e indicador de carga.
- **Manejo de Roles:** Redirección automática según el rol asignado (`CLIENTE`, `AGENTE`, `ADMINISTRADOR`) tras la validación de credenciales.
- **Seguridad en Front:** Manejo de sesiones con cookies `HttpOnly` y protección contra intentos fallidos repetidos.

### 2.2. Recuperación de Contraseña
- **Solicitud de Restablecimiento:** Formulario para envío de token seguro al correo electrónico del usuario.
- **Confirmación de Cambio:** Interfaz de ingreso de nueva contraseña con medidor de fuerza/seguridad de clave.

### 2.3. Vistas Adaptativas por Rol (RBAC UI)
Los componentes de navegación y paneles visibles cambian según el rol activo:

* **Rol CLIENTE:**
  - Acceso al catálogo interactivo y lista de favoritos.
  - Widget de Chat Unificado 24/7 (Asistente Virtual IA y escalado a Agente).
  - Panel personal de agendamiento y seguimiento de citas.
* **Rol AGENTE INMOBILIARIO:**
  - Panel de gestión de propiedades asignadas.
  - Tablero Kanban para el seguimiento de Leads.
  - Calendario de disponibilidad y control de citas de visitas.
  - Bandeja del Chat Unificado con cola de espera de atención humana.
* **Rol ADMINISTRADOR:**
  - Dashboard gerencial con métricas y analíticas operativas.
  - Control global de usuarios (clientes/agentes) y asignaciones.
  - Auditoría de conversaciones, citas y rendimiento del bot de IA.

---

## 3. Plantillas de Correo Electrónico Diseñadas

- **Confirmación de Cita:** Notificación enviada al cliente y agente al agendar o confirmar una visita a un inmueble.
- **Recordatorio de Cita:** Alerta automatizada enviada horas antes de la visita programada.
- **Notificación de Atención Humana:** Alerta al cliente cuando un agente toma la conversación en el chat.

---

## 4. Enlace al Prototipo interactivo en Figma

- **Prototipo Figma:** https://figmashort.link/z3ckr3