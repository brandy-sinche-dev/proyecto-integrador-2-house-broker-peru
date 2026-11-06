# Sprint Planning — Sprint 6: Inteligencia Artificial, Recomendaciones y Derivación (Hito APF 3)

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 6 (Semanas 13–14: 26 de octubre de 2026 – 06 de noviembre de 2026)  
**Scrum Master:** Brandy Sinche  
**Equipo de Desarrollo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes  
**Hito Académico Asociado:** **APF 3 (Avance de Proyecto Final 3)**

---

## Objetivo del Sprint (Sprint Goal)

> Implementar las capacidades de Inteligencia Artificial del sistema mediante el Asistente Virtual 24/7 (LLM Gemini con patrón Adapter), el motor de captura de preferencias y scoring de recomendaciones inmobiliarias personalizadas, y el mecanismo de derivación contextual hacia agentes humanos a través del chat en tiempo real, garantizando la trazabilidad con React, Django REST Framework, cobertura de pruebas ≥ 80% y cumplimiento del estándar de accesibilidad WCAG 2.2 AA.

---

## 1. Capacidad y Velocidad Estimada

- **Miembros del equipo:** 4 desarrolladores.
- **Capacidad bruta:** 160 horas (4 desarrolladores × 20 h/semana × 2 semanas).
- **Capacidad efectiva:** 110 horas, considerando ceremonias Scrum, revisiones de Pull Requests, auditorías de accesibilidad y estabilización para el Hito APF 3.
- **Story Points comprometidos:** **28 SP** distribuidos en 4 Historias de Usuario:
  * `HU-AI-01` — Conversar con el asistente virtual 24/7 (8 SP)
  * `HU-AI-02` — Guardar preferencias y contexto de búsqueda (5 SP)
  * `HU-AI-03` — Recibir recomendaciones personalizadas de inmuebles (8 SP)
  * `HU-AI-04` — Solicitar atención de un agente humano / derivación (7 SP)

---

## 2. Sprint Backlog Desglosado por Tareas

### [HU-AI-01] Conversar con el asistente virtual 24/7 (8 SP)

> *Como comprador o inquilino, quiero interactuar con un asistente virtual disponible las 24 horas del día para resolver dudas inmediatas sobre propiedades, requisitos y procesos de arrendamiento o compra.*

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-AI-01` | Diseñar contrato API REST y eventos WebSocket para `/api/v1/ai/assistant/chat`, definiendo el patrón Adapter intercambiable para LLMs (Gemini / Claude / OpenAI). | Brandy Sinche | 4 | N/A |
| `TASK-UI-AI-01` | Diseñar interfaz en Figma para el asistente virtual (`AssistantWidget`): estados de carga con animación de escritura (*typing indicator*), mensajes del bot y sugerencias rápidas (*quick prompts*). | Jhon Ordoñez | 5 | N/A |
| `TASK-FRONT-AI-01` | Implementar componente interactivo en React para la conversación fluida con el bot, soporte para streaming de respuestas y reintentos ante desconexión. | Yohan Ñato | 12 | `TASK-ARC-AI-01` |
| `TASK-BACK-AI-01` | Implementar servicio Adapter en Django conectando con la API de Google Gemini (SDK `google-genai`), con prompt del sistema inmobiliario peruano y límites de tokens. | Brandy Sinche | 10 | `TASK-ARC-AI-01` |
| `TASK-TEST-AI-01` | Implementar pruebas unitarias y mocks en Jest y Pytest para respuestas del bot, validación de schemas de mensaje y manejo de rate-limiting (HTTP 429). | Anderson Villanes | 5 | `TASK-FRONT-AI-01` |
| `TASK-A11Y-AI-01` | Garantizar accesibilidad en el chat con IA: atributo `aria-live="polite"` para mensajes entrantes, foco accesible y atajos de teclado para apertura y cierre (`Esc`). | Jhon Ordoñez | 3 | `TASK-FRONT-AI-01` |
| `TASK-WPO-AI-01` | Optimizar rendimiento del chat con IA mediante carga bajo demanda (`React.lazy`) y renderizado eficiente de mensajes largos sin reflows. | Anderson Villanes | 3 | `TASK-FRONT-AI-01` |

---

### [HU-AI-02] Guardar preferencias y contexto de búsqueda (5 SP)

> *Como usuario interesado, quiero que el sistema registre mis preferencias inmobiliarias (distritos, presupuesto, número de habitaciones, mascotas) a través de la conversación o de mis filtros para recibir sugerencias relevantes.*

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-AI-02` | Diseñar contrato API REST para `/api/v1/ai/preferences` (`GET`, `PUT`, `PATCH`) y esquema JSON de perfil de búsqueda del cliente. | Brandy Sinche | 3 | `TASK-ARC-AI-01` |
| `TASK-UI-AI-02` | Diseñar panel de "Mis Preferencias" en Figma con sliders de presupuesto, selector de distritos prioritarios y chips de amenidades deseadas. | Jhon Ordoñez | 4 | `TASK-UI-AI-01` |
| `TASK-FRONT-AI-02` | Implementar formulario y contexto de preferencias en React con guardado automático y sincronización con el historial de navegación. | Yohan Ñato | 8 | `TASK-ARC-AI-02` |
| `TASK-BACK-AI-02` | Desarrollar modelo `UserPreference` en PostgreSQL y extractor semántico que infiere preferencias a partir de las preguntas realizadas al bot. | Brandy Sinche | 7 | `TASK-ARC-AI-02` |
| `TASK-TEST-AI-02` | Pruebas unitarias para validar la extracción correcta de entidades (distritos, rangos de precio) y persistencia del perfil de preferencias. | Anderson Villanes | 4 | `TASK-FRONT-AI-02` |
| `TASK-A11Y-AI-02` | Asegurar que los selectores y chips de preferencias cumplan con contraste WCAG 2.2 AA y soporte para lectores de pantalla (`aria-checked`). | Jhon Ordoñez | 3 | `TASK-FRONT-AI-02` |
| `TASK-WPO-AI-02` | Aplicar almacenamiento en caché local (`IndexedDB` o `sessionStorage`) de las preferencias para evitar consultas redundantes a la API. | Anderson Villanes | 2 | `TASK-FRONT-AI-02` |

