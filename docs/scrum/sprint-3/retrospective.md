# Sprint Retrospective — Sprint 3: Autenticación y Disponibilidad

**Proyecto:** HouseBroker Perú  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Fecha:** 25 de septiembre de 2026  
**Formato:** Mad, Sad, Glad (Enojo, Tristeza, Alegría)  
**Participantes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## 1. Dinámica de Selección

### Glad (Lo que funcionó y debemos mantener)
* **Ajuste realista de capacidad:** Planificar 90 horas en lugar de 160 horas por la semana de exámenes parciales evitó el burnout y permitió entregar el 100% de los puntos comprometidos.
* **Seguridad en cookies HttpOnly:** La decisión de migrar el almacenamiento de tokens de `localStorage` a cookies HttpOnly elevó notablemente la seguridad del sistema y simplificó la sincronización con el backend.
* **Actualización optimista de disponibilidad:** El panel de disponibilidad refleja los cambios de inmediato en React antes de esperar la respuesta de red, mejorando la percepción de rendimiento.
* **Contratos OpenAPI tempranos:** Mantener el contrato OpenAPI antes de codificar redujo los malentendidos entre frontend y backend.

### Sad (Lo que no salió tan bien)
* **Pruebas de cookies en Jest:** La suite de pruebas de integración en Jest asumía inicialmente lectura de tokens desde `localStorage`, por lo que requirió refactorizar mocks para simular correctamente cookies de sesión.
* **Disponibilidad asimétrica durante exámenes:** La coincidencia de fechas de entrega de parciales generó picos de trabajo concentrados en los últimos 3 días del sprint.

### Mad (Lo que causó frustración)
* **Solapamiento inicial en franjas horarias:** La primera versión del selector de horarios permitía crear intervalos que se cruzaban entre sí en el frontend; se tuvo que implementar validación cruzada y restricción `UniqueConstraint` / validación en Django para impedirlo sólidamente.

---

## 2. Plan de Acción (Action Items)

| # | Acción de Mejora | Responsable | Compromiso |
| :-: | :--- | :--- | :--- |
| 1 | Diseñar un validador genérico de franjas horarias en frontend reutilizable para el agendamiento de citas del Sprint 4. | Yohan Ñato | Sprint 4 - Día 2 |
| 2 | Configurar un helper común de pruebas para simular sesiones autenticadas tanto en backend (pytest fixtures) como en frontend. | Anderson Villanes | Sprint 4 - Día 1 |
| 3 | Mantener el ritmo de dailies de máximo 15 minutos enfocadas exclusivamente en sincronización y bloqueos. | Brandy Sinche | Sprint 4 - Continuo |
| 4 | Crear una suite de pruebas para transiciones inválidas de estado en la máquina de citas. | Jhon Ordoñez | Sprint 4 - Día 4 |
