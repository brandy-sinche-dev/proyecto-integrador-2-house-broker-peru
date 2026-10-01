# HouseBroker Perú

Sistema Web Inteligente de Gestión Inmobiliaria, Recomendación Personalizada de Propiedades y Agendamiento de Citas.

Plataforma web que conecta a agentes, compradores e inquilinos (Lima Metropolitana) en un solo entorno digital: catálogo de propiedades, búsqueda con filtros, asistente virtual con IA 24/7, CRM de clientes y citas, y chat en tiempo real. Desarrollada como **Proyecto Integrador II** bajo metodología **Scrum** (18 semanas / 7 sprints).

**Repositorio:** https://github.com/brandy-sinche-dev/proyecto-integrador-2-house-broker-peru

---

## Equipo

| Rol en Scrum | Integrante | Responsabilidad principal |
|---|---|---|
| Scrum Master / Lead Engineer | Brandy Sinche | Facilitar Scrum, arquitectura, GitHub Flow, integración Backend/IA, documentación |
| Product Owner (simulado) / Backend | Jhon Ordoñez | Priorizar backlog, valor, criterios de aceptación, Django REST |
| Analyst / Frontend | Yohan Ñato | Modelado PostgreSQL, lógica de negocio, integración de servicios |
| QA Engineer / Frontend | Anderson Villanes | React + TypeScript, pruebas (Jest), rendimiento, accesibilidad WCAG |

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Python 3.12+, Django 5.1+, Django REST Framework |
| Base de datos | PostgreSQL 16 |
| Tiempo real | Django Channels + WebSockets + Redis |
| IA | Gemini (patrón Adapter intercambiable) |
| Autenticación | JWT en cookies HttpOnly |
| Infraestructura | Docker / Docker Compose |

---

## 1. Requerimientos y Backlog

### 1.1 Épicas

El backlog se organiza bajo la jerarquía **ÉPICA → HU → TASK** (toda tarea pertenece a una HU, nunca directo a la épica).

| Épica | Ámbito | HU |
|---|---|---|
| **EPIC-PROP** | Gestión de Propiedades | HU-PROP-01 a 05 |
| **EPIC-CRM** | Gestión de Clientes y Citas | HU-CRM-01 a 05 |
| **EPIC-SEC** | Seguridad, Autenticación y Comunicación | HU-SEC-01 a 06 |
| **EPIC-AI** | Inteligencia Artificial y Recomendaciones | HU-AI-01 a 05 |

> **Mostrar en el repo:** `docs/scrum/backlog.md` (tabla de épicas y HU) · `docs/01_requerimientos.md` (SRS v2.0, secc. 3).

### 1.2 Historias de Usuario (21)

| Épica | HU |
|---|---|
| PROP | HU-PROP-01 Registrar/editar propiedades · HU-PROP-02 Consultar catálogo · HU-PROP-03 Buscar con filtros · HU-PROP-04 Gestionar disponibilidad · HU-PROP-05 Favoritos |
| CRM | HU-CRM-01 Agendar visita · HU-CRM-02 Gestionar citas · HU-CRM-03 Ficha/historial del cliente · HU-CRM-04 Observaciones · HU-CRM-05 Dashboard y reportes |
| SEC | HU-SEC-01 Registro/login · HU-SEC-02 Recuperar contraseña · HU-SEC-03 Chat en tiempo real · HU-SEC-04 Estado de conexión · HU-SEC-05 Notificaciones · HU-SEC-06 Supervisión/auditoría |
| AI | HU-AI-01 Asistente virtual 24/7 · HU-AI-02 Preferencias y contexto · HU-AI-03 Recomendaciones personalizadas · HU-AI-04 Derivación a agente humano · HU-AI-05 Supervisión del bot |

Cada HU usa el formato de las **3C**: Card (enunciado) + Conversation (notas) + Confirmation (criterios de aceptación en **Gherkin**).

> **Mostrar en el repo:** `docs/scrum/backlog.md` · `Laboratorios/Laboratorio_01/*/Laboratorio_01.md` (secc. 9–10: HU con 3C y Gherkin).

### 1.3 Product Backlog Priorizado

Tallas S/M/L · Riesgo Bajo/Medio/Alto. Priorización por flujo de negocio e interdependencias.

| Prioridad | HU | Dependencias | Riesgo | Tamaño |
|:---:|---|---|:---:|:---:|
| Alta | HU-PROP-01 Registrar propiedades | — | Medio | L |
| Alta | HU-PROP-02 Catálogo | HU-PROP-01 | Bajo | L |
| Alta | HU-PROP-03 Búsqueda con filtros | HU-PROP-02 | Medio | M |
| Alta | HU-CRM-01 Agendar visita | HU-PROP-02, HU-SEC-01 | Medio | M |
| Alta | HU-SEC-01 Registro e inicio de sesión | — | Alto | L |
| Alta | HU-SEC-03 Chat con agente | HU-SEC-01 | Alto | L |
| Alta | HU-AI-01 Asistente 24/7 | HU-SEC-01 | Alto | L |
| Alta | HU-AI-03 Recomendaciones | HU-AI-02, HU-PROP-03 | Alto | L |
| Media | HU-PROP-04, HU-PROP-05, HU-CRM-02..05, HU-SEC-02, HU-SEC-04..06, HU-AI-02, HU-AI-04, HU-AI-05 | — | Bajo/Alto | S–L |

