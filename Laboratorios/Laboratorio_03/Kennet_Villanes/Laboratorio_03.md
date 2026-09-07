# Laboratorio 3 — Gestión de Riesgos e Incremento Front-End (React + TypeScript)

| Campo | Detalle |
|---|---|
| **Proyecto** | HouseBroker Perú — Sistema Web Inteligente de Gestión Inmobiliaria |
| **Autor** | Brandy Sinche |
| **Asignatura** | Proyecto Integrador / Ingeniería de Software |
| **Sprint actual** | Sprint 1 (Semanas 3–4) |
| **Entregable** | Primer incremento funcional del Front-End |

> Este laboratorio reemplaza el documento académico Angular por **React**: el incremento se diseña con componentes React, el build se documenta con los comandos del proyecto (`npm run build`) y los estados tipo "signals" se resuelven con **hooks** (`useState` / `useEffect`) sobre una interfaz TypeScript.
>
> **Estado general:** por acuerdo del equipo, el desarrollo del incremento, las pruebas manuales y las acciones de git están **pendientes de ejecutar**. Solo lo verificado se presenta como tal; el resto se marca "Pendiente de ejecutar".

---

## 1. Línea base

| Elemento | Definición |
|---|---|
| **HU seleccionada** | **HU-PROP-01 — Registrar y editar propiedades** (13 pts). Es la HU del Sprint 1, coherente con la semana del laboratorio. |
| **Épica** | EPIC-PROP — Gestión de Propiedades y Búsqueda. |
| **Sprint actual** | Sprint 1 (Semanas 3–4). |
| **Alcance del incremento** | Formulario de propiedad (flujo por pasos) y listado administrativo del agente, con validaciones y estados de UI (idle/loading/success/empty/error), consumiendo el Mock del CRUD de propiedades. |
| **Entorno verificado (Lab 2)** | React 19.2 + TypeScript 6.0 + Vite 8.2; `npm run build` del scaffold base: **✓ built sin errores** (evidencia registrada en el Laboratorio 2). |

---

## 2. Plan de riesgos

### 2.1 Categorías RBS

| Código | Categoría | Ejemplos dentro del proyecto |
|---|---|---|
| TEC | Técnico | Entorno, infraestructura, integración, rendimiento |
| GES | Gestión y equipo | Planificación, sprint, disponibilidad del equipo |
| REQ | Requisitos | Cambios, ambigüedad, feedback |
| ORG | Organización y proceso | Convenciones git, documentación, criterios del curso |
| EXT | Externo | Proveedor de IA, herramientas externas |

### 2.2 Escalas y exposición

| Escala | Valor | Descripción |
|---|---|---|
| Probabilidad (P) | 1–5 | 1: Muy baja · 5: Casi seguro |
| Impacto (I) | 1–5 | 1: Insignificante · 5: Catastrófico |

**Exposición (E) = P × I**

### 2.3 Umbrales de respuesta

| Rango | Nivel | Color | Respuesta |
|---|---|---|---|
| 1 – 4 | Bajo | 🟢 | Aceptar / monitorear |
| 5 – 9 | Medio | 🟡 | Mitigar con acciones planificadas |
| 10 – 15 | Alto | 🟠 | Tratamiento activo + responsable asignado |
| 16 – 25 | Crítico | 🔴 | Acción inmediata + escalamiento |

---

## 3. Registro de riesgos

