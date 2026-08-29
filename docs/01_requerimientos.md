# Especificación de Requerimientos del Sistema (SRS)

**Proyecto:** Sistema Web Inteligente de Gestión Inmobiliaria, Recomendación Personalizada de Propiedades y Agendamiento de Citas  
**Organización / Cliente:** HouseBroker Perú  
**Ubicación en Repositorio:** `Docs/requerimientos.md`  
**Versión:** 2.0 (Alineado con Épicas de GitHub Projects)  
**Fecha de Actualización:** Agosto 2026  

---

## 1. Visión General del Producto

El **Sistema Web Inteligente de HouseBroker Perú** es una solución tecnológica integral diseñada para automatizar y optimizar las operaciones inmobiliarias de compra y alquiler de inmuebles (casas, departamentos, locales, etc.). 

A diferencia de un catálogo tradicional, la plataforma integra un **asistente virtual inteligente disponible 24/7**, un **motor de recomendación guiado por Inteligencia Artificial**, un **CRM de gestión de clientes y citas**, y un **módulo de comunicación directa (chat)** en tiempo real entre agentes e inquilinos/compradores.

### 1.1 Objetivos de Negocio
* **Atención Continua (24/7):** Garantizar la captación de leads e interacción sin importar el horario operativo comercial.
* **Personalización mediante IA:** Reducir el tiempo de búsqueda del cliente recomendando de 2 a 3 propiedades con un alto porcentaje/nivel de coincidencia.
* **Eficiencia Operativa:** Centralizar la agenda de los agentes, permitiendo la programación, reprogramación y confirmación autónoma de visitas.
* **Control y Analítica Administrativa:** Brindar a la gerencia visibilidad total sobre usuarios, métricas de rendimiento, conversaciones y estado de la oferta inmobiliaria.

---

## 2. Matriz de Perfiles y Roles de Usuario

| Rol / Perfil | Descripción y Alcance | Permisos y Responsabilidades Principales |
| :--- | :--- | :--- |
| **Cliente** | Usuario final que busca comprar o alquilar un inmueble. | Registro/Login, búsqueda con filtros, interacción con Chatbot IA, guardado de favoritos, agendamiento de citas, chat con agente. |
| **Agente Inmobiliario** | Profesional encargado de gestionar inmuebles asignados y atender clientes. | Gestión de propiedades asignadas, control de disponibilidad (disponible, reservado, alquilado, vendido), agenda de visitas, chat en tiempo real con clientes y registro de observaciones. |
| **Administrador** | Usuario con privilegio total sobre la plataforma y control operativo. | Gestión global de usuarios (clientes/agentes), asignación de leads y propiedades, supervisión de citas y chats, auditoría del chatbot IA, consulta de analíticas y reportes. |

---

## 3. Requerimientos Funcionales (Estructurados por Épicas)

