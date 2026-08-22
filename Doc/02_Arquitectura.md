# 02. Arquitectura del Sistema

## HouseBroker Perú

**Proyecto:** Desarrollo de un sistema web inteligente para la gestión inmobiliaria, recomendación personalizada de propiedades y agendamiento de citas en HouseBroker Perú  
**Documento:** Arquitectura de software  
**Versión:** 1.1  
**Fecha:** 21 de agosto de 2026

---

## 1. Propósito del documento

Este documento define la arquitectura tecnológica y funcional del sistema web de **HouseBroker Perú**. La plataforma permitirá gestionar la venta y el alquiler de propiedades, recomendar inmuebles mediante inteligencia artificial, agendar visitas y facilitar la comunicación en tiempo real entre clientes y agentes inmobiliarios.

El sistema tendrá tres roles principales:

- **Cliente:** busca propiedades, conversa con el asistente virtual, recibe recomendaciones, agenda citas y se comunica con un agente.
- **Agente inmobiliario:** administra su agenda, atiende conversaciones, consulta las recomendaciones realizadas por la IA y actualiza el seguimiento de los clientes.
- **Administrador:** gestiona usuarios, agentes, propiedades, citas, conversaciones, reportes y configuraciones generales.

---

## 2. Objetivos de la arquitectura

- Separar claramente el frontend, el backend, la base de datos y los servicios externos.
- Proteger la información de usuarios y las credenciales de los servicios.
- Permitir comunicación en tiempo real entre clientes y agentes.
- Evitar que el asistente virtual invente propiedades, precios o disponibilidad.
- Facilitar el mantenimiento y crecimiento del sistema.
- Permitir sustituir Gemini por otro motor de IA sin reconstruir toda la aplicación.
- Mantener un historial auditable de citas, conversaciones y recomendaciones.

---

## 3. Tecnologías seleccionadas

| Capa | Tecnología | Función |
|---|---|---|
| Frontend | React + TypeScript | Interfaces del cliente, agente y administrador |
| Backend | Django + Django REST Framework | Reglas de negocio, API, permisos y conexión con servicios externos |
| Base de datos | PostgreSQL | Almacenamiento permanente de usuarios, propiedades, citas y mensajes |
| Tiempo real | Django Channels + WebSockets | Chat, notificaciones y estados de conexión |
| Mensajería temporal | Redis | Canal de eventos, presencia y apoyo para WebSockets |
| Inteligencia artificial | `AIService` + `GeminiAdapter` | Abstracción, comprensión de necesidades y scoring semántico |
| Modelo inicial de IA | `gemini-3.1-flash-lite` | Respuestas rápidas y de bajo costo para el chatbot |
| Autenticación | JWT en cookies HttpOnly | Inicio de sesión y control de sesiones |
| Servidor ASGI | Uvicorn o Daphne | Ejecución de Django y conexiones WebSocket |
| Contenedores | Docker | Entornos consistentes de desarrollo y despliegue |
| Control de versiones | Git + GitHub | Historial, colaboración y respaldo del código |

> El nivel gratuito de un proveedor de IA es apropiado para desarrollo y demostraciones, pero tiene límites de uso. La aplicación debe controlar errores de cuota y permitir cambiar de modelo mediante configuración.

---

## 4. Estilo arquitectónico

Se empleará una **arquitectura cliente-servidor por capas**, complementada con servicios en tiempo real y un adaptador para inteligencia artificial.

```mermaid
flowchart TD
    U["Usuarios"] --> FE["React + TypeScript"]
    FE --> API["Django REST API"]
    FE <--> WS["Django Channels"]
    API --> DB["PostgreSQL"]
    WS <--> RD["Redis"]
    API --> AIS["AIService"]
    AIS --> GA["GeminiAdapter"]
    GA --> AI["Gemini API"]
```

### 4.1. Capa de presentación

Desarrollada con React y TypeScript. Contendrá:

- Portal público de propiedades.
- Panel del cliente.
- Panel del agente inmobiliario.
- Dashboard del administrador.
- Chat unificado 24/7 con atención virtual y transferencia a agentes humanos.
- Calendario y gestión de citas.

El frontend no accederá directamente a PostgreSQL ni a Gemini. Toda operación deberá pasar por Django.

### 4.2. Capa de aplicación

Django REST Framework expondrá la API y coordinará:

- Autenticación y autorización.
- Gestión de propiedades.
- Gestión de usuarios y roles.
- Agendamiento de citas.
- Búsqueda y recomendación.
- Historial de conversaciones.
- Notificaciones.
- Reportes y auditoría.

### 4.3. Capa de dominio

Contendrá las reglas principales del negocio:

- Una propiedad no puede mostrarse como disponible si está vendida, alquilada, suspendida o eliminada.
- Una cita solo puede reservarse en un horario disponible del agente.
- Un cliente no puede administrar propiedades ni usuarios.
- Un agente solo puede consultar las conversaciones y citas que le corresponden.
- Un administrador puede supervisar y configurar todo el sistema.
- Las recomendaciones solo utilizarán propiedades registradas y activas.

### 4.4. Capa de datos

PostgreSQL almacenará los datos permanentes. Redis se utilizará únicamente para información temporal, como:

- Usuarios conectados.
- Canales WebSocket.
- Eventos y notificaciones pendientes.
- Control de frecuencia de determinadas solicitudes.

### 4.5. Patrón Adapter para inteligencia artificial

La integración con Gemini utilizará el **patrón Adapter**. Django dependerá de la abstracción `AIService` y no del SDK de Gemini. De esta manera, el resto del sistema no tendrá que modificarse si posteriormente se cambia Gemini por otro proveedor o por un modelo local.

#### Diagrama del patrón Adapter

```mermaid
flowchart LR
    R["React"] --> D["Django API"]
    D --> S["AIService"]
    S --> A["GeminiAdapter"]
    A --> G["Gemini"]
```

Responsabilidades:

| Componente | Responsabilidad |
|---|---|
| React | Mostrar el chat y enviar mensajes a la API |
| Django API | Validar usuario, conversación, permisos y datos |
| `AIService` | Definir las operaciones que necesita el sistema |
| `GeminiAdapter` | Traducir las operaciones internas al formato del SDK de Gemini |
| Gemini | Interpretar mensajes, extraer preferencias y puntuar candidatos |

Interfaz conceptual:

```python
from typing import Protocol


class AIService(Protocol):
    def extract_preferences(self, message: str, context: dict) -> dict:
        ...

    def score_candidates(self, preferences: dict, properties: list[dict]) -> list[dict]:
        ...

    def generate_reply(self, context: dict) -> str:
        ...

    def summarize_for_agent(self, conversation: list[dict]) -> dict:
        ...
```

Implementación inicial:

```text
AIService
└── GeminiAdapter
    └── Gemini API: gemini-3.1-flash-lite
```

Las vistas, controladores y servicios de recomendación solo utilizarán `AIService`. Ninguno importará directamente el SDK de Gemini, excepto `GeminiAdapter`.

---

## 5. Arquitectura funcional por módulos

```mermaid
flowchart TD
    CORE["Sistema HouseBroker"] --> USR["Usuarios y roles"]
    CORE --> PROP["Propiedades"]
    CORE --> CIT["Citas"]
    CORE --> COM["Comunicaciones"]
    CORE --> ADM["Administración"]
    COM --> BOT["Asistente virtual"]
    COM --> CHAT["Chat humano"]
```

### 5.1. Módulo de usuarios y autenticación

- Registro de clientes.
- Inicio y cierre de sesión.
- Recuperación de contraseña.
- Verificación de correo.
- Gestión de perfiles.
- Roles: cliente, agente y administrador.
- Activación, suspensión y eliminación lógica de cuentas.
- Control de último acceso y estado de conexión.

### 5.2. Módulo de propiedades

- Registro de casas, departamentos y otros tipos de inmuebles.
- Modalidad de venta o alquiler.
- Precio, moneda, ubicación y características.
- Galería de imágenes.
- Estado: borrador, disponible, reservada, alquilada, vendida o suspendida.
- Asignación de un agente responsable.
- Búsqueda y filtros.
- Favoritos del cliente.
- Historial de modificaciones.

### 5.3. Módulo de citas

- Consulta de disponibilidad del agente.
- Agendamiento de visitas.
- Confirmación, rechazo, cancelación y reprogramación.
- Vista de calendario para el agente.
- Recordatorios y notificaciones.
- Registro del resultado de la visita.
- Estados: pendiente, confirmada, completada, cancelada o no asistió.

### 5.4. Módulo de chat humano

