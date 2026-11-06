# Sprint Review — Sprint 3: Autenticación y Disponibilidad

**Proyecto:** HouseBroker Perú  
**Fecha de Revisión:** Final de la Semana 8 (25 de septiembre de 2026)  
**Facilitador:** Brandy Sinche (Scrum Master)  
**Asistentes:** Brandy Sinche, Jhon Ordoñez, Yohan Ñato, Anderson Villanes, Evaluador / Product Owner

---

## 1. Objetivo de la Revisión

Presentar el incremento funcional de seguridad, autenticación basada en tokens JWT con control de acceso por roles (RBAC), el flujo de recuperación de contraseña con token temporal, y el panel de administración de disponibilidad y horarios de atención de propiedades para agentes.

---

## 2. Demostración del Incremento Funcional

### Funcionalidades Demostradas

* **Registro e Inicio de Sesión (HU-SEC-01):**
  * Registro de nuevos usuarios asignando rol de Cliente o Agente.
  * Inicio de sesión mediante correo y contraseña hasheada con Bcrypt.
  * Emisión de pares de tokens JWT (`access` y `refresh`) gestionados de forma segura mediante cookies HttpOnly.
  * Protección de rutas en React con `ProtectedRoute` según el rol (`CLIENTE`, `AGENTE`, `ADMINISTRADOR`).
* **Recuperación de Contraseña (HU-SEC-02):**
  * Solicitud de restablecimiento mediante correo electrónico registrado.
  * Generación y validación de tokens de un solo uso con expiración temporal (*PasswordResetTokenGenerator*).
  * Formulario accesible de cambio de contraseña con validación de fortaleza y confirmación.
* **Gestión de Disponibilidad de Propiedades (HU-PROP-04):**
  * Panel exclusivo para agentes y administradores con control de estado de inmuebles (`DISPONIBLE`, `RESERVADO`, `VENDIDO`, `SUSPENDIDO`).
  * Configuración semanal de franjas horarias (*schedules*) por día de la semana (Lunes a Sábado).
  * Actualización optimista en interfaz React y cascada de bloqueo de reservas sobre el catálogo.

---

## 3. Estado de las Historias de Usuario

| ID Historia | Título | Estado | Puntos Comprometidos | Puntos Entregados |
| :--- | :--- | :---: | :---: | :---: |
| `HU-SEC-01` | Registrarse e iniciar sesión | **DONE** | 8 | 8 |
| `HU-SEC-02` | Recuperar contraseña | **DONE** | 5 | 5 |
| `HU-PROP-04` | Gestionar disponibilidad de propiedades | **DONE** | 5 | 5 |

**Velocidad comprometida:** 18 SP  
**Velocidad entregada:** 18 SP  
**Cumplimiento del Sprint Goal:** 100%

---

## 4. Métricas del Sprint

| Métrica | Resultado | Fuente / Evidencia |
| :--- | :--- | :--- |
| Pruebas backend de autenticación y tokens | 18/18 aprobadas | `backend/apps/users/tests/test_auth.py` |
| Pruebas backend de disponibilidad y horarios | 24/24 aprobadas | `backend/apps/properties/tests/test_availability.py` |
| Pruebas frontend (Jest + RTL) de Auth y Disponibilidad | 48/48 aprobadas | `src/components/auth/` y `src/components/availability/` |
| Cobertura global de código backend | > 85% | Reporte de cobertura Pytest / Coverage |
| Accesibilidad WCAG 2.2 AA (AXE DevTools) | 0 violaciones críticas | `docs/16_TASK_A11Y_PROP_04.md` |

---

## 5. Evidencias Entregadas

* Contratos OpenAPI para autenticación y disponibilidad en `docs/api/openapi_spec.yaml`.
* Componentes de autenticación: `LoginForm`, `RegisterForm`, `LoginModal`, `LoginPrompt`.
* Componentes de disponibilidad: `AvailabilityPanel`, `PropertyStatusSelector`, `ScheduleManager`.
* Configuración de SimpleJWT y modelos de usuario/perfil en `backend/apps/users/`.
* Documentación y capturas registradas en bitácoras de daily y especificaciones de tareas.

---

## 6. Retroalimentación del Product Owner / Evaluador

* **Aspectos destacados:** La gestión de tokens mediante cookies HttpOnly protege eficazmente contra ataques XSS; el panel de disponibilidad responde de manera fluida gracias a las actualizaciones optimistas en la UI.
* **Observaciones y recomendaciones:**
  1. Preparar la integración con el agendamiento de visitas (Sprint 4) para que tome directamente las franjas horarias configuradas por el agente.
  2. Implementar el módulo de favoritos como disparador para que el usuario anónimo sea invitado a registrarse.
* **Acuerdos:** Incorporar los bloques horarios del Sprint 3 como insumo obligatorio para el selector de citas del Sprint 4.