---

### [HU-AI-03] Recibir recomendaciones personalizadas de inmuebles (8 SP)

> *Como cliente, quiero recibir recomendaciones inteligentes de propiedades basadas en mi perfil y preferencias, con una explicación de por qué coinciden con mi búsqueda.*

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-AI-03` | Diseñar contrato API REST para `/api/v1/ai/recommendations` con parámetros de ponderación (*scoring* de afinidad: 0% a 100%). | Brandy Sinche | 4 | `TASK-ARC-AI-02` |
| `TASK-UI-AI-03` | Diseñar tarjeta de recomendación en Figma (`RecommendationCard`) que muestre el porcentaje de afinidad ("95% de coincidencia") y etiqueta explicativa. | Jhon Ordoñez | 5 | `TASK-UI-AI-02` |
| `TASK-FRONT-AI-03` | Implementar sección "Recomendadas para ti" en la página principal y en el asistente con carrusel responsivo y badge de match score. | Yohan Ñato | 10 | `TASK-ARC-AI-03` |
| `TASK-BACK-AI-03` | Implementar algoritmo de recomendación y ranking ponderado en Django combinando filtros duros (precio, distrito) con filtros blandos (amenidades, mascotas). | Brandy Sinche | 9 | `TASK-BACK-AI-02` |
| `TASK-TEST-AI-03` | Pruebas de integración sobre el algoritmo de scoring para validar que propiedades que cumplen más criterios obtengan mayor puntaje de afinidad. | Anderson Villanes | 5 | `TASK-FRONT-AI-03` |
| `TASK-A11Y-AI-03` | Garantizar que el indicador de afinidad sea descriptivo para lectores de pantalla (`aria-label="Coincidencia del 92% según tus preferencias"`). | Jhon Ordoñez | 3 | `TASK-FRONT-AI-03` |
| `TASK-WPO-AI-03` | Optimizar el cálculo de recomendaciones en backend mediante consultas `select_related`/`prefetch_related` y cálculo asíncrono no bloqueante. | Anderson Villanes | 3 | `TASK-BACK-AI-03` |

---

### [HU-AI-04] Solicitar atención de un agente humano / derivación (7 SP)

> *Como cliente que requiere atención especializada o negociación, quiero poder transferir la conversación desde el asistente virtual hacia un agente humano sin perder el contexto de lo conversado.*

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-AI-04` | Diseñar contrato para `/api/v1/ai/handoff` que gestione la cola de derivación y la transferencia del historial de chat al agente responsable. | Brandy Sinche | 4 | `TASK-ARC-AI-01` |
| `TASK-UI-AI-04` | Diseñar el flujo de transición en Figma: botón "Hablar con un asesor humano", indicador de "Agente asignado: [Nombre]" y alerta de tiempo de espera. | Jhon Ordoñez | 4 | `TASK-UI-AI-01` |
| `TASK-FRONT-AI-04` | Implementar en React la transición visual fluida entre el modo Asistente IA y el modo Agente Humano en la misma ventana de chat. | Yohan Ñato | 9 | `TASK-ARC-AI-04` |
| `TASK-BACK-AI-04` | Desarrollar lógica de enrutamiento en Django Channels para reasignar la sala de chat desde el bot hacia el agente inmobiliario disponible de la propiedad. | Brandy Sinche | 8 | `TASK-BACK-AI-01` |
| `TASK-TEST-AI-04` | Pruebas unitarias y de integración para la persistencia del resumen de la conversación y notificación instantánea al agente en su panel. | Anderson Villanes | 4 | `TASK-FRONT-AI-04` |
| `TASK-A11Y-AI-04` | Incluir anuncio sonoro y textual accesible (`aria-live="assertive"`) cuando un agente humano toma el control de la conversación. | Jhon Ordoñez | 3 | `TASK-FRONT-AI-04` |
| `TASK-WPO-AI-04` | Garantizar que el traspaso de mensajes no genere re-renderizados completos del historial del chat. | Anderson Villanes | 2 | `TASK-FRONT-AI-04` |

