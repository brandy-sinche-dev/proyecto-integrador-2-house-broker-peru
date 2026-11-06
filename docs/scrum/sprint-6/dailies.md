# Bitácora de Daily Scrums — Sprint 6: IA, Recomendaciones y Derivación (Hito APF 3)

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 6 (Semanas 13–14: 26/10/2026 – 06/11/2026)  
**Integrantes:** Brandy Sinche (Scrum Master / Lead), Jhon Ordoñez (PO Simulado / Dev), Yohan Ñato (Analyst / Dev), Anderson Villanes (QA / Dev)

---

## Día 1: Lunes 26/10/2026
* **Duración:** 14 minutos (09:00 AM – 09:14 AM)
* **Asistencia:** Todos presentes (Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes).
* **Sincronización:**
  * **Brandy Sinche:** Especificó el contrato OpenAPI para `/api/v1/ai/assistant/chat`, `/api/v1/ai/preferences` y el endpoint de recomendaciones con scoring. Hoy estructurará la capa Adapter de IA en Django para desacoplar el proveedor LLM. Sin bloqueos.
  * **Jhon Ordoñez:** Diseñó en Figma las pantallas del Asistente Virtual 24/7 con animaciones de escritura (*typing indicator*) y chips de preguntas sugeridas. Hoy diseñará la tarjeta de propiedad recomendada con badge de match score. Sin bloqueos.
  * **Yohan Ñato:** Revisó el widget flotante del chat y preparó la lógica de estados en React para alternar entre el bot IA y el chat directo. Hoy implementará la UI inicial del asistente. Sin bloqueos.
  * **Anderson Villanes:** Configuró las fixtures de datos de prueba para el motor de recomendaciones y los mocks para la API de Gemini en Jest. Sin bloqueos.
* **Evidencia:** Contratos OpenAPI en `docs/api/openapi_spec.yaml` y prototipos Figma del Asistente IA.

---

## Día 2: Miércoles 28/10/2026
* **Duración:** 12 minutos (09:00 AM – 09:12 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Implementó el servicio backend `GeminiAdapter` con prompts del sistema contextualizados en el mercado inmobiliario limeño y control de excepciones. Hoy iniciará el modelo `UserPreference`. Sin bloqueos.
  * **Jhon Ordoñez:** Concluyó los diseños de la transición y botón "Hablar con un asesor humano" para la derivación contextual. Hoy apoyará en la accesibilidad del chat con IA. Sin bloqueos.
  * **Yohan Ñato:** Conectó el asistente en React con el servicio de IA, agregando soporte para streaming y renderizado de texto enriquecido. **Bloqueo:** Respuestas largas generaban scroll descontrolado; resuelto con auto-scroll inteligente que respeta si el usuario subió manualmente.
  * **Anderson Villanes:** Probó las respuestas del bot bajo diferentes condiciones de latencia y diseñó pruebas de límite de tasa (*rate limit*). Sin bloqueos.
* **Evidencia:** `AssistantWidget.tsx`, `gemini_service.py` y pruebas de integración inicial.

---

## Día 3: Lunes 02/11/2026
* **Duración:** 13 minutos (09:00 AM – 09:13 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Desarrolló el algoritmo de scoring de propiedades para `HU-AI-03`, ponderando ubicación (40%), presupuesto (35%), características (15%) y amenidades (10%). Hoy conectará las recomendaciones con la ficha del cliente. Sin bloqueos.
  * **Jhon Ordoñez:** Validó la legibilidad de las etiquetas de coincidencia ("94% de afinidad") y probó lectores de pantalla con NVDA. Hoy terminará los flujos de auditoría del bot. Sin bloqueos.
  * **Yohan Ñato:** Implementó la sección "Recomendadas para ti" en la página principal y tarjetas con badge de compatibilidad. Hoy implementará el flujo de derivación a agente humano (`HU-AI-04`). Sin bloqueos.
  * **Anderson Villanes:** Verificó la exactitud del cálculo de afinidad comparando resultados esperados vs obtenidos en la suite de pruebas unitarias. Sin bloqueos.
* **Evidencia:** Algoritmo de scoring en backend y carrusel de recomendaciones en frontend.

---

## Día 4: Miércoles 04/11/2026
* **Duración:** 15 minutos (09:00 AM – 09:15 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Implementó la transferencia de contexto del bot hacia el agente humano en Django Channels, enviando un resumen automático al agente asignado. Sin bloqueos.
  * **Jhon Ordoñez:** Realizó la auditoría AXE DevTools sobre el widget de IA y las recomendaciones: cero violaciones críticas de nivel AA. Hoy consolidará la documentación de diseño. Sin bloqueos.
  * **Yohan Ñato:** Concluyó la transición visual en la ventana de chat: al derivar, la cabecera cambia indicando el nombre y avatar del agente asignado. Sin bloqueos.
  * **Anderson Villanes:** Corrió la suite completa de pruebas: Pytest en backend (565 pruebas aprobadas, 0 fallos, >94% cobertura) y Jest en frontend. Todo listo para la revisión del Hito APF 3. Sin bloqueos.
* **Evidencia:** Flujo completo de derivación funcional, suite de pruebas automatizadas y reporte de calidad.
