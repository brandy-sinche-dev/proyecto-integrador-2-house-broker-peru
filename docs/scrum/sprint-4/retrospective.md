# Sprint Retrospective — Sprint 4 (Hito APF 2)

**Proyecto:** HouseBroker Perú  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Fecha:** 09 de octubre de 2026  
**Formato:** Mad, Sad, Glad (Enojo, Tristeza, Alegría)  
**Participantes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## 1. Dinámica de Selección

### Glad (Lo que funcionó y debemos mantener)
* **Aprobación exitosa del Hito APF 2:** Se cumplió con todos los criterios evaluados por el docente (Full-Stack real, base de datos PostgreSQL, CRM inicial y accesibilidad).
* **React Query con Optimistic UI:** El manejo de estado para favoritos y citas mediante React Query simplificó la caché y ofreció una respuesta visual instantánea.
* **Trazabilidad de reglas de negocio:** La validación estricta de solapamiento de citas en Django evitó inconsistencias entre agentes y propiedades.
* **Colaboración en pair programming:** Las sesiones de programación en parejas para la integración de WebSockets y modales agilizaron la resolución de bugs.

### Sad (Lo que no salió tan bien)
* **Gestión de zonas horarias:** Se presentaron discrepancias iniciales entre la zona horaria del servidor (UTC) y la hora local de Lima (UTC-5) en los slots de citas, lo que requirió normalización con date-fns.
* **Carga de base de datos en pruebas:** La ejecución de pruebas de integración con PostgreSQL real en CI/CD tomó más tiempo del esperado; se optimizó aislando las pruebas unitarias con SQLite en memoria.

### Mad (Lo que causó frustración)
* **Paginación vs array plano en appointments:** El backend devolvía `{ count, next, previous, results: [...] }` mientras que algunos componentes en frontend esperaban un arreglo plano, provocando errores en las pruebas unitarias de citas que requirieron crear el helper `unwrapList`.

---

## 2. Plan de Acción (Action Items)

| # | Acción de Mejora | Responsable | Compromiso |
| :-: | :--- | :--- | :--- |
| 1 | Estandarizar el helper `unwrapList` en todos los clientes API de React para soportar transparentemente respuestas paginadas de DRF. | Yohan Ñato | Sprint 5 - Día 1 |
| 2 | Configurar Redis y Django Channels en Docker Compose con antelación para el módulo de chat en tiempo real. | Brandy Sinche | Sprint 5 - Día 1 |
| 3 | Mantener el runner rápido de pruebas con SQLite en memoria para desarrollo local y PostgreSQL para integración continua. | Anderson Villanes | Sprint 5 - Continuo |
| 4 | Elaborar el diseño de componentes para la ficha del cliente y notas del agente en Figma antes de iniciar la codificación. | Jhon Ordoñez | Sprint 5 - Día 2 |