| ID | Riesgo | Causa | Evento | Impacto | P | I | Exposición | Respuesta | Responsable |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Retraso en entorno Backend/BD | Python y Docker inactivos en equipos | No se puede conectar Django–PostgreSQL | Bloquea integración APF2 | 3 | 4 | **12 · Alto** | Mitigar: `docker-compose.yml` con PostgreSQL y pasos documentados (Lab 2) | Brandy |
| R-02 | Desalineación contrato API | Mocks y backend con formatos distintos | El formulario/lista no entiende la respuesta del API real | Retrabajo en APF2 | 3 | 5 | **15 · Alto** | Evitar: contrato OpenAPI v1.1 antes de los Mocks (TASK-ARC-PROP-01) | Brandy |
| R-03 | Regresiones sin detectar | No hay pruebas automatizadas (sin Vitest) | Rompe registro de propiedades sin darse cuenta | Calidad del APF1 | 4 | 3 | **12 · Alto** | Mitigar: configurar Vitest + RTL en los próximos días del sprint | Anderson |
| R-04 | Conflicto de puerto de PostgreSQL | Hay un PostgreSQL nativo en 5432 (verificado) | Fallo de conexión confuso | Demora infraestructura | 2 | 3 | **6 · Medio** | Evitar: contenedor en puerto 5433 ya documentado | Jhon |
| R-05 | Pruebas manuales no ejecutadas a tiempo | Checklist no vinculado al DoD | Keyboard/responsive sin validar en APF1 | Sustentación débil | 4 | 3 | **12 · Alto** | Mitigar: checklist en DoD y ejecutarlo antes del cierre del sprint | Anderson |
| R-06 | Accesibilidad WCAG detectada tarde | No se audita por sprint | Auditoría AXE Fallida en APF1 | No cumple estándares | 3 | 4 | **12 · Alto** | Mitigar: ejecutar AXE DevTools por sprint | Jhon |
| R-07 | Inconsistencias de git entre integrantes | Flujos y nomenclatura distintos | PRs conflictivos y merges desordenados | Pérdida de tiempo | 3 | 2 | **6 · Medio** | Evitar: guía `git_workflow_guide` + convención de ramas | Brandy |
| R-08 | Mocks con datos insuficientes | Fixture sin variedad de propiedades | Estados vacío y listado mal probados | Cobertura pobre | 3 | 3 | **9 · Medio** | Mitigar: fixture con 25+ propiedades variadas | Yohan |
| R-09 | Imágenes pesadas degradan el formulario/lista | Fotos sin optimizar | Carga lenta en el listado admin | WPO no aprobado | 2 | 3 | **6 · Medio** | Mitigar: `React.lazy` + `Suspense` y skeleton (TASK-WPO-PROP-01) | Anderson |
| R-10 | Integración front-back tardía | Mocks prolongados en el tiempo | Retrabajo al conectar la API real | Atraso en APF2 | 3 | 4 | **12 · Alto** | Mitigar: integrar gradualmente desde el inicio de APF2 | Brandy/Yohan |
| R-11 | Cambios de requisitos por feedback | Profesor/simulación de cliente | Campos del formulario modificados a mitad de sprint | Reprocesos | 3 | 2 | **6 · Medio** | Aceptar: canalizar por el PO al backlog | Jhon |
| R-12 | Baja velocidad por exámenes parciales | Calendario académico (Semanas 7–8) | Sprint 3 con menos entrega | Retraso acumulado | 4 | 3 | **12 · Alto** | Mitigar: reducir puntos en Sprint 3 (ya planificado) | Todo |
| R-13 | Evidencia insuficiente para sustentar | No registrar avances por día | Laboratorios sin respaldo | Nota final afectada | 3 | 3 | **9 · Medio** | Mitigar: registrar evidencias en dailies y lab | Brandy |
| R-14 | Commit directo a `main` | Error humano / falta de costumbre | Rama main inestable | Integración rota | 2 | 4 | **8 · Medio** | Evitar: branch protection + revisión por pares | Brandy |

---

## 4. Mapa de calor 5×5

Leyenda: 🟢 Bajo (1–4) · 🟡 Medio (5–9) · 🟠 Alto (10–15) · 🔴 Crítico (16–25). Valor = exposición; entre paréntesis los IDs de riesgos ubicados en la celda.

| P \ I | **I=1** | **I=2** | **I=3** | **I=4** | **I=5** |
|---|---|---|---|---|---|
| **P=5** | 🟢 5 | 🟠 10 | 🟠 15 | 🔴 20 | 🔴 25 |
| **P=4** | 🟢 4 | 🟡 8 | 🟠 12 · (R-03, R-05, R-12) | 🔴 16 | 🔴 20 |
| **P=3** | 🟢 3 | 🟡 6 · (R-07, R-11) | 🟡 9 · (R-08, R-13) | 🟠 12 · (R-01, R-06, R-10) | 🟠 15 · (R-02) |
| **P=2** | 🟢 2 | 🟢 4 | 🟡 6 · (R-04, R-09) | 🟡 8 · (R-14) | 🟠 10 |
| **P=1** | 🟢 1 | 🟢 2 | 🟢 3 | 🟢 4 | 🟡 5 |

**Resultado:** sin riesgos en zona Crítica. Hay **7 riesgos en zona Alta** (R-01, R-02, R-03, R-05, R-06, R-10, R-12) que reciben tratamiento activo (Sección 5).

---

## 5. Tratamiento de riesgos altos (E ≥ 10)

