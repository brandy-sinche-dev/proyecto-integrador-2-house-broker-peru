# Sprint 02: Modelado de Datos (ERD) y Especificación de APIs REST

**Periodo:** Semanas 3 y 4  
**Scrum Master:** Brandy Sinche  
**Objetivo del Sprint (Sprint Goal):**  
> *"Establecer el modelo Entidad-Relación (ERD) de la base de datos PostgreSQL, la indexación requerida y la especificación de contratos de la API REST para el núcleo del sistema y la seguridad JWT."*

---

## 1. Historias de Usuario y Tareas Asignadas (Sprint Backlog)

| Épica | ID Tarea | Descripción de la Tarea | Responsable | Estado |
| :--- | :--- | :--- | :--- | :---: |
| `EPIC-PROP` | `TASK-ARC-PROP-01` (#7) | Especificación de la API REST de Propiedades | brandy-sinche-dev | 🟢 Done |
| `EPIC-PROP` | `TASK-BD-PROP-01` (#6) | Diseño de Entidades e Indexación para Propiedades | brandy-sinche-dev | 🟢 Done |
| `EPIC-CRM` | `TASK-BD-CRM-01` (#9) | Modelo ERD del CRM y Estrategia de Concurrencia | brandy-sinche-dev | 🟢 Done |
| `EPIC-CRM` | `TASK-ARC-CRM-01` (#10) | Especificación de Contrato API para CRM y Reservas | brandy-sinche-dev | 🟢 Done |
| `EPIC-SEC` | `TASK-BD-SEC-01` (#12) | Modelo ERD de Usuarios, Roles y Notificaciones | brandy-sinche-dev | 🟢 Done |
| `EPIC-SEC` | `TASK-ARC-SEC-01` (#13) | Arquitectura de Seguridad (JWT) y Mensajería Asíncrona | brandy-sinche-dev | 🟢 Done |
| `EPIC-AI` | `TASK-BD-AI-01` (#15) | Modelo ERD de Conversaciones y Preferencias | brandy-sinche-dev | 🟢 Done |

---

## 2. Trabajo Realizado y Evidencias Técnicas

### 🗄️ Base de Datos & Persistencia (PostgreSQL)
* **Diseño del Diagrama ERD:** Creación de las tablas para `User`, `Role`, `Property`, `PropertyImage`, `Appointment`, `Lead` y `ChatSession`/`Preference`.
* **Estrategia de Indexación:** Definición de índices B-Tree en campos de filtrado frecuente (precio, distrito, estado) para optimizar consultas en el catálogo.
* **Concurrencia en CRM:** Definición de restricciones y locks a nivel de base de datos para evitar doble agendamiento en el mismo horario de un agente.

### 🔌 Arquitectura & Contratos de API
* **Especificación API REST:** Elaboración de los contratos OpenAPI/Swagger para las entidades del catálogo y sistema de agendamiento.
* **Seguridad y JWT:** Diseño del esquema de autenticación basado en Tokens JWT mediante Cookies de tipo `HttpOnly` y soporte de mensajería asíncrona para notificaciones.

---

## 3. Retrospectiva del Sprint (Sprint Retrospective)

* **¿Qué funcionó bien?:** Avance sólido en la capa de datos y backend, centralizando la arquitectura de todas las épicas de forma homogénea.
* **¿Qué se puede mejorar?:** Estimar mejor los tiempos de especificación de API para permitir el inicio de desarrollo en paralelo con Frontend.
* **Acuerdos para el siguiente Sprint:** Iniciar el desarrollo e implementación del código base (Backend y Frontend) basándonos en los contratos diseñados en este Sprint.