La especificación funcional se organiza formalmente bajo las **4 Épicas Principales** estructuradas en GitHub Projects:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               ÉPICAS DEL PROYECTO                               │
├───────────────────────┬───────────────────────┬────────────────┬────────────────┤
│      EPIC-PROP        │       EPIC-CRM        │    EPIC-SEC    │    EPIC-AI     │
│ Gestión Propiedades y │   CRM y Gestión de    │  Seguridad y   │ Chatbot IA y   │
│       Búsqueda        │        Visitas        │  Comunicación  │ Recomendador   │
└───────────────────────┴───────────────────────┴────────────────┴────────────────┘
```

---

### 3.1 Épica 1: [EPIC-PROP] Gestión de Propiedades y Búsqueda (#1)

* **RF-PROP-01: Registro y Edición de Propiedades**
  * **Descripción:** El Administrador y Agentes Inmobiliarios asignados podrán registrar, actualizar, suspender o eliminar inmuebles, especificando: ubicación/distrito, precio, tipo (casa/departamento), modalidad (venta/alquiler), número de habitaciones, baños, cochera, metraje, si admite mascotas, fotos y características clave.
* **RF-PROP-02: Catálogo interactivo de Propiedades**
  * **Descripción:** Publicación visual del catálogo de inmuebles disponibles con galerías de fotos, ficha técnica resumida y detallada, y mapa de ubicación aproximada.
* **RF-PROP-03: Motor de Búsqueda y Filtros Avanzados**
  * **Descripción:** Permitir al cliente filtrar inmuebles en tiempo real combinando parámetros de búsqueda: rango de precio, tipo de propiedad, ubicación/distrito, número de habitaciones, presencia de cochera, disponibilidad de mascotas y modalidad (alquiler/venta).
* **RF-PROP-04: Control de Disponibilidad y Estado del Inmueble**
  * **Descripción:** Permite a los agentes y administradores cambiar el estado operativo del inmueble en tiempo real (*Disponible*, *Reservado*, *Alquilado*, *Vendido*), actualizando inmediatamente la visibilidad en el catálogo.
* **RF-PROP-05: Lista de Propiedades Favoritas**
  * **Descripción:** El cliente registrado podrá marcar y guardar inmuebles de su interés en su perfil para una rápida consulta posterior.

---

### 3.2 Épica 2: [EPIC-CRM] CRM y Gestión de Visitas (#2)

* **RF-CRM-01: Agendamiento Autónomo de Visitas**
  * **Descripción:** El cliente podrá seleccionar una propiedad y solicitar la programación de una visita agendando fecha y turno según la disponibilidad pública del agente asignado.
* **RF-CRM-02: Gestión y Control de Citas (Agente / Admin)**
  * **Descripción:** El agente o administrador podrá revisar las solicitudes de cita recibidas y ejecutará acciones de: *Aceptar*, *Rechazar* o *Reprogramar*, con actualización automática en la agenda del cliente.
* **RF-CRM-03: Historial y Ficha de Cliente en CRM**
  * **Descripción:** El agente podrá consultar los datos del cliente, historial de interacciones, preferencias captadas, citas pasadas/futuras y las propiedades recomendadas previamente por la IA.
* **RF-CRM-04: Registro de Observaciones de Atención**
  * **Descripción:** Una vez completada una visita, el agente debe registrar notas u observaciones del recorrido (feedback del cliente, nivel de interés, contraofertas) para el seguimiento comercial.
* **RF-CRM-05: Dashboard Administrativo y Reportes Executivos**
  * **Descripción:** Panel de control gerencial para el Administrador con métricas globales: volumen de ventas/alquilados, tasa de conversión de citas, efectividad de agentes, inmuebles más visitados y exportación de reportes.

---

### 3.3 Épica 3: [EPIC-SEC] Seguridad y Comunicación (#3)

* **RF-SEC-01: Gestión de Usuarios, Autenticación y RBAC**
  * **Descripción:** Modulo de registro, inicio de sesión seguro y recuperación de contraseña. Control de acceso basado en roles (Cliente, Agente, Administrador) y gestión del estado del usuario (activo, suspendido).
* **RF-SEC-02: Sistema de Chat Interno en Tiempo Real**
  * **Descripción:** Plataforma de mensajería bidireccional en vivo entre Cliente y Agente asignado para resolver dudas, negociar y coordinar detalles del inmueble.
* **RF-SEC-03: Supervisión y Auditoría de Chats (Admin)**
  * **Descripción:** El Administrador podrá acceder al historial de conversaciones y mensajes no atendidos con fines de control de calidad, auditoría y resolución de disputas.
* **RF-SEC-04: Control de Estados de Conexión en Vivo**
  * **Descripción:** Detección y visualización en tiempo real del estado de actividad de los usuarios (*Conectado*, *Desconectado*, *Ausente*) en los paneles de agente y administración.
* **RF-SEC-05: Notificaciones Omnicanal en Tiempo Real**
  * **Descripción:** Emisión de alertas (*Push* en plataforma / Correo electrónico) sobre eventos clave: confirmación o cambio de cita, nuevos mensajes en el chat, asignación de nuevos leads.

---

### 3.4 Épica 4: [EPIC-AI] Chatbot con IA y Recomendador de Propiedades (#4)

* **RF-AI-01: Asistente Virtual Inteligente 24/7**
  * **Descripción:** Chatbot conversacional activo continuamente que realiza un cuestionario dinámico al cliente recopilando: modalidad (comprar/alquilar), tipo de inmueble, distrito, presupuesto, número de habitaciones, necesidad de cochera, aceptación de mascotas y atributos indispensables.
* **RF-AI-02: Motor de Recomendación Personalizada (Matching IA)**
  * **Descripción:** Algoritmo que procesa las respuestas ingresadas al Chatbot, analiza la base de datos de propiedades disponibles y genera entre **2 y 3 recomendaciones óptimas** personalizadas.
* **RF-AI-03: Presentación Estructurada de Recomendaciones**
  * **Descripción:** Las sugerencias de la IA se desplegarán en un formato interactivo conteniendo: foto principal, precio, ubicación, características clave, **porcentaje/nivel de coincidencia (Match %)**, botón "Ver detalles", botón "Agendar visita" y botón "Hablar con agente".
* **RF-AI-04: Derivación y Escalado Humano (Transferencia a Agente)**
  * **Descripción:** Si el cliente solicita atención personalizada o si la IA detecta que la consulta excede su alcance, la conversación y el contexto de preferencias acumulado se transfieren automáticamente a un agente humano disponible.
* **RF-AI-05: Auditoría y Supervisión del Bot de IA**
  * **Descripción:** Módulo para el Administrador que permite supervisar el rendimiento del asistente virtual, efectividad de recomendaciones, historial de chats procesados por la IA e índice de satisfacción/escalado.

---

## 4. Requisitos No Funcionales (RNF)

| Código | Categoría | Especificación Técnica / Criterio de Aceptación |
| :--- | :--- | :--- |
| **RNF-01** | **Usabilidad** | Interfaz limpia, responsiva (*Mobile-First*) e intuitiva. Navegación fluida que permita agendar una cita o interactuar con el bot en menos de 3 clics. |
| **RNF-02** | **Rendimiento** | Tiempos de respuesta para consultas de búsqueda y despliegue del catálogo inferiores a **2.0 segundos**. Respuestas del chatbot con IA generadas en menos de **3.0 segundos**. |
| **RNF-03** | **Disponibilidad** | Tiempo de actividad garantizado del portal y asistente virtual 24/7 del **99.5% uptime**. |
| **RNF-04** | **Seguridad** | Cifrado de contraseñas mediante algoritmos robustos (Bcrypt/Argon2), transmisión de datos protegida mediante HTTPS (TLS 1.3) y encriptación de chats/datos sensibles. |
| **RNF-05** | **Escalabilidad** | Arquitectura modular desacoplada capaz de soportar hasta 100 usuarios concurrentes en chat y búsquedas simultáneas sin degradación del servicio. |
| **RNF-06** | **Compatibilidad** | Soporte responsivo completo en navegadores web modernos (Chrome, Edge, Firefox, Safari) para escritorio y dispositivos móviles (iOS/Android). |

---

## 5. Diagrama de Flujo Principal del Sistema

```
[Cliente ingresa a la Web]
         │
         ├───► [Navega Catálogo / Usa Filtros] ───► [Selecciona Propiedad]
         │                                                    │
         └───► [Conversa con Chatbot IA 24/7]                 │
                        │                                     │
             (Responde Preferencias)                          │
                        │                                     │
           [IA genera 2 a 3 Recomendaciones]                 │
                        │                                     │
                        ├───────► [Selecciona Recomendación]──┘
                        │
                        └───────► [Solicita Atención Humana] ──┐
                                                               │
                                                               ▼
                                                  [Agendar Visita / Iniciar Chat]
                                                               │
                                                  [Agente Inmobiliario recibe alerta]
                                                               │
                                                  [Agente gestiona cita y atiende chat]
                                                               │
                                                  [Agente registra observación / estado]
                                                               │
                                                  [Admin supervisa en Dashboard]
```

---

## 6. Alcance y Limitaciones

### 6.1 Alcance del Proyecto
* Desarrollo de la solución web completa (Panel Web Administrador, Portal de Cliente, Dashboard de Agente).
* Implementación de los 4 módulos épicos: Búsqueda/Propiedades, CRM/Agendamiento, Seguridad/Chat y Recomendador IA 24/7.
* Integración de notificaciones web/email y supervisión gerencial.

### 6.2 Limitaciones Declaradas
* **Sin Pasarela de Pagos Directa:** La plataforma no procesa transacciones bancarias, reserva monetaria online o pagos de comisiones directamente en esta versión.
* **Acceso Web Responsivo:** La solución se distribuirá como una Aplicación Web Responsiva (Web App / PWA), sin requerir la publicación de apps nativas en Play Store o App Store.
* **Delimitación Geográfica Inicial:** El catálogo inicial y el entrenamiento del motor de recomendaciones estarán enfocados en el mercado de **Lima Metropolitana, Perú**.
* **Supervisión Humana:** El asistente virtual actúa como asesor inicial; las decisiones finales de contratos de compra/alquiler se cierran mediante intervención presencial/directa del agente.

---