- Conversación en tiempo real mediante WebSockets.
- Transferencia desde el asistente virtual hacia un agente dentro del mismo chat.
- Conservación del historial, preferencias y recomendaciones de la IA.
- Cola de conversaciones que esperan atención humana.
- Mensajes enviados, entregados y leídos.
- Indicador de escritura.
- Número de mensajes no leídos.
- Archivos adjuntos controlados.
- Historial permanente en PostgreSQL.
- Estado del agente: conectado, ausente o desconectado.

### 5.5. Módulo de asistente virtual

- Widget de chat siempre visible en la plataforma.
- Atención automática las 24 horas mediante una agente virtual.
- Preguntas progresivas sobre las necesidades del cliente.
- Extracción de preferencias en formato estructurado.
- Búsqueda de propiedades reales mediante Django.
- Presentación de dos o tres recomendaciones.
- Explicación de la coincidencia de cada propiedad.
- Agendamiento de citas.
- Botón u opción escrita para solicitar un agente humano.
- Confirmación inmediata de que un agente se comunicará en breve.
- Derivación sin cerrar, duplicar ni perder la conversación actual.
- Registro del historial de conversación y recomendaciones.

### 5.6. Módulo administrativo

- Resumen general del sistema.
- Gestión de clientes, agentes y administradores.
- Gestión y asignación de propiedades.
- Supervisión de citas.
- Supervisión de conversaciones.
- Visualización de agentes conectados y mensajes sin atender.
- Estadísticas de propiedades, recomendaciones, citas, ventas y alquileres.
- Configuración del proveedor y modelo de IA.
- Auditoría de operaciones sensibles.

---

## 6. Arquitectura del asistente virtual

La inteligencia artificial no consultará directamente la base de datos. Django actuará como intermediario y será la única fuente de información confiable.

```mermaid
sequenceDiagram
    participant C as Cliente
    participant R as React
    participant D as Django
    participant P as PostgreSQL
    participant S as AIService / GeminiAdapter

    C->>R: Escribe una necesidad
    R->>D: Envía el mensaje
    D->>S: Solicita extraer preferencias
    S-->>D: Entrega preferencias validadas
    D->>P: Busca propiedades disponibles
    P-->>D: Devuelve candidatos reales
    D->>S: Solicita scoring de candidatos
    S-->>D: Entrega scoring validado
    D-->>R: Respuesta y propiedades
    R-->>C: Muestra 2 o 3 opciones
```

### 6.1. Responsabilidades de Gemini

- Entender el lenguaje natural del cliente.
- Identificar intención de compra o alquiler.
- Extraer preferencias.
- Solicitar información faltante.
- Explicar por qué una propiedad coincide con las necesidades.
- Mantener un tono amable, breve y profesional.

### 6.2. Responsabilidades de Django

- Validar todos los datos recibidos.
- Consultar únicamente propiedades disponibles.
- Aplicar filtros y calcular la puntuación de coincidencia.
- Ocultar información privada o interna.
- Guardar la conversación y las recomendaciones.
- Controlar cuotas, tiempos de espera y errores de Gemini.
- Transferir la conversación a un agente cuando corresponda.

### 6.3. Preferencias estructuradas

Ejemplo de información extraída por el asistente:

```json
{
  "operacion": "alquiler",
  "tipo_propiedad": "departamento",
  "distrito": "Miraflores",
  "presupuesto_minimo": 1800,
  "presupuesto_maximo": 2500,
  "habitaciones": 2,
  "banos": 2,
  "cochera": true,
  "acepta_mascotas": true,
  "caracteristicas_deseadas": ["ascensor", "cerca a transporte"]
}
```

### 6.4. Pipeline híbrido de recomendación

La recomendación combinará filtros exactos de PostgreSQL con una evaluación semántica del modelo de lenguaje. Este enfoque reduce el número de propiedades enviadas a la IA y evita recomendar inmuebles inexistentes o no disponibles.

#### Diagrama del pipeline híbrido

```mermaid
flowchart LR
    SQL["Filtros SQL en PostgreSQL"] --> CAN["Propiedades candidatas"]
    CAN --> RS["RecommendationService"]
    RS --> LLM["Scoring LLM"]
    LLM --> RK["Ranking final"]
```

Flujo detallado:

1. **Filtros SQL:** PostgreSQL descarta propiedades que no cumplen las condiciones obligatorias, como modalidad, disponibilidad, rango de precio y tipo de inmueble.
2. **Candidatos:** la base de datos devuelve solamente un conjunto reducido de propiedades reales y activas.
3. **`RecommendationService`:** normaliza los datos, calcula coincidencias objetivas y prepara únicamente los campos permitidos para la IA.
4. **Scoring LLM:** Gemini evalúa criterios flexibles expresados en lenguaje natural, como “zona tranquila”, “cerca del trabajo” o “ideal para una familia”.
5. **Validación:** Django comprueba que todos los identificadores y puntuaciones devueltos correspondan a los candidatos enviados.
6. **Ranking final:** `RecommendationService` combina el puntaje objetivo y el puntaje del LLM.
7. **Resultado:** se entregan las dos o tres propiedades con mayor puntuación.

Fórmula inicial sugerida:

```text
puntaje_final = (puntaje_reglas × 0.70) + (puntaje_llm × 0.30)
```

El peso de las reglas será mayor porque presupuesto, disponibilidad, ubicación y características registradas son datos verificables. El scoring del LLM ayudará a interpretar preferencias más subjetivas.

#### Puntuación mediante reglas

| Criterio | Peso sugerido |
|---|---:|
| Modalidad: venta o alquiler | Obligatorio |
| Estado disponible | Obligatorio |
| Presupuesto | 30 % |
| Distrito o zona | 25 % |
| Tipo de propiedad | 15 % |
| Habitaciones y baños | 15 % |
| Cochera y mascotas | 10 % |
| Características adicionales | 5 % |

Proceso de puntuación objetiva:

1. Descartar propiedades inactivas o no disponibles.
2. Descartar propiedades de una modalidad diferente.
3. Aplicar los filtros obligatorios seleccionados por el cliente.
4. Calcular el `puntaje_reglas` de cada propiedad.
5. Enviar únicamente los candidatos válidos al `AIService`.
6. Validar la respuesta estructurada del modelo.
7. Calcular el puntaje final y ordenar las coincidencias.
8. Entregar las dos o tres propiedades mejor calificadas.

#### Respuesta esperada del scoring LLM

```json
{
  "scores": [
    {
      "property_id": "PROP-00125",
      "score": 88,
      "reasons": ["acepta mascotas", "zona cercana al transporte"]
    }
  ]
}
```

Gemini no podrá agregar propiedades nuevas al resultado. Si devuelve un identificador que no estaba entre los candidatos, Django lo descartará.

#### Fallback sin inteligencia artificial

Si Gemini no responde o se alcanza el límite del servicio, el sistema utilizará exclusivamente `puntaje_reglas`. El cliente seguirá recibiendo propiedades válidas y podrá solicitar atención humana.

### 6.5. Prevención de respuestas inventadas

El prompt del sistema deberá indicar:

- No inventar propiedades.
- No modificar precios, direcciones ni disponibilidad.
- Utilizar únicamente la información proporcionada por Django.
- Reconocer cuando no existen coincidencias.
- Pedir autorización antes de agendar una cita.
- Ofrecer comunicación con un agente humano cuando no pueda resolver la solicitud.

### 6.6. Límites del contexto enviado a Gemini

El adaptador enviará únicamente:

- Mensajes necesarios de la conversación.
- Preferencias inmobiliarias autorizadas.
- Identificador público de cada propiedad candidata.
- Precio, ubicación general y características publicadas.
- Instrucciones de respuesta y formato estructurado.

No enviará contraseñas, documentos, datos bancarios, notas administrativas, teléfonos ni correos personales.

---

## 7. Arquitectura del chat en tiempo real

HouseBroker Perú utilizará **un solo chat continuo**. El widget estará visible permanentemente en el sitio y la agente virtual responderá las 24 horas. Si el cliente no desea continuar con la IA, podrá pedir atención humana en esa misma conversación.

### 7.1. Transferencia de la agente virtual a un agente humano

```mermaid
sequenceDiagram
    participant C as Cliente
    participant UI as Chat React
    participant D as Django
    participant IA as Agente virtual
    participant A as Agente humano

    C->>UI: Solicita hablar con un agente
    UI->>D: Solicita transferencia
    D->>D: Conserva historial y recomendaciones
    D-->>UI: Confirma solicitud
    UI-->>C: Un agente se comunicará en breve
    D-->>A: Notifica conversación pendiente
    A->>D: Acepta la conversación
    D-->>UI: Informa que el agente ingresó
    A-->>C: Continúa en el mismo chat
```

Mensaje automático recomendado:

> Entendido. He solicitado la atención de un agente inmobiliario. Uno de nuestros agentes se comunicará contigo en breve por este mismo chat. Mientras esperas, puedes seguir revisando las propiedades recomendadas.

Reglas de la transferencia:

- No se creará una conversación nueva.
- El cliente permanecerá en la misma ventana de chat.
- La agente virtual dejará de responder automáticamente cuando un agente humano acepte la conversación.
- El agente humano verá el historial, el resumen de necesidades y las propiedades recomendadas.
- Si ningún agente está conectado, la conversación quedará en cola y el cliente podrá seguir navegando.
- Cuando un agente acepte la conversación, el cliente recibirá una notificación.
- Al cerrar la atención humana, el sistema podrá volver al modo virtual si el cliente inicia una nueva consulta.

### 7.2. Estados de la conversación

```mermaid
stateDiagram-v2
    [*] --> BOT_ACTIVE
    BOT_ACTIVE --> WAITING_AGENT: solicita agente
    WAITING_AGENT --> HUMAN_ACTIVE: agente acepta
    HUMAN_ACTIVE --> CLOSED: atención finalizada
    WAITING_AGENT --> BOT_ACTIVE: cliente cancela solicitud
    CLOSED --> BOT_ACTIVE: nueva consulta
```

| Estado | Descripción |
|---|---|
| `BOT_ACTIVE` | La agente virtual atiende automáticamente |
| `WAITING_AGENT` | El cliente solicitó atención y está en cola |
| `HUMAN_ACTIVE` | Un agente humano tomó la conversación |
| `CLOSED` | La atención fue finalizada |

### 7.3. Entrega de mensajes en tiempo real

```mermaid
sequenceDiagram
    participant C as Cliente
    participant W as WebSocket
    participant R as Redis
    participant A as Agente
    participant D as PostgreSQL

    C->>W: Envía mensaje
    W->>D: Guarda mensaje
    W->>R: Publica evento
    R-->>A: Entrega mensaje
    A->>W: Marca como leído
    W->>D: Actualiza estado
    W-->>C: Confirma lectura
```

Los mensajes se guardarán en PostgreSQL antes de confirmar su entrega. Redis no será el almacenamiento definitivo.

### 7.4. Estados de presencia

- **Conectado:** mantiene una conexión WebSocket activa.
- **Ausente:** no registra actividad durante un periodo configurado.
- **Desconectado:** no posee conexión activa o superó el tiempo máximo de presencia.

La presencia se mantendrá en Redis con expiración automática y se actualizará mediante señales periódicas del navegador.

---

## 8. Modelo conceptual de datos

```mermaid
erDiagram
    USUARIO ||--o| PERFIL_CLIENTE : posee
    USUARIO ||--o| PERFIL_AGENTE : posee
    PERFIL_AGENTE ||--o{ PROPIEDAD : administra
    USUARIO ||--o{ CITA : solicita
    PROPIEDAD ||--o{ CITA : recibe
    CONVERSACION ||--o{ MENSAJE : contiene
    USUARIO ||--o{ MENSAJE : envia
    USUARIO ||--o{ CONVERSACION : participa
    CONVERSACION ||--o{ RECOMENDACION_IA : genera
    PROPIEDAD ||--o{ RECOMENDACION_IA : aparece
    CONVERSACION ||--o{ SOLICITUD_ATENCION : registra
    PERFIL_AGENTE ||--o{ SOLICITUD_ATENCION : atiende
```

### Entidades principales

| Entidad | Información principal |
|---|---|
| Usuario | correo, contraseña cifrada, rol, estado, último acceso |
| PerfilCliente | nombres, teléfono y preferencias autorizadas |
| PerfilAgente | datos profesionales, disponibilidad y estado laboral |
| Propiedad | código, tipo, modalidad, precio, dirección, ubicación y estado |
| ImagenPropiedad | archivo, orden y texto alternativo |
| Favorito | cliente y propiedad seleccionada |
| Cita | cliente, agente, propiedad, fecha, hora y estado |
| Conversación | cliente, agente asignado, modo actual, estado y fecha de inicio |
| Mensaje | emisor, contenido, fecha y estado de lectura |
| SesiónIA | contexto permitido y preferencias extraídas |
| RecomendaciónIA | propiedad, puntuación, posición y explicación |
| SolicitudAtención | conversación, fecha de solicitud, agente asignado, fecha de aceptación y estado |
| Notificación | destinatario, tipo, contenido y estado de lectura |
| Auditoría | usuario, acción, entidad afectada, fecha y datos de control |

### Eliminación lógica

Los usuarios, propiedades y registros críticos deberán incluir campos como:

```text
is_active
deleted_at
created_at
updated_at
```

La eliminación lógica evita perder historial relacionado con citas, conversaciones o transacciones.

---

## 9. API REST propuesta

### Autenticación

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/register/` | Registrar cliente |
| POST | `/api/auth/login/` | Iniciar sesión |
| POST | `/api/auth/refresh/` | Renovar sesión |
| POST | `/api/auth/logout/` | Cerrar sesión |
| POST | `/api/auth/password-reset/` | Recuperar contraseña |
| GET | `/api/auth/me/` | Consultar usuario actual |

### Propiedades

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/properties/` | Listar y filtrar propiedades disponibles |
| GET | `/api/properties/{id}/` | Consultar detalle |
| POST | `/api/properties/` | Crear propiedad |
| PATCH | `/api/properties/{id}/` | Editar propiedad |
| DELETE | `/api/properties/{id}/` | Realizar eliminación lógica |
| POST | `/api/properties/{id}/favorite/` | Agregar o retirar favorito |

### Citas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/appointments/` | Listar citas autorizadas para el usuario |
| POST | `/api/appointments/` | Agendar visita |
| PATCH | `/api/appointments/{id}/` | Confirmar, cancelar o reprogramar |
| GET | `/api/agents/{id}/availability/` | Consultar disponibilidad del agente |

### Chat unificado y asistente virtual

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/conversations/` | Iniciar el chat único en modo virtual |
| GET | `/api/conversations/{id}/` | Consultar estado y participante actual |
| GET | `/api/conversations/{id}/recommendations/` | Consultar recomendaciones de la IA |
| POST | `/api/conversations/{id}/handoff/` | Solicitar atención humana en el mismo chat |
| POST | `/api/conversations/{id}/handoff/cancel/` | Cancelar la espera y regresar al asistente |
| POST | `/api/agent/conversations/{id}/accept/` | Permitir que un agente acepte la conversación |
| POST | `/api/agent/conversations/{id}/close/` | Finalizar la atención humana |

### Chat humano

| Canal | Endpoint | Descripción |
|---|---|---|
| GET | `/api/conversations/` | Listar conversaciones |
| GET | `/api/conversations/{id}/messages/` | Consultar historial paginado |
| WebSocket | `/ws/conversations/{id}/` | Enviar y recibir mensajes en tiempo real |
| WebSocket | `/ws/agent/queue/` | Notificar conversaciones que esperan un agente |
| WebSocket | `/ws/notifications/` | Recibir notificaciones personales |

### Administración

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/dashboard/` | Métricas generales |
| GET | `/api/admin/users/` | Gestión de usuarios |
| PATCH | `/api/admin/users/{id}/status/` | Activar o suspender usuario |
| GET | `/api/admin/agents/presence/` | Consultar estado de agentes |
| GET | `/api/admin/reports/` | Consultar reportes |
| GET | `/api/admin/audit/` | Consultar auditoría |

---

## 10. Roles y permisos

| Acción | Cliente | Agente | Administrador |
|---|:---:|:---:|:---:|
| Ver propiedades disponibles | Sí | Sí | Sí |
| Guardar favoritos | Sí | No | No |
| Utilizar asistente virtual | Sí | Consulta | Supervisión |
| Agendar una cita | Sí | Gestión | Gestión total |
| Conversar por chat | Sí | Sí | Supervisión autorizada |
| Crear o editar propiedades | No | Asignadas | Sí |
| Cambiar disponibilidad | No | Asignadas | Sí |
| Gestionar usuarios | No | No | Sí |
| Suspender cuentas | No | No | Sí |
| Consultar dashboard general | No | Limitado | Sí |
| Consultar auditoría | No | No | Sí |

Los permisos se validarán siempre en el backend. Ocultar botones en React no reemplaza la autorización en Django.

---

## 11. Seguridad

### 11.1. Autenticación y sesiones

- Utilizar contraseñas cifradas con el sistema seguro de Django.
- Guardar los tokens en cookies `HttpOnly`, `Secure` y con política `SameSite` adecuada.
- Implementar expiración y renovación de sesión.
- Aplicar protección CSRF cuando se utilicen cookies.
- Limitar intentos fallidos de inicio de sesión.
- Cerrar conexiones WebSocket cuando la sesión deje de ser válida.

### 11.2. Protección de la API