| ID | Riesgo | Estrategia | Tratamiento | Responsable | Seguimiento |
|---|---|---|---|---|---|
| R-02 | Contrato API desalineado | Evitar | Congelar el contrato del CRUD de propiedades (`/api/properties/`) antes de los Mocks | Brandy | Daily |
| R-01 | Entorno backend/BD | Mitigar | PostgreSQL vía Docker en el puerto 5433 + guía de instalación estándar (venv + pip) distribuida al equipo | Brandy | Cierre de Sprint 1 |
| R-03 | Regresiones | Mitigar | Instalar Vitest + React Testing Library y cubrir el formulario/lista de propiedades | Anderson | Antes del APF1 |
| R-05 | Pruebas manuales atrasadas | Mitigar | Checklist (teclado, responsive 320/768/1440, zoom 200 %, consola) como parte del DoD | Anderson | Cierre de Sprint 1 |
| R-06 | Accesibilidad tardía | Mitigar | Auditoría AXE DevTools por sprint con criterio WCAG 2.2 AA | Jhon | Cierre de Sprint 1 |
| R-10 | Integración front-back tardía | Mitigar | Cronograma de conexión al backend real desde el inicio de APF2 | Brandy/Yohan | Semanas 7–8 |
| R-12 | Parciales reducen velocidad | Mitigar | Sprint 3 con carga reducida (ya comprometido en el plan de 7 sprints) | Todo | Planificación Sprint 3 |

---

## 6. Integración de riesgos con el backlog

Cada riesgo relevante se ata a una tarea o HU existente para convertirlo en acción concreta.

| Riesgo | HU/Tarea vinculada | Acción en el backlog |
|---|---|---|
| R-02 | TASK-ARC-PROP-01 | Contrato OpenAPI del CRUD de propiedades como "Definition of Ready" |
| R-01 | TASK-MOCK-PROP-01 | Pico de infraestructura antes de integrar la BD |
| R-03 | TASK-TEST-PROP-01 | Agregar Vitest al entorno (pendiente de instalar) |
| R-05 | TASK-TEST-PROP-01 · TASK-A11Y-PROP-01 | Checklist de pruebas manuales al DoD de HU-PROP-01 |
| R-06 | TASK-A11Y-PROP-01 (ARIA + teclado) | Auditoría AXE en cada cierre de sprint |
| R-08 | TASK-MOCK-PROP-01 | Fixture mínimo de 25 propiedades variadas |
| R-09 | TASK-WPO-PROP-01 | `React.lazy` + `Suspense` para galería de imágenes |

---

## 7. Issue y rama del incremento Front-End

Nomenclatura acorde a las ramas ya existentes del repositorio (`docs/...`, `feature/...`) y commits convencionales (`feat:`, `docs:`).

| Elemento | Propuesta (coherente con Git) | Estado |
|---|---|---|
| **Issue** | `#<N> HU-PROP-01: Registrar y editar propiedades` · label `frontend` · 13 pts | Pendiente de crear |
| **Rama** | `feature/HU-PROP-01-registro-propiedades` (desde `main`) | Pendiente |
| **Commits** | `feat(property): agrega formulario de propiedad por pasos` · `feat(property): agrega listado administrativo` · `style(property): estilos responsive y estados` | Pendientes |
| **PR** | `HU-PROP-01: Registro y edición de propiedades` | Pendiente |

> Por acuerdo del equipo, **no se ejecutaron acciones de git** en este laboratorio; la fila anterior es la convención a usar y se materializa cuando se desarrolle el incremento.

---

## 8. Matriz prototipo → código

Reutiliza los frames del prototipo Figma (Lab 2 / `docs/06_UX_UI_PROP.md`, flujo de "Publicación de nueva propiedad").

| Frame Figma | Componente React | Estado | HU | Estado |
|---|---|---|---|---|
| Paso 1 Básicos (tipo, modalidad, ubicación, precio) | `PropertyBasicStep` | idle / validación | HU-PROP-01 | Pendiente de implementar |
| Paso 2 Detalles (características y amenidades) | `PropertyDetailsStep` | idle / validación | HU-PROP-01 | Pendiente |
| Paso 3 Fotos y multimedia | `MediaUploadStep` | idle / uploading / success | HU-PROP-01 | Pendiente |
| Paso 4 Cierre (condiciones de publicación) | `PropertyPublishStep` | loading / success | HU-PROP-01 | Pendiente |
| Listado administrativo | `PropertyListAdmin` | idle / loading / success / empty / error | HU-PROP-01 | Pendiente |

---

## 9. Implementación Front-End

> **Estado: Pendiente de ejecutar.** Por decisión del equipo el incremento aún no se ha desarrollado; se documenta el diseño objetivo que servirá de guía de implementación y sustentación. El scaffold base (Vite + React + TS) ya está verificado en el Laboratorio 2.

### 9.1 Modelo / interfaz TypeScript (objetivo)

Basado en RF-PROP-01 (SRS v2.0):

```ts
export interface Property {
  id: string;
  tipo: 'casa' | 'departamento';
  modalidad: 'venta' | 'alquiler';
  precio: number;
  moneda: 'PEN' | 'USD';
  distrito: string;
  direccion: string;
  metraje: number;
  habitaciones: number;
  banos: number;
  cochera: boolean;
  acepta_mascotas: boolean;
  fotos: string[];
  estado: 'borrador' | 'disponible' | 'reservada' | 'vendida' | 'alquilada';
}

export interface PropertyFormData {
  basic: Partial<Property>;
  details: Partial<Property>;
  media: { fotos: string[]; tour?: string };
  publish: { exclusividad: boolean; canales: string[] };
}
```

