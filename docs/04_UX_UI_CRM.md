# 04. Diseño UX/UI del CRM, Agendamiento y Chat Unificado

**Proyecto:** Sistema Web Inteligente de Gestión Inmobiliaria  
**Organización / Cliente:** HouseBroker Perú  
**Documento:** Especificación de Interfaz de CRM, Citas y Chat  
**Versión:** 1.1  
**Fecha:** Septiembre 2026  
**Task Asociada:** TASK-UI-CRM-01  

---

## 1. Objetivo

Diseñar la interfaz de usuario para el seguimiento de leads comerciales, la gestión de la agenda de visitas y la experiencia del chat unificado en tiempo real (IA + Agente Humano).

---

## 2. Diseños y Componentes Realizados

### 2.1. Tablero Kanban de Leads Comercial
Diseñado para la gestión del flujo de conversión de clientes desde el panel del Agente y Administrador:

- **Estados del Lead (Columnas Kanban):**
  1. `NUEVO` (Lead recién registrado o captado por el bot).
  2. `CONTACTADO` (Interacción inicial registrada).
  3. `VISITA_AGENDADA` (Cita de visita programada).
  4. `GANADO` (Operación de venta/alquiler cerrada con éxito).
  5. `PERDIDO` (Lead desestimado o sin interés).

> **Aclaración UX/CRM:** El Tablero Kanban gestiona exclusivamente el **Estado Comercial del Lead**. El cambio de estado de las citas en el calendario no cambia automáticamente el Lead a `GANADO`, requiriendo confirmación del agente.

### 2.2. Ficha de Detalle de Cliente
- Información de contacto del cliente y preferencia de búsqueda capturada por la IA.
- Historial de interacciones, notas de seguimiento comercial y registro de contraofertas.
- Historial de propiedades recomendadas previamente por el asistente virtual.

### 2.3. Calendario y Agenda del Agente
- **Vistas Disponibles:** Vista diaria y vista semanal de disponibilidad.
- **Gestión de Estados de la Cita:** Visualización diferenciada por estados (`pendiente`, `confirmada`, `completada`, `cancelada`, `reprogramada`, `no asistió`).
- **Selector de Horarios (Cliente):** Componente interactivo en el portal del cliente para solicitar citas en bloques libres del agente.

### 2.4. Componente de Chat Unificado 24/7 (IA + Agente)
- **Widget Flotante / Pantalla de Chat:** Interfaz continua vía WebSocket que permanece abierta desde la interacción con la Agente Virtual hasta la transferencia al Agente Humano.
- **Renderizado de Recomendaciones IA:** Despliegue de tarjetas visuales enriquecidas por el backend (foto, precio, distrito, porcentaje de Match) con botones interactivos:
  - *`Ver detalles`*
  - *`Agendar visita`*
  - *`Hablar con un agente`*
- **Transición Transparente:** Indicadores visuales claros al momento de transferir la conversación a un agente humano en la misma ventana ("*Un agente se comunicará contigo en breve...*").

---

## 3. Criterios de Aceptación UI/UX

El prototipo de Figma incluye:
- Flujo interactivo de arrastrar/cambiar estado de Leads en el Kanban.
- Flujo de reserva y selección de horarios para citas.
- Navegación del Chat Unificado mostrando la recepción de recomendaciones y la solicitud de transferencia humana.

---

## 4. Enlace al Prototipo interactivo en Figma

- **Prototipo Figma:** https://figmashort.link/z3ckr3