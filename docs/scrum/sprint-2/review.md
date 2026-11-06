# Sprint Review — Sprint 2 (APF1 Final)

**Proyecto:** HouseBroker Perú  
**Fecha de Revisión:** Final de la Semana 6  
**Asistentes:** Equipo Scrum, Profesor / Evaluador APF1

---

## 1. Objetivo de la Revisión

Presentar el incremento del catálogo de propiedades: consulta paginada, ficha de detalle y búsqueda mediante filtros combinados persistidos en la URL, con evidencia de pruebas automatizadas y accesibilidad de los componentes desarrollados.

---

## 2. Demostración del Incremento Funcional

### Funcionalidades demostradas

* **Catálogo paginado:** listado de propiedades con control de página, tamaño de página y estados de carga (Skeleton), vacío y error.
* **Detalle de propiedad:** ficha con precio, moneda, tipo de operación, dirección, características y galería.
* **Filtros combinados:** búsqueda por distrito, tipo de propiedad, moneda y rango de precio, sincronizada con los search params del navegador.
* **Persistencia en URL:** al recargar o compartir el enlace se conservan los filtros aplicados.
* **Accesibilidad:** navegación por teclado, etiquetas ARIA y anuncios `aria-live` en los componentes de catálogo y filtros.
* **Rendimiento:** carga diferida de imágenes y `React.lazy`/`Suspense` para el módulo de catálogo.

---

## 3. Estado de las Historias de Usuario

| ID Historia | Título | Estado | Puntos |
| :--- | :--- | :---: | :---: |
| `HU-PROP-02` | Consultar catálogo de propiedades | **DONE** | 13 |
| `HU-PROP-03` | Buscar propiedades mediante filtros | **DONE** | 8 |

**Velocidad comprometida:** 21 SP  
**Velocidad entregada:** 21 SP  
**Cumplimiento:** 100%

---

## 4. Métricas del Sprint

| Métrica | Resultado | Fuente |
| :--- | :--- | :--- |
| Pruebas backend del catálogo | 10/10 | `backend/apps/properties/tests/test_catalog.py` |
| Pruebas frontend (Jest + RTL) | 222/222 | `docs/12_Pruebas_Automatizadas.md` |
| Cobertura frontend (catálogo y filtros) | 98.61% sentencias | `docs/12_Pruebas_Automatizadas.md` |
| Pruebas totales del incremento | 232/232 | `docs/12_Pruebas_Automatizadas.md` |

> Las cifras corresponden a la ejecución registrada en la documentación del repositorio. No se reportan métricas de rendimiento que no hayan sido medidas.

---

## 5. Evidencias Entregadas

* Contrato OpenAPI de catálogo y filtros (`docs/api/openapi_spec.yaml`).
* Componentes `PropertyCard`, `PropertyGrid`, `PaginationControl`, `FilterSidebar` y `PropertyDetail`.
* Servicios y mocks de catálogo (`frontend/src/services/`).
* Documentos de pruebas y accesibilidad: `docs/08_TASK_A11Y_PROP_02.md`, `docs/09_TASK_TEST_PROP_02.md`, `docs/10_TASK_UI_PROP_02.md`, `docs/11_TASK_UI_PROP_03.md`, `docs/13_TASK_WPO_PROP_02.md`, `docs/14_TASK_TEST_PROP_03.md`, `docs/15_TASK_A11Y_PROP_03.md`.
* Capturas y registros en `docs/scrum/sprint-2/evidencias/`.

---

## 6. Retroalimentación del Evaluador / Product Owner

* **Fortalezas:** el catálogo responde a los criterios de aceptación de APF1; la paginación y los filtros se comportan de forma consistente y la URL funciona como fuente de verdad del estado.
* **Observaciones:** reforzar la prueba de estados de error de red y ampliar la cobertura de accesibilidad a la vista de detalle.
* **Acuerdos:** incorporar ambas observaciones al backlog del Sprint 3 y mantener la auditoría AXE como gate de la Definition of Done.
