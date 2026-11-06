# Sprint Retrospective — Sprint 2 (APF1 Final)

**Proyecto:** HouseBroker Perú  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Formato:** Mad, Sad, Glad (Enojo, Tristeza, Alegría)

---

## 1. Dinámica de Selección

### Glad (Lo que funcionó y debemos mantener)
* La definición temprana del contrato OpenAPI permitió que frontend y backend avanzaran en paralelo sin bloqueos.
* El uso de `useFilterParams` como única fuente de verdad eliminó la duplicidad de estado entre el formulario de filtros y la URL.
* La suite de Jest creció junto con los componentes, lo que permitió detectar regresiones de paginación antes del cierre.
* La revisión por pares de los PR mantuvo la calidad del código y el cumplimiento de la DoD.

### Sad (Lo que no salió tan bien)
* La configuración de los mocks de paginación consumió más tiempo del estimado en los dos primeros días.
* La cobertura de accesibilidad se concentró en el catálogo y quedó pendiente la vista de detalle.
* El estado de error de red no se cubrió con una prueba automatizada en este sprint.

### Mad (Lo que causó frustración)
* Un cambio simultáneo en `PropertyList` y en el hook de filtros generó conflictos de merge que retrasaron medio día de trabajo.
* La doble petición inicial del catálogo, provocada por dos efectos de carga, requirió refactorizar el hook de filtros.

---

## 2. Plan de Acción (Action Items)

| # | Acción de Mejora | Responsable | Compromiso |
| :-: | :--- | :--- | :--- |
| 1 | Ampliar la auditoría AXE a la vista de detalle y a los modales. | Jhon Ordoñez | Sprint 3 |
| 2 | Agregar pruebas de estados de error de red en los servicios del catálogo. | Anderson Villanes | Sprint 3 |
| 3 | Dividir los PR por componente y no por vista completa para reducir conflictos. | Todo el equipo | Inmediato |
| 4 | Documentar el patrón de sincronización de filtros con la URL en el README técnico. | Yohan Ñato | Sprint 3 |