> **Mostrar en el repo:** `Laboratorios/Laboratorio_01/*/Laboratorio_01.md` (secc. 11, tabla completa con valor, tamaño y riesgo).

### 1.4 Scrum

**Roles** (ver tabla "Equipo"): Scrum Master, PO simulado, Developers, QA.

| Sprint | Semanas | Enfoque | Hito académico |
|---|---|---|---|
| Sprint 0 | 1–2 | Setup, arquitectura, Figma, backlog inicial | — |
| Sprint 1 | 3–4 | Primer incremento (Vertical Slice con Mocks) | — |
| Sprint 2 | 5–6 | Catálogo + filtros, expansión UI | **APF1** |
| Sprint 3 | 7–8 | Carga reducida (exámenes parciales) | — |
| Sprint 4 | 9–10 | Integración Full-Stack (backend real + PostgreSQL) | **APF2** |
| Sprint 5 | 11–12 | Servicios avanzados y tiempo real | — |
| Sprint 6 | 13–14 | Servicios complejos / IA | **APF3** |
| Sprint 7 | 15–16 | Estabilización, QA, WPO, A11y, métricas | — |
| Cierre | 17–18 | Code freeze, documentación final | **Entrega final** |

Métricas y artefactos ejecutados: Sprint Planning (goal, DoR, DoD), Daily Scrum, Sprint Review, Retrospectiva (Mad/Sad/Glad) y tablero en GitHub Projects. Ejemplo real: **Sprint 1** completó HU-PROP-01 (13 pts) con 100% de velocidad; **Sprint 2** (en curso) comprometió HU-PROP-02 + HU-PROP-03 = 21 pts.

> **Mostrar en el repo:** `docs/scrum/sprint-1/planning.md`, `dailies.md`, `review.md`, `retrospective.md` · `docs/scrum/sprint-2/planning.md`. Doc de gestión (privado) no se presenta: resumen en `skills/`.

---

## 2. Roadmap del Proyecto

| Fase | Entregable | Contenido principal |
|---|---|---|
| **Sprint 1–2 (sem. 3–6)** | Hito APF1 | UI en React con mocks (propiedades: registro/edición, catálogo paginado, filtros), accesibilidad WCAG, Jest |
| **Sprint 4 (sem. 9–10)** | Hito APF2 | Backend real Django + PostgreSQL, autenticación por roles (JWT), CRM de citas y clientes, contrato API OpenAPI |
| **Sprint 6 (sem. 13–14)** | Hito APF3 | Chat en tiempo real (WebSockets), asistente IA 24/7 con Gemini, recomendador personalizado, auditoría del bot |
| **Sprint 7 (sem. 15–16)** | Estabilización | QA, rendimiento (WPO), accesibilidad (WCAG 2.2 AA), SLI/SLO/SLA |
| **Sem. 17–18** | Entrega final | Cierre técnico y documentación para presentación |

> **Mostrar en el repo:** `Laboratorios/Laboratorio_01/*/Laboratorio_01.md` (secc. 12–13: sprint planning y Gantt) · `skills/gestion_proyecto.md` (estrategia general, privado) · `docs/scrum/*/planning.md`. Estado actual del código: `frontend/src` (módulo de propiedades con mocks) y `backend/` (Django scaffold).

---

## 3. Estructura del proyecto

```
├── backend/          # API y lógica del servidor (Django + DRF + PostgreSQL)
├── frontend/         # Interfaz de usuario (React + TypeScript + Vite)
├── docs/             # Documentación: requerimientos, arquitectura, UX/UI, scrum, git workflow, SLI/SLO
├── infra/            # Infraestructura y Docker Compose (PostgreSQL)
├── Laboratorios/     # Laboratorios de clase (por integrante)
├── Secciones/        # Evidencia de las sesiones de clase
└── skills/           # Documentos internos de gestión (NO versionado — en .gitignore)
```

> **Mostrar en el repo:** `docs/` (Índice de documentación: `00_Acta_Planificacion_y_Negocio.md`, `01_requerimientos.md`, `02_Arquitectura.md`, `doc-03-06_UX_UI`, `07_SLO_SLI_SLA.md`, `scrum/`, `api/openapi_spec.yaml`).

---

## 4. Laboratorios y Secciones

- **Laboratorios/**: prácticas asignadas por el profesor; cada laboratorio contiene su documentación y evidencias por integrante (Laboratorio 01: propuesta ágil y backlog; 02: entorno y prototipo; 03: riesgos e incremento frontend; 04: SLI/SLO y optimización).
- **Secciones/**: materiales y resultados de las sesiones de clase impartidas por el profesor.

> **Mostrar en el repo:** `Laboratorios/Laboratorio_0X/<Integrante>/` y `Secciones/` (capturas por sesión).