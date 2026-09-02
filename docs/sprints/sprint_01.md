# Sprint 01: Diseño UX/UI Base y Arquitectura del Servicio de IA

**Periodo:** Semanas 1 y 2  
**Scrum Master:** Brandy Sinche  
**Objetivo del Sprint (Sprint Goal):**  
> *"Diseñar la experiencia de usuario (UX/UI) completa para las 4 épicas principales del sistema y definir la arquitectura en capas para los servicios de IA utilizando el Patrón Adaptador."*

---

## 1. Historias de Usuario y Tareas Asignadas (Sprint Backlog)

| Épica | ID Tarea | Descripción de la Tarea | Responsable | Estado |
| :--- | :--- | :--- | :--- | :---: |
| `EPIC-PROP` | `TASK-UI-PROP-01` (#5) | Diseño UX/UI Completo del Módulo de Propiedades | KennetVR / Pool | 🟢 Done |
| `EPIC-CRM` | `TASK-UI-CRM-01` (#8) | Diseño UX/UI del CRM y Agendamiento de Citas | KennetVR / Pool | 🟢 Done |
| `EPIC-SEC` | `TASK-UI-SEC-01` (#11) | Diseño UX/UI de Autenticación y Plantillas de Correo | KennetVR / Pool | 🟢 Done |
| `EPIC-AI` | `TASK-UI-AI-01` (#14) | Diseño UX/UI del Chatbot y Módulo de Recomendaciones | KennetVR / Pool | 🟢 Done |
| `EPIC-AI` | `TASK-ARC-AI-01` (#16) | Arquitectura en Capas para Servicios de IA (Patrón Adaptador) | brandy-sinche-dev | 🟢 Done |

---

## 2. Trabajo Realizado y Evidencias Técnicas

### 🎨 Diseño Frontend & UX/UI
* **Prototipado en Figma:** Se crearon los wireframes y prototipos de alta fidelidad para el catálogo de inmuebles, formulario de agendamiento, modales de autenticación y la ventana flotante del Chatbot IA.
* **Sistema de Diseño Base:** Definición de la paleta de colores, tipografías y componentes responsivos guiados por accesibilidad WCAG.

### 🏗️ Arquitectura de Software & IA
* **Patrón Adaptador (`AIService`):** Definición del diseño en capas desacoplado para integrar LLMs. Se creó la interfaz genérica para aislar al sistema de la API de Gemini (`GeminiAdapter`), facilitando pruebas y cambios futuros de proveedor de IA.

---

## 3. Retrospectiva del Sprint (Sprint Retrospective)

* **¿Qué funcionó bien?:** Excelente coordinación entre el equipo de UX/UI y el área de arquitectura para alinear la interfaz con las capacidades del bot.
* **¿Qué se puede mejorar?:** Documentar más rápidamente los contratos de la interfaz para no congelar el trabajo de diseño.
* **Acuerdos para el siguiente Sprint:** Iniciar el modelado de datos y especificación formal de la API REST en el Sprint 2.