# Sprint Planning — Sprint 3: Autenticación, Usuarios y Gestión de Disponibilidad

**Proyecto:** HouseBroker Perú  
**Período:** Sprint 3 (Semanas 7–8)  
**Scrum Master:** Brandy Sinche  
**Equipo de Desarrollo:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes

---

## Objetivo del Sprint (Sprint Goal)

> Implementar la capa de seguridad y gestión de usuarios mediante autenticación JWT (registro, inicio de sesión y recuperación de contraseña) con control de acceso basado en roles (RBAC), junto con el módulo de gestión de disponibilidad de propiedades para agentes, garantizando la integración entre React y Django REST Framework, pruebas unitarias y cumplimiento del estándar de accesibilidad WCAG 2.2 AA.

---

## 1. Capacidad y Velocidad Estimada

- **Capacidad bruta:** 160 horas (4 desarrolladores × 20 h/semana × 2 semanas).
- **Capacidad efectiva:** 90 horas (capacidad ajustada por período de evaluaciones parciales/exámenes, considerando eventos Scrum y revisiones de PR).
- **Story Points comprometidos:** 18 SP (`HU-SEC-01`: 8 SP | `HU-SEC-02`: 5 SP | `HU-PROP-04`: 5 SP).

---

## 2. Sprint Backlog

### [HU-SEC-01] Registrarse e iniciar sesión (8 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-SEC-01` | Especificar contratos API REST OpenAPI 3.0 para `/api/v1/auth/register`, `/api/v1/auth/login` y `/api/v1/auth/refresh`, incluyendo esquemas JWT y roles (Cliente, Agente, Admin). | Brandy Sinche | 5 | N/A |
| `TASK-UI-SEC-01` | Diseñar interfaces UI/UX en Figma para formularios de Registro, Login y selección de rol, incluyendo estados de error y validación. | Jhon Ordoñez | 6 | N/A |
| `TASK-FRONT-SEC-01` | Implementar vistas de Login, Registro y gestión de tokens (JWT en HTTP-Only Cookies / Contexto React) con rutas protegidas (`ProtectedRoute`). | Yohan Ñato | 14 | `TASK-ARC-SEC-01` |
| `TASK-BACK-SEC-01` | Implementar endpoints de autenticación en Django REST Framework utilizando `simplejwt`, cifrado Bcrypt y middleware de permisos por rol (RBAC). | Brandy Sinche | 10 | `TASK-ARC-SEC-01` |
| `TASK-TEST-SEC-01` | Implementar pruebas unitarias e integración en Jest / React Testing Library para el flujo de autenticación, almacenamiento seguro de token y redirección. | Anderson Villanes | 6 | `TASK-FRONT-SEC-01` |
| `TASK-A11Y-SEC-01` | Aplicar accesibilidad en formularios de autenticación: etiquetas `<label>`, mensajes de error con `aria-describeby` y atributos `autocomplete`. | Jhon Ordoñez | 4 | `TASK-FRONT-SEC-01` |
| `TASK-WPO-SEC-01` | Optimizar la carga de la vista de autenticación evitando re-renders innecesarios en el formulario y aplicando validación asíncrona optimizada. | Anderson Villanes | 3 | `TASK-FRONT-SEC-01` |

---

### [HU-SEC-02] Recuperar contraseña (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-SEC-02` | Diseñar contrato API REST para `/api/v1/auth/password-reset/` y `/api/v1/auth/password-reset-confirm/` mediante tokens temporales firmado. | Brandy Sinche | 3 | `TASK-ARC-SEC-01` |
| `TASK-UI-SEC-02` | Diseñar flujos en Figma para "Olvidé mi contraseña", plantilla de correo transaccional y formulario de restablecimiento. | Jhon Ordoñez | 4 | `TASK-UI-SEC-01` |
| `TASK-FRONT-SEC-02` | Implementar flujo frontend de recuperación de contraseña (solicitud de correo y formulario de nueva clave con token de URL). | Yohan Ñato | 8 | `TASK-FRONT-SEC-01` |
| `TASK-BACK-SEC-02` | Configurar envío de correos transaccionales en Django REST Framework con generación de tokens cifrados de un solo uso (*PasswordResetTokenGenerator*). | Brandy Sinche | 6 | `TASK-BACK-SEC-01` |
| `TASK-TEST-SEC-02` | Implementar pruebas para validación de tokens de recuperación expirados, coincidencia de claves y manejo de errores. | Anderson Villanes | 4 | `TASK-FRONT-SEC-02` |
| `TASK-A11Y-SEC-02` | Garantizar accesibilidad en inputs de contraseña (indicador de fortaleza, opción mostrar/ocultar clave accesible mediante teclado). | Jhon Ordoñez | 3 | `TASK-FRONT-SEC-02` |
| `TASK-WPO-SEC-02` | Aplicar tasa límite (*Rate Limiting / Throttling*) en backend y frontend para evitar sobrecarga y ataques de fuerza bruta en peticiones de correo. | Anderson Villanes | 3 | `TASK-BACK-SEC-02` |