- Validar y normalizar todos los datos recibidos.
- Aplicar permisos por rol y por objeto.
- Limitar solicitudes al login, chatbot y recuperación de contraseña.
- Configurar CORS exclusivamente para los dominios autorizados.
- No mostrar errores internos ni información sensible al usuario.
- Registrar operaciones administrativas en auditoría.

### 11.3. Protección de credenciales

Las claves se almacenarán como variables de entorno:

```env
DJANGO_SECRET_KEY=valor_secreto
DATABASE_URL=postgresql://usuario:clave@servidor:5432/housebroker
REDIS_URL=redis://servidor:6379/0
GEMINI_API_KEY=clave_privada
GEMINI_MODEL=gemini-3.1-flash-lite
FRONTEND_URL=https://housebroker.pe
```

El archivo `.env` no deberá subirse al repositorio.

### 11.4. Privacidad en el uso de IA

- No enviar contraseñas, documentos de identidad ni información financiera a Gemini.
- No enviar teléfonos o correos si no son necesarios para la respuesta.
- Reemplazar los identificadores internos por referencias temporales.
- Informar al cliente cuando está conversando con un asistente virtual.
- Solicitar consentimiento para almacenar preferencias cuando corresponda.
- Establecer una política de conservación de conversaciones.

### 11.5. Archivos e imágenes

- Validar extensión, tipo MIME y tamaño.
- Cambiar nombres de archivos en el servidor.
- Almacenar imágenes en un servicio de objetos durante producción.
- Generar miniaturas para el catálogo.
- Impedir la ejecución de archivos subidos por usuarios.

---

## 12. Manejo de errores y continuidad

### Si Gemini no responde

1. Django aplica un tiempo máximo de espera.
2. Registra el error técnico sin exponer la clave.
3. Devuelve un mensaje amigable al cliente.
4. Permite reintentar una vez de forma controlada.
5. Ofrece continuar con filtros tradicionales o hablar con un agente.

Mensaje sugerido:

> En este momento no puedo completar la recomendación automática. Puedes continuar usando nuestros filtros o solicitar la atención de un agente inmobiliario.

### Si se alcanza el límite gratuito

- Desactivar temporalmente nuevas conversaciones automáticas.
- Mantener disponible el catálogo y el chat humano.
- Notificar al administrador.
- Permitir cambiar el modelo desde una variable de entorno.
- Evitar dependencias directas del proveedor dentro de las vistas de Django.

### Respaldo

- Realizar copias de seguridad periódicas de PostgreSQL.
- Conservar imágenes en almacenamiento redundante.
- Probar la restauración de respaldos.
- Mantener registros de auditoría separados de los logs técnicos.

---

## 13. Estructura recomendada del repositorio

```text
housebroker-peru/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/
│   │   ├── properties/
│   │   ├── appointments/
│   │   ├── conversations/
│   │   ├── assistant/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── audit/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── service.py
│   │   │   ├── prompts.py
│   │   │   └── adapters/
│   │   │       └── gemini_adapter.py
│   │   ├── recommendations/
│   │   │   ├── service.py
│   │   │   ├── sql_filters.py
│   │   │   ├── rule_scoring.py
│   │   │   └── ranking.py
│   │   ├── conversations/
│   │   │   ├── handoff.py
│   │   │   └── presence.py
│   │   └── notifications.py
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── properties/
│   │   │   ├── appointments/
│   │   │   ├── assistant/
│   │   │   ├── chat/
│   │   │   └── dashboard/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── 02_Arquitectura.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

`services/ai/service.py` definirá la interfaz `AIService` y `gemini_adapter.py` implementará la conexión inicial. `RecommendationService` coordinará los filtros SQL, la puntuación objetiva, el scoring del LLM y el ranking final. Esta separación permitirá añadir otro proveedor o un modelo local sin alterar los módulos de citas, propiedades o conversaciones.

---

## 14. Despliegue propuesto

```mermaid
flowchart TD
    WEB["Navegador"] --> NG["Nginx / HTTPS"]
    NG --> RE["React estático"]
    NG --> DJ["Django ASGI"]
    DJ --> PG["PostgreSQL"]
    DJ --> RD["Redis"]
    DJ --> AIS["AIService"]
    AIS --> GM["GeminiAdapter / Gemini API"]
    DJ --> ST["Almacenamiento de imágenes"]