---

## 3. Definition of Ready (DoR)

Para dar por iniciado el trabajo de cada historia en el Sprint 6 se verificó:
1. **Criterios de Aceptación Claros:** Criterios en formato Gherkin (Given-When-Then) redactados para el bot, recomendaciones y derivación.
2. **Contratos OpenAPI Aprobados:** Especificación técnica de `/api/v1/ai/*` documentada en `docs/api/openapi_spec.yaml`.
3. **Prototipos en Figma Validados:** Componente de chat con IA, badge de afinidad y flujo de traspaso diseñados con los 5 estados de UI (loading, empty, error, ideal, partial).
4. **API Key y Mocks de LLM:** Configuración del SDK de Gemini y mocks para pruebas automatizadas sin depender de cuotas externas en CI/CD.
5. **Estimación Consensuada:** Puntos de historia asignados mediante Planning Poker por los 4 integrantes del equipo.

---

## 4. Definition of Done (DoD)

Para considerar completada cada tarea y dar por cerrada una HU en el Sprint 6:
1. **Integración en `main`:** Código integrado mediante Pull Request revisado y aprobado por al menos 1 par sin advertencias críticas.
2. **Pruebas Automatizadas:** Cobertura de pruebas unitarias e integración ≥ 80% en los módulos de IA, scoring y derivación.
3. **Resiliencia de IA:** Manejo robusto de errores de conectividad (fallback cuando el servicio de IA no responde o excede tiempo límite).
4. **Accesibilidad WCAG 2.2 AA:** Auditoría AXE DevTools aprobada sin violaciones de nivel A o AA en el asistente y tarjetas de recomendación.
5. **Rendimiento Aceptable:** Tiempo de respuesta percibido del bot con indicador de escritura menor a 1.5 s y renderizado fluido sin CLS.
6. **Despliegue y Pruebas en Staging:** Funcionalidades verificadas en entorno local con Docker Compose antes de la presentación del **APF 3**.

---

## 5. Criterios de Éxito del Sprint 6 (Hito APF 3)

Al concluir el Sprint 6 se demostrará con éxito:
1. Un cliente puede mantener una conversación coherente con el Asistente Virtual sobre propiedades en catálogo.
2. El sistema infiere y guarda preferencias de búsqueda del cliente.
3. El catálogo y la página de inicio destacan recomendaciones personalizadas con porcentaje de afinidad explícito.
4. El cliente puede solicitar en cualquier momento la atención de un agente humano, transfiriendo la conversación al chat directo.
5. Todo el incremento opera con pruebas automatizadas, sin errores en consola y cumpliendo accesibilidad WCAG 2.2 AA.