El estado `borrador` permite guardar la propiedad sin publicarla todavía (regla de negocio RB-01).

### 9.2 Componentes y página

- `PropertyForm` — formulario tipo **stepper** de 4 pasos (guarda `PropertyFormData`), con validación por paso.
- `PropertyListAdmin` — listado del agente con estados de disponibilidad y acciones editar/suspender.
- `MediaUploadStep` — carga de fotos, portada y plano (según el prototipo Figma).
- `usePropertyForm()` / `useProperties()` — hooks para el estado del formulario y el listado.

### 9.3 Estados de la página (hooks)

| Estado | Disparador | UI |
|---|---|---|
| idle | Antes de interactuar | Paso inicial del formulario / lista vacía sin datos |
| loading | Envío o carga en curso | Deshabilitar botones + spinner/skeleton |
| success | Registro/edición OK | Mensaje de éxito y reset del formulario |
| empty | La lista no tiene propiedades | `EmptyState` con acción "Registrar primera propiedad" |
| error | Fallo de red / validación | Mensaje de error + botón reintentar |

### 9.4 Responsive y accesibilidad (objetivo)

- Stepper responsive: pasos apilados en mobile (<768 px) y en horizontal en desktop.
- ARIA: `aria-invalid` en campos con error, `role="alert"` en mensajes, `alt` en imágenes.
- Navegación por teclado entre pasos y campos del formulario (WCAG 2.2 AA).

---

## 10. Pruebas

| Verificación | Método | Resultado |
|---|---|---|
| Navegación por teclado (tab/enter/espacio) | Prueba manual con teclado en el formulario | **Pendiente de ejecutar** |
| Responsive 320 px | DevTools → device toolbar del navegador | **Pendiente de ejecutar** |
| Responsive 768 px | Ídem (tablet) | **Pendiente de ejecutar** |
| Responsive 1440 px | Ídem (desktop) | **Pendiente de ejecutar** |
| Zoom 200 % | DevTools → zoom | **Pendiente de ejecutar** |
| Consola sin errores | DevTools → Console | **Pendiente de ejecutar** |
| Auditoría AXE WCAG 2.2 AA | Extensión AXE DevTools | **Pendiente de ejecutar** |

> Las pruebas anteriores se ejecutan una vez implementado el incremento (acuerdo del equipo); se incluye el checklist como parte del DoD para que no se olviden antes del cierre del sprint.

---

## 11. Build y pruebas (comandos del proyecto React)

Comandos reales del proyecto (NO los de Angular):

```bash
npm install        # instalar dependencias del frontend
npm run build      # tsc -b && vite build (verifica tipos + empaqueta)
npm run lint       # oxlint (linter del proyecto)
npm run dev        # servidor de desarrollo (http://localhost:5173)
```

| Comando | Resultado |
|---|---|
| `npm install` | Ejecutado sin errores (Lab 2, verificado) |
| `npm run build` | Scaffold base: `✓ built in 315ms` sin errores de TypeScript (verificado en Lab 2). **Build del incremento: Pendiente de ejecutar** |
| `npm run lint` | **Pendiente de ejecutar** sobre el incremento |
| Pruebas unitarias | No configuradas (Vitest no instalado por acuerdo del equipo; riesgo R-03) |

---

## 12. Pull Request (plantilla)

| Elemento | Detalle | Estado |
|---|---|---|
| Issue | `#<N> HU-PROP-01: Registrar y editar propiedades` | Pendiente |
| Rama | `feature/HU-PROP-01-registro-propiedades` → `main` | Pendiente |
| Commits | `feat(property): ...` (convención del repositorio) | Pendientes |
| Revisión por pares | Al menos 1 integrante aprueba (regla del equipo) | Pendiente |
| PR | Título `HU-PROP-01: Registro y edición de propiedades`, descripción con capturas + paso de pruebas | Pendiente |

> No se realizó ninguna operación de git en este laboratorio (acuerdo del equipo). El PR se abrirá cuando el incremento esté implementado.

---

## Referencias

- `docs/00_Acta_Planificacion_y_Negocio.md` — riesgos generales y cronograma.
- `docs/scrum/backlog.md` · `docs/scrum/sprint-1/planning.md` — backlog y planificación del Sprint 1.
- `docs/06_UX_UI_PROP.md` — prototipo Figma del módulo (flujo de publicación).
- `docs/01_requerimientos.md` — RF-PROP-01 (registro/edición de propiedades).
- Laboratorio 1 (trazabilidad) y Laboratorio 2 (entorno y componentes).