---

### [HU-PROP-04] Gestionar disponibilidad de propiedades (5 SP)

| ID Tarea | Descripción Técnica | Asignado | Est. (h) | Dependencia |
|---|---|---|---:|---|
| `TASK-ARC-PROP-04` | Diseñar contrato API REST para `/api/v1/properties/{id}/status` y `/api/v1/properties/{id}/schedules` para la gestión de estados y horarios por agente. | Brandy Sinche | 3 | `TASK-ARC-SEC-01` |
| `TASK-UI-PROP-04` | Diseñar interfaz de panel de administración de propiedad (cambio de estado: Disponible, Reservada, Vendida, Suspendida) y selector de horarios. | Jhon Ordoñez | 5 | `TASK-UI-SEC-01` |
| `TASK-FRONT-PROP-04` | Implementar panel de control de agente en React para actualización de estados de inmueble y configuración de días/horas disponibles. | Yohan Ñato | 10 | `TASK-FRONT-SEC-01` |
| `TASK-BACK-PROP-04` | Implementar lógica de negocio en Django para cambio de estados de propiedad y CRUD de bloques de horarios asignados a la propiedad. | Brandy Sinche | 8 | `TASK-BACK-SEC-01` |
| `TASK-TEST-PROP-04` | Implementar pruebas unitarias sobre restricciones de permisos (solo el agente asignado o Admin puede cambiar estados). | Anderson Villanes | 5 | `TASK-FRONT-PROP-04` |
| `TASK-A11Y-PROP-04` | Garantizar accesibilidad en selectores de fecha/hora y switches de estado utilizando roles ARIA (`aria-checked`, `role="switch"`). | Jhon Ordoñez | 3 | `TASK-FRONT-PROP-04` |
| `TASK-WPO-PROP-04` | Optimizar actualizaciones de estado mediante optimismo en UI (*Optimistic UI Updates*) en React para mejorar la respuesta percibida. | Anderson Villanes | 3 | `TASK-FRONT-PROP-04` |

---

## 3. Definition of Ready (DoR)

- Criterios de aceptación definidos y validados por el Product Owner en formato Given-When-Then para autenticación, recuperación de clave y disponibilidad.
- Contrato OpenAPI 3.0 para los módulos `/api/v1/auth/` y `/api/v1/properties/{id}/status` redactado y aprobado.
- Wireframes de formularios de acceso, correo transaccional y panel de disponibilidad listos en Figma.
- Estimación realizada por el equipo mediante Planning Poker considerando el ajuste de capacidad por la semana de exámenes.

---

## 4. Definition of Done (DoD)

- Código integrado en `main` mediante Pull Request con al menos una revisión y aprobación por pares.
- Cobertura de pruebas unitarias ≥ 80% en los módulos de autenticación, utilitarios JWT y gestión de disponibilidad.
- Endpoints REST autenticados probados con respuesta < 300 ms en Staging.
- Almacenamiento seguro de credenciales (passwords hasheados con Bcrypt en DB, JWT gestionado sin exposición en localStorage).
- Cero errores críticos en SonarQube / ESLint.
- Auditoría de AXE DevTools aprobada sin violaciones de nivel A o AA en los formularios y paneles desarrollados.

---

## 5. Criterios de Éxito

Al finalizar el Sprint 3 se debe poder demostrar:

1. Registro e inicio de sesión funcional con persistencia de sesión por roles (Cliente, Agente, Administrador).
2. Protección de rutas privadas en React según el rol autenticado.
3. Flujo completo de recuperación de contraseña mediante correo con token temporal.
4. Cambio de estados de propiedad (Disponible/Reservada/Vendida) y asignación de horarios desde el panel del Agente.
5. Integración funcional React + Django REST Framework protegida por tokens JWT.
6. Pruebas y validaciones de seguridad/accesibilidad conformes a la DoD.

**Importante:** las métricas de cobertura, rendimiento y accesibilidad deben registrarse únicamente después de ejecutar las pruebas. No se deben inventar resultados.

---

## 6. Entregables

- Incremento funcional del módulo de Autenticación y Control de Acceso (RBAC).
- Módulo funcional de Gestión de Disponibilidad para Agentes.
- Documentación/contrato API OpenAPI de Auth y Disponibilidad actualizado.
- Pantallas y componentes correspondientes en Figma.
- Pruebas unitarias/integración de autenticación y permisos.
- Evidencias de auditoría de accesibilidad en formularios.
- Pull Requests revisados y fusionados a `main`.
- Sprint Review.
- Retrospectiva y acciones de mejora para el Sprint 4.