```

### Entorno de desarrollo

- React con servidor de desarrollo.
- Django en modo desarrollo.
- PostgreSQL y Redis mediante Docker.
- Clave de Gemini para pruebas.
- Correos y notificaciones simulados cuando sea necesario.

### Entorno de producción

- HTTPS obligatorio.
- React compilado como archivos estáticos.
- Django ejecutado mediante ASGI.
- PostgreSQL administrado o aislado de Internet.
- Redis protegido y sin exposición pública.
- Almacenamiento externo para imágenes.
- Variables de entorno gestionadas por el servidor.
- Monitoreo de errores, disponibilidad y consumo de la API de IA.

---

## 15. Requisitos no funcionales

| Categoría | Requisito inicial |
|---|---|
| Disponibilidad | La búsqueda y el catálogo deben funcionar aunque la IA esté temporalmente inactiva |
| Rendimiento | Las páginas principales deben responder rápidamente con paginación e índices |
| Seguridad | Todo acceso privado requiere autenticación y permisos en Django |
| Usabilidad | Diseño adaptable a computadora, tablet y celular |
| Accesibilidad | Navegación por teclado, contraste adecuado y textos alternativos |
| Escalabilidad | Backend sin estado de sesión local y Redis compartido |
| Mantenibilidad | Módulos separados y proveedor de IA desacoplado |
| Auditoría | Registro de acciones administrativas y cambios críticos |
| Privacidad | Minimización de información enviada a servicios externos |
| Recuperación | Respaldos automáticos y procedimiento de restauración probado |

---

## 16. Fases sugeridas de implementación

### Fase 1: Base del sistema

- Crear repositorio y entornos.
- Configurar Django, React y PostgreSQL.
- Implementar usuarios, roles y autenticación.
- Crear catálogo y administración de propiedades.

### Fase 2: Citas

- Disponibilidad del agente.
- Agendamiento y reprogramación.
- Calendario del agente.
- Notificaciones básicas.

### Fase 3: Chat humano

- Configurar Django Channels y Redis.
- Implementar el chat único, las conversaciones y los mensajes.
- Añadir presencia, mensajes no leídos y estados de lectura.
- Implementar la cola de espera y la transferencia al agente.
- Mantener el historial al cambiar de atención virtual a humana.

### Fase 4: Asistente virtual

- Crear la interfaz `AIService` y el `GeminiAdapter`.
- Extraer preferencias en JSON.
- Implementar el pipeline híbrido de recomendación.
- Implementar filtros SQL, scoring por reglas, scoring LLM y ranking final.
- Guardar y mostrar las recomendaciones.
- Crear el resumen automático que recibirá el agente humano.
- Probar el fallback sin Gemini.

### Fase 5: Administración y calidad

- Dashboard y reportes.
- Auditoría.
- Pruebas de permisos, seguridad y rendimiento.
- Respaldo, monitoreo y despliegue.

---

## 17. Decisiones arquitectónicas principales

1. **Django será la única puerta de acceso a los datos.** React y Gemini no se conectarán directamente a PostgreSQL.
2. **Gemini se utilizará mediante el patrón Adapter.** Django dependerá de `AIService` y no directamente del SDK del proveedor.
3. **PostgreSQL será la fuente de verdad.** Redis solo conservará información temporal.
4. **La recomendación será híbrida.** PostgreSQL filtrará candidatos, `RecommendationService` aplicará reglas y el LLM realizará scoring semántico controlado.
5. **El chat será único y estará visible las 24 horas.** Comenzará con la agente virtual y permitirá transferir la misma conversación a un agente humano.
6. **Los permisos se aplicarán en el backend.** La interfaz solo reflejará lo que Django autorice.
7. **Los registros importantes usarán eliminación lógica.** Se conservará la trazabilidad de citas y conversaciones.
8. **La indisponibilidad de Gemini no detendrá el sistema.** El ranking por reglas, el catálogo y la atención humana continuarán funcionando.

---

## 18. Conclusión

La arquitectura propuesta utiliza **React con TypeScript**, **Django REST Framework**, **PostgreSQL**, **Django Channels**, **Redis** y **Gemini mediante un Adapter**. Esta combinación permite construir una plataforma inmobiliaria moderna, segura y escalable.

El pipeline híbrido garantiza que las propiedades candidatas provengan de filtros SQL verificables, mientras el LLM aporta interpretación semántica únicamente sobre esos candidatos. Además, el chat único 24/7 permite comenzar con la agente virtual y solicitar atención humana sin perder el historial, las preferencias ni las recomendaciones generadas. Si la IA no está disponible, el sistema continuará operativo mediante el ranking por reglas, el catálogo y la atención de los agentes inmobiliarios.
