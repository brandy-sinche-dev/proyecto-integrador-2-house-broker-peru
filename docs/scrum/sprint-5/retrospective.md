# Sprint Retrospective — Sprint 5: Historial de Clientes, Observaciones y Chat

**Proyecto:** HouseBroker Perú  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Fecha:** 23 de octubre de 2026  
**Formato:** Mad, Sad, Glad (Enojo, Tristeza, Alegría)  
**Participantes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## 1. Dinámica de Selección

### Glad (Lo que funcionó y debemos mantener)
* **Integración exitosa de WebSockets:** La combinación de Django Channels con Redis como Channel Layer permitió un chat rápido, seguro y desacoplado del servidor HTTP.
* **Ficha de cliente 360°:** Integrar en una sola pantalla citas, favoritos y notas facilitó sustancialmente la operativa del agente.
* **Manejo de errores y reintentos:** Las notas de atención con mutación optimista y notificación de error mejoraron la robustez percibida por el usuario.
* **Alta cobertura de pruebas:** Se superó el 93% de cobertura en backend cumpliendo con creces la meta del proyecto.

### Sad (Lo que no salió tan bien)
* **Configuración de Redis en local:** Algunos desarrolladores tuvieron dificultades menores al correr Redis en Windows nativo sin Docker; se resolvió homogeneizando el uso de Docker Compose para servicios de apoyo.
* **Complejidad del testing de WebSockets:** Probar sockets de forma asíncrona en Jest requirió mockear la clase WebSocket nativa, lo cual tomó más tiempo del estimado.

### Mad (Lo que causó frustración)
* **Efectos duplicados en React 19 (StrictMode):** En desarrollo, los efectos que inicializaban la conexión WebSocket se ejecutaban dos veces, provocando handshakes dobles hasta que se encapsuló en un hook con ref de conexión activa y cleanup estricto.

---

## 2. Plan de Acción (Action Items para el Sprint 6 — Hito APF 3)

| # | Acción de Mejora | Responsable | Compromiso |
| :-: | :--- | :--- | :--- |
| 1 | Diseñar la arquitectura del Asistente IA usando el patrón Adapter para aislar la API de Gemini del frontend y backend. | Brandy Sinche | Sprint 6 - Día 1 |
| 2 | Reutilizar el componente de chat existente para integrar las respuestas del bot IA y la derivación a agente humano. | Yohan Ñato | Sprint 6 - Día 2 |
| 3 | Crear fixtures de preferencias y catálogo para evaluar la precisión del algoritmo de recomendaciones (scoring). | Anderson Villanes | Sprint 6 - Día 3 |
| 4 | Diseñar en Figma las interfaces de feedback del bot, tarjeta de recomendación y derivación con estados de carga IA. | Jhon Ordoñez | Sprint 6 - Día 1 |
