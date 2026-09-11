# Roadmap de Sprints — HouseBroker Perú

**Equipo:** Brandy Sinche (Scrum Master), Jhon Ordoñez, Yohan Ñato, Anderson Villanes
**Ciclo:** 7 sprints × 2 semanas = 18 semanas del curso Integrador

---

## Asignación de HU por Sprint

| Sprint | Semanas | Hito | HU asignadas | Puntos |
|:---:|:---:|:---:|---|:---:|
| **1** | 3–4 | Preparación | HU-PROP-01 (Registrar y editar propiedades) | 13 |
| **2** | 5–6 | **APF 1** | HU-PROP-02 (Catálogo), HU-PROP-03 (Filtros) | 21 |
| **3** | 7–8 | — | HU-SEC-01 (Auth), HU-SEC-02 (Recuperar contraseña), HU-PROP-04 (Disponibilidad) | 18 |
| **4** | 9–10 | **APF 2** | HU-CRM-01 (Agendar visita), HU-CRM-02 (Gestionar citas), HU-PROP-05 (Favoritas) | 18 |
| **5** | 11–12 | — | HU-CRM-03 (Ficha cliente), HU-CRM-04 (Observaciones), HU-SEC-03 (Chat) | 18 |
| **6** | 13–14 | **APF 3** | HU-AI-01 (Asistente virtual), HU-AI-02 (Preferencias), HU-AI-03 (Recomendaciones), HU-AI-04 (Agente humano) | 28 |
| **7** | 15–18 | **Entrega Final** | HU-CRM-05 (Dashboard/reportes), HU-SEC-04 (Estado conexión), HU-SEC-05 (Notificaciones), HU-SEC-06 (Auditoría), HU-AI-05 (Supervisión IA) | 21 |

---

## Detalle por Sprint

### Sprint 1 (semanas 3–4) — *Completado*

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-PROP-01 | Registrar y editar propiedades | Alta |

> Primer incremento funcional: formulario, listado y validación con mocks.

### Sprint 2 (semanas 5–6) — *Completado* → **APF 1**

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-PROP-02 | Consultar catálogo de propiedades | Alta |
| HU-PROP-03 | Buscar propiedades mediante filtros | Alta |

> Catálogo paginado, detalle de propiedad y filtros dinámicos con accesibilidad WCAG 2.2 AA.

### Sprint 3 (semanas 7–8) — Carga reducida (parciales)

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-SEC-01 | Registrarse e iniciar sesión | Alta |
| HU-SEC-02 | Recuperar contraseña | Media |
| HU-PROP-04 | Gestionar disponibilidad de propiedades | Media |

> Autenticación por roles (JWT) y gestión de disponibilidad. Carga reducida para no competir con parciales.

### Sprint 4 (semanas 9–10) → **APF 2**

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-CRM-01 | Agendar una visita | Alta |
| HU-CRM-02 | Gestionar citas | Media |
| HU-PROP-05 | Guardar propiedades favoritas | Media |

> Módulo CRM inicial: agendamiento de visitas, calendario y favoritos.

### Sprint 5 (semanas 11–12)

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-CRM-03 | Consultar ficha e historial del cliente | Media |
| HU-CRM-04 | Registrar observaciones de atención | Media |
| HU-SEC-03 | Comunicarse con un agente mediante chat | Alta |

> Complemento CRM + chat en tiempo real con WebSockets.

### Sprint 6 (semanas 13–14) → **APF 3**

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-AI-01 | Conversar con el asistente virtual 24/7 | Alta |
| HU-AI-02 | Guardar preferencias y contexto | Media |
| HU-AI-03 | Recibir recomendaciones personalizadas | Alta |
| HU-AI-04 | Solicitar atención de un agente humano | Media |

> Integración de IA: asistente virtual, scoring de preferencias y recomendaciones personalizadas.

### Sprint 7 (semanas 15–18) → **Entrega Final**

| HU | Descripción | Prioridad |
|---|---|:---:|
| HU-CRM-05 | Consultar dashboard y reportes | Media |
| HU-SEC-04 | Visualizar estado de conexión | Baja |
| HU-SEC-05 | Recibir notificaciones | Media |
| HU-SEC-06 | Supervisar y auditar conversaciones | Media |
| HU-AI-05 | Supervisar el funcionamiento del asistente IA | Media |

> Últimas HUs + integración completa + pruebas funcionales + documentación + preparación de presentación final.

---

## Diagrama de hitos

```
Sprint 1 (3-4)  ──▶  Sprint 2 (5-6)  ──▶  Sprint 3 (7-8)  ──▶  Sprint 4 (9-10) ──▶  Sprint 5 (11-12) ──▶  Sprint 6 (13-14) ──▶  Sprint 7 (15-18)
   Prep                  ◆ APF 1              Parciales            ◆ APF 2               Chat/CRM               ◆ APF 3               ★ ENTREGA FINAL
```

---

## Dependencias clave entre HU

| HU depende de | Razón |
|---|---|
| HU-PROP-03 → HU-PROP-02 | Filtros sobre catálogo existente |
| HU-SEC-01 → HU-PROP-01 | Auth necesaria para registro de propiedades |
| HU-CRM-01 → HU-SEC-01 + HU-PROP-02 | Agendar visita requiere auth y catálogo |
| HU-AI-03 → HU-AI-02 + HU-PROP-03 | Recomendaciones requieren preferencias + filtros |
| HU-AI-04 → HU-AI-01 + HU-SEC-03 | Escalar a humano requiere chat activo |
| HU-SEC-05 → HU-CRM-01 + HU-SEC-03 | Notificaciones de citas y mensajes |
| HU-CRM-05 → HU-CRM-02 + HU-CRM-04 | Dashboard consume datos de citas y observaciones |
