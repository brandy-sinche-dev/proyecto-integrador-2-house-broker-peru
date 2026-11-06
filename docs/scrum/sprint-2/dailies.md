# Bitácora de Daily Scrums — Sprint 2 (APF1 Final)

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 2 (Semanas 5–6)  
**Integrantes:** Brandy Sinche (Scrum Master / Dev 1), Jhon Ordoñez (Dev 2), Yohan Ñato (Dev 3), Anderson Villanes (Dev 4)

---

## Día 1: Lunes 31/08/2026
* **Duración:** 13 minutos (09:00 AM - 09:13 AM)
* **Asistencia:** Brandy Sinche (Presente), Jhon Ordoñez (Presente), Yohan Ñato (Presente), Anderson Villanes (Presente)
* **Sincronización:**
  * **Brandy Sinche:** Cerró el contrato OpenAPI de `/api/v1/properties` con paginación (`page`, `limit`) y errores estándar. Hoy iniciará el endpoint paginado con `PageNumberPagination`. Sin bloqueos.
  * **Jhon Ordoñez:** Levantó los wireframes de `PropertyCard`, `PropertyGrid` y `PaginationControl`, incluido el estado Skeleton. Hoy completará el prototipo de detalle en Figma. Sin bloqueos.
  * **Yohan Ñato:** Preparó la estructura de `services/properties.ts` y los mocks de listado. Hoy implementará el catálogo paginado en React. Sin bloqueos.
  * **Anderson Villanes:** Configuró Jest y React Testing Library para los componentes del catálogo. Hoy escribirá las primeras pruebas de renderizado de `PropertyCard`. Sin bloqueos.
* **Evidencia:** Contrato y mocks en `docs/api/openapi_spec.yaml` y `frontend/src/services/mocks/`.

---

## Día 2: Miércoles 02/09/2026
* **Duración:** 11 minutos (09:00 AM - 09:11 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Implementó el listado paginado y la optimización de consultas con `select_related`. Hoy definirá los parámetros de búsqueda del catálogo. Sin bloqueos.
  * **Jhon Ordoñez:** Terminó el prototipo del detalle de propiedad y la paginación. Hoy diseñará el panel lateral de filtros. Sin bloqueos.
  * **Yohan Ñato:** Integró el catálogo y el detalle consumiendo la API simulada. Hoy conectará la paginación con los parámetros de la URL. Sin bloqueos.
  * **Anderson Villanes:** Completadas las pruebas de `PropertyCard` y `Pagination`. Hoy cubrirá los estados vacío, error y carga. Sin bloqueos.
* **Evidencia:** Avance de UI en `frontend/src/components/properties/` y pruebas en `PropertyCard.test.jsx` / `Pagination.test.jsx`.

---

## Día 3: Lunes 07/09/2026
* **Duración:** 12 minutos (09:00 AM - 09:12 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Especificó los query parameters de filtros y configuró `django-filter` con `DjangoFilterBackend`. Hoy validará consultas multitabla por distrito y tipo. Sin bloqueos.
  * **Jhon Ordoñez:** Entregó el panel de filtros responsive (desktop y drawer móvil). Hoy revisará etiquetas ARIA y navegación por teclado. Sin bloqueos.
  * **Yohan Ñato:** Implementó los filtros combinados sincronizados con los search params. **Bloqueo:** duplicidad de estado entre el formulario y la URL generaba doble petición; se resolvió con `useFilterParams` como única fuente de verdad.
  * **Anderson Villanes:** Añadió pruebas de filtrado y parsing de URL. Hoy implementará la prueba del `debounce` de 300 ms. Sin bloqueos.
* **Evidencia:** Panel de filtros en `FilterSidebar.tsx` y pruebas en `useFilterParams.test.jsx`.

---

## Día 4: Miércoles 09/09/2026
* **Duración:** 14 minutos (09:00 AM - 09:14 AM)
* **Asistencia:** Todos presentes.
* **Sincronización:**
  * **Brandy Sinche:** Cerró el contrato de filtros y dejó el endpoint documentado con ejemplos. Hoy consolidará la evidencia del Sprint para la revisión APF1. Sin bloqueos.
  * **Jhon Ordoñez:** Ejecutó la auditoría AXE de los componentes de filtros y documentó los ajustes aplicados. Hoy preparará las capturas para la demostración. Sin bloqueos.
  * **Yohan Ñato:** Aplicó carga diferida de imágenes y `React.lazy`/`Suspense` en el catálogo. Hoy verificará el rendimiento en la pestaña Network. Sin bloqueos.
  * **Anderson Villanes:** Corrió la suite completa del frontend: 222/222 pruebas en verde y cobertura de los módulos de catálogo/filtros de 98.61% en sentencias. Hoy apoyará la integración del PR final. Sin bloqueos.
* **Evidencia:** `docs/12_Pruebas_Automatizadas.md`, capturas en `docs/scrum/sprint-2/evidencias/`.
