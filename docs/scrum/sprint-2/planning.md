# Sprint Planning — Sprint 2: Catálogo y Filtros de Propiedades

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 2 (Semanas 5–6)  
**Scrum Master:** Brandy Sinche  
**Equipo de Desarrollo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

## Objetivo del Sprint (Sprint Goal)

> Implementar la búsqueda y navegación del catálogo de propiedades con paginación, filtros combinados dinámicos y persistencia en URL, garantizando contratos de API REST especificados, pruebas unitarias integradas y cumplimiento del estándar de accesibilidad WCAG 2.2 AA.

## 1. Capacidad y Velocidad Estimada

- **Capacidad bruta:** 160 horas (4 desarrolladores × 20 h/semana × 2 semanas).
- **Capacidad efectiva:** 110 horas, considerando eventos Scrum, revisiones de PR y refactorización.
- **Story Points comprometidos:** 21 SP (`HU-PROP-02`: 13 SP | `HU-PROP-03`: 8 SP).

## 2. Sprint Backlog

### HU-PROP-02 — Consultar catálogo de propiedades (13 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-PROP-02` | Especificar contrato API REST OpenAPI 3.0 para `/api/v1/properties`, incluyendo paginación (`page`, `limit`) y errores estándar. | Brandy Sinche | 6 | N/A |
| `TASK-UI-PROP-02` | Diseñar `PropertyCard`, `PropertyGrid` y `PaginationControl` en Figma, incluyendo Skeleton. | Jhon Ordoñez | 8 | N/A |
| `TASK-FRONT-PROP-02` | Implementar catálogo paginado y detalle de inmueble en React consumiendo la API. | Yohan Ñato | 16 | `TASK-ARC-PROP-02` |
| `TASK-BACK-PROP-02` | Implementar endpoint paginado en Django REST Framework con `PageNumberPagination` y serializadores optimizados. | Brandy Sinche | 12 | `TASK-ARC-PROP-02` |
| `TASK-TEST-PROP-02` | Implementar pruebas unitarias e integración con Jest / React Testing Library para catálogo y paginación. | Anderson Villanes | 8 | `TASK-FRONT-PROP-02` |
| `TASK-A11Y-PROP-02` | Aplicar navegación por teclado y etiquetas ARIA (`aria-live`, `aria-label`) para WCAG 2.2 AA. | Jhon Ordoñez | 6 | `TASK-FRONT-PROP-02` |
| `TASK-WPO-PROP-02` | Configurar Lazy Loading de imágenes y `React.lazy`/`Suspense` para optimizar la carga inicial. | Anderson Villanes | 6 | `TASK-FRONT-PROP-02` |

### HU-PROP-03 — Buscar propiedades mediante filtros dinámicos (8 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-PROP-03` | Diseñar Query Parameters (`minPrice`, `maxPrice`, `propertyType`, `ubigeo`) y sincronización con la URL. | Brandy Sinche | 4 | `TASK-ARC-PROP-02` |
| `TASK-UI-PROP-03` | Diseñar panel lateral de filtros responsivo (Desktop/Mobile Drawer). | Jhon Ordoñez | 6 | `TASK-UI-PROP-02` |
| `TASK-FRONT-PROP-03` | Implementar filtros combinados en React sincronizados con los search parameters del navegador. | Yohan Ñato | 12 | `TASK-FRONT-PROP-02` |
| `TASK-BACK-PROP-03` | Configurar `django-filter` y `DjangoFilterBackend` para consultas ORM multitabla. | Brandy Sinche | 10 | `TASK-BACK-PROP-02` |
| `TASK-TEST-PROP-03` | Implementar pruebas para filtrado, limpieza de estado y parsing de URL. | Anderson Villanes | 6 | `TASK-FRONT-PROP-03` |
| `TASK-A11Y-PROP-03` | Garantizar accesibilidad en sliders, checkboxes y selects mediante roles ARIA adecuados. | Jhon Ordoñez | 4 | `TASK-FRONT-PROP-03` |
| `TASK-WPO-PROP-03` | Implementar Debounce de 300 ms para reducir peticiones durante la búsqueda de texto. | Anderson Villanes | 4 | `TASK-FRONT-PROP-03` |

## 3. Definition of Ready (DoR)

- Criterios de aceptación definidos y validados por el Product Owner en formato Given-When-Then.
- Contrato OpenAPI 3.0 de `v1` de propiedades redactado y aprobado.
- Wireframes y componentes del sistema de diseño disponibles en Figma.
- Estimación realizada por el equipo mediante Planning Poker.

## 4. Definition of Done (DoD)

- Código integrado en `main` mediante Pull Request con al menos una revisión/aprobación.
- Cobertura de pruebas unitarias ≥ 80% en los módulos desarrollados.
- Endpoints REST probados y con tiempos inferiores a 300 ms en Staging.
- Cero errores críticos en SonarQube / ESLint.
- AXE DevTools sin violaciones de nivel A o AA.

## 5. Criterios de Éxito

Al finalizar el Sprint 2 se debe poder demostrar:

1. Consulta del catálogo de propiedades.
2. Navegación mediante paginación.
3. Aplicación de filtros combinados.
4. Persistencia de filtros mediante URL.
5. Integración funcional React + Django REST Framework.
6. Pruebas y validaciones de accesibilidad conforme a la DoD.

**Importante:** las métricas de cobertura, rendimiento y accesibilidad deben registrarse únicamente después de ejecutar las pruebas. No se deben inventar resultados.

## 6. Entregables

- Incremento funcional del catálogo.
- Filtros combinados funcionales.
- Documentación/contrato API actualizado.
- Componentes y estados correspondientes en Figma.
- Pruebas unitarias/integración.
- Evidencias de accesibilidad.
- Pull Requests revisados y fusionados.
- Sprint Review.
- Retrospectiva y acciones de mejora.
