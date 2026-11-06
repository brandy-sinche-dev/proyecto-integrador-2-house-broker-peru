# Laboratorio 08 — Pruebas Unitarias de Componentes (Frontend)

| Campo | Detalle |
|---|---|
| **Proyecto** | HouseBroker Perú — Sistema Web Inteligente de Gestión Inmobiliaria |
| **Autor** | Jhon Ordoñez |
| **Rol** | Scrum Master / Product Owner simulado / Frontend QA |
| **Asignatura** | Proyecto Integrador II / Ingeniería de Software |
| **Fase / Sprint** | Sprint 6–7 (Semana 8) — Pruebas Automatizadas y Estabilización |
| **Entregable** | Informe de Laboratorio 08: Pruebas Unitarias de Componentes (Frontend) |
| **Stack de Pruebas** | React 19 + TypeScript 6 + Vite 8 · Jest 30 · React Testing Library · @testing-library/user-event |

---

## 1. Asignación y Alcance de la Tarea

En la planificación del **Laboratorio 08 (Pruebas funcionales, no funcionales y despliegue)**, se dividieron las responsabilidades de aseguramiento de calidad del sistema entre los integrantes del equipo Scrum.

La responsabilidad asignada a **Jhon Ordoñez** es:
> **`[✔] Pruebas Unitarias de Componentes (Frontend)`**

![Evidencia de asignación en votación de equipo](evidencias/asignacion_pruebas_unitarias.png)

### 1.1 Objetivo del Laboratorio
Diseñar, implementar y ejecutar una suite exhaustiva de **pruebas unitarias sobre los componentes clave de la interfaz de usuario (React 19)** de HouseBroker Perú, asegurando:
1. **Renderizado semántico y accesible:** roles ARIA (`alertdialog`, `group`, `list`, `listitem`, `dialog`, `contentinfo`), enlaces de etiquetas accesibles (`aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required`).
2. **Ciclo de vida y gestión de propiedades (props):** valores por defecto, variantes visuales (primary, neutral, ghost, danger), tamaños y clases condicionales.
3. **Manejo de eventos del usuario:** interacción mediante `@testing-library/user-event` (clicks, inputs de texto, selección en dropdowns, conmutadores, teclas Escape y navegación por flechas).
4. **Control de foco y trampas de navegación por teclado:** focus inicial en modales y mantenimiento de foco accesible (`Tab` y `Shift+Tab`).
5. **Robustez ante datos límite:** listas vacías o valores nulos, comprobando que la aplicación no arroje excepciones en tiempo de ejecución.

---

## 2. Marco Tecnológico y Herramientas

| Herramienta | Versión | Rol en la arquitectura de pruebas |
|---|---|---|
| **Jest** | 30.5.1 | Test runner, framework de assertions y cálculo de cobertura |
| **React Testing Library** | 16.3.3 | Montaje e interacción con componentes centrada en el comportamiento del usuario |
| **@testing-library/user-event** | 14.6.7 | Simulación fiel de eventos reales del navegador (clicks, tipeo, foco, teclado) |
| **jest-environment-jsdom** | 30.5.1 | Simulación del DOM en Node.js |
| **jest-axe** | 11.0.0 | Reglas de accesibilidad automatizada (WCAG 2.1 / 2.2 AA) |
| **TypeScript** | 6.0.2 | Tipado estático estricto de componentes y props |

---

## 3. Matriz de Trazabilidad (Historias de Usuario vs. Componentes)

| Historia de Usuario (HU) | Componente Probado | Archivo de Prueba | Criterio de Aceptación Validado |
|---|---|---|---|
| **HU-PROP-01** (Registro/edición de inmuebles) | `Field`, `TextInput`, `Select` | `src/components/Field.test.jsx`<br>`src/components/TextInput.test.jsx`<br>`src/components/Select.test.jsx` | Validación de campos obligatorios, rótulos accesibles, estados de error y tipos de datos numéricos/texto. |
| **HU-PROP-01** (Flujo paso a paso) | `Stepper` | `src/components/Stepper.test.jsx` | Marcado secuencial de progreso (`done`, `active`, `todo`), ícono checkmark '✓' y `aria-current="step"`. |
| **HU-PROP-02** (Catálogo de propiedades) | `ToggleGroup`, `StatusBadge` | `src/components/ToggleGroup.test.jsx`<br>`src/components/StatusBadge.test.jsx` | Filtro rápido por modalidad (Venta/Alquiler) y visualización del estado del inmueble (Activo/Inactivo). |
| **HU-PROP-02** (Galería fotográfica) | `ImageGalleryModal` | `src/components/properties/ImageGalleryModal.test.jsx` | Navegación entre fotografías con flechas de teclado, ciclado continuo, visor modal y cierre con `Escape`. |
| **HU-PROP-05** (Favoritos de inmuebles) | `LoginPrompt` | `src/components/auth/LoginPrompt.test.jsx` | Aviso al usuario no autenticado cuando intenta guardar un favorito; opciones de ir a login o continuar. |
| **HU-SEC-01** (Inicio de sesión y roles) | `LoginModal`, `Header` | `src/components/auth/LoginModal.test.jsx`<br>`src/components/Header.test.jsx` | Modal de login/registro, cambio de visibilidad de contraseña, redirección según rol (Admin/Agente/Cliente) y barra de navegación. |
| **Transversal** (Acciones críticas) | `ConfirmDialog`, `Button` | `src/components/ConfirmDialog.test.jsx`<br>`src/components/Button.test.jsx` | Diálogo accesible para confirmaciones de borrado lógico o descarte de cambios con trampa de foco y variantes. |
| **Transversal** (Asesoría y contacto) | `ContactModal` | `src/components/ContactModal.test.jsx` | Modal interactivo de contacto directo con asesor, formulario con validación de teléfono/nombre, trampa de escape y portal centrado accesible. |
| **Transversal** (Identidad institucional) | `Footer` | `src/components/Footer.test.jsx` | Visualización institucional, enlaces a Libro de Reclamaciones, WhatsApp directo y políticas de privacidad. |

---

## 4. Inventario de Pruebas Unitarias de Componentes

### 4.1 Componentes Base de Interfaz (Design System)

#### A. Componente `Button` (`src/components/Button.test.jsx` — 11 pruebas)
- **Renderizado por defecto:** Variante `primary`, tamaño `md` y estado habilitado.
- **Variantes visuales:** Verificación de las clases `hbtn--primary`, `hbtn--neutral`, `hbtn--ghost` y `hbtn--danger`.
- **Dimensiones:** Verificación de las clases `hbtn--sm` y `hbtn--md`.
- **Composición:** Mezcla de clases CSS personalizadas pasadas vía `className`.
- **Interactividad:** Disparo correcto del callback `onClick` al interactuar.
- **Control de estado:** Bloqueo de clics cuando la propiedad `disabled` está activa.
- **Atributos estándar:** Propagación de atributos HTML nativos (`type="submit"`, `aria-label`, `title`).

#### B. Componente `TextInput` (`src/components/TextInput.test.jsx` — 7 pruebas)
- **Renderizado básico:** Elemento input con clase `hinput`.
- **Entrada de usuario:** Disparo del evento `onChange` con actualización de valor tipeado.
- **Validación visual:** Asignación de la clase `hinput--invalid` cuando `invalid={true}` y omisión cuando es válido.
- **Accesibilidad y estados:** Bloqueo de entrada bajo `disabled={true}`.
- **Tipos de entrada:** Soporte de atributos `type="number"`, `min` y `max`.

#### C. Componente `Select` (`src/components/Select.test.jsx` — 7 pruebas)
- **Mapeo de opciones:** Renderizado de la lista de opciones `<option>` con claves y valores correctos.
- **Placeholder accesible:** Inserción de opción inicial deshabilitada y oculta (`disabled hidden`).
- **Evento de selección:** Disparo de `onChange` al cambiar de opción.
- **Estado de error:** Aplicación de `hselect--invalid` ante `invalid={true}`.
- **Deshabilitado:** Verificación del atributo `disabled` en el control select.

#### D. Componente `StatusBadge` (`src/components/StatusBadge.test.jsx` — 2 pruebas)
- **Estado Activo:** Renderiza el texto "Activo" con clase `hstatus--active`.
- **Estado Inactivo:** Renderiza el texto "Inactivo" con clase `hstatus--inactive`.

#### E. Componente `Field` (`src/components/Field.test.jsx` — 6 pruebas)
- **Vinculación de rótulo:** Inyección automática de `id` único en el control hijo para asociarlo semánticamente al `<label>`.
- **Indicador de obligatoriedad:** Renderizado del asterisco `*` con clase `hfield__req` y asignación de `aria-required="true"`.
- **Mensaje de ayuda (hint):** Renderizado de texto de ayuda vinculado mediante `aria-describedby`.
- **Mensaje de error accesible:** Renderizado de alerta con `role="alert"`, clase `hfield__error`, `aria-invalid="true"` y ocultamiento automático del hint para evitar sobrecarga cognitiva.

#### F. Componente `Stepper` (`src/components/Stepper.test.jsx` — 4 pruebas)
- **Estructura semántica:** Renderizado de lista ordenada `<ol className="hstepper">`.
- **Cálculo de estados de pasos:**
  - Pasos previos: clase `hstepper__item--done` e ícono checkmark '✓'.
  - Paso actual: clase `hstepper__item--active`, número de paso y atributo accesible `aria-current="step"`.
  - Pasos futuros: clase `hstepper__item--todo` con su respectivo numeral.
- **Líneas conectoras:** Renderizado de divisores intermedios excluyendo el paso final.

#### G. Componente `ToggleGroup` (`src/components/ToggleGroup.test.jsx` — 4 pruebas)
- **Rol accesible:** Contenedor con `role="group"`.
- **Estado presionado:** Botón seleccionado con `aria-pressed="true"` y clase `htoggle__item--active`.
- **Despacho de cambio:** Ejecución de `onChange` con el valor exacto de la opción seleccionada.

---

### 4.2 Componentes Interactivos y Modales

#### H. Componente `ConfirmDialog` (`src/components/ConfirmDialog.test.jsx` — 10 pruebas)
- **Renderizado condicional:** Retorno `null` cuando `open={false}`.
- **Semántica WAI-ARIA:** Atributos `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` y `aria-describedby`.
- **Variante destructiva (danger):** Botón de confirmación con variante `danger` para acciones irreversibles.
- **Cierre accesible:** Cierre al presionar la tecla `Escape` o al hacer clic sobre el overlay exterior.
- **Gestión de foco (Focus Management):** Enfoque automático del primer botón al abrir el modal.
- **Trampa de teclado (Tab Trap):** Retención del ciclo de foco con `Tab` y `Shift+Tab` dentro del diálogo sin escapar al documento de fondo.

#### I. Componente `ImageGalleryModal` (`src/components/properties/ImageGalleryModal.test.jsx` — 7 pruebas)
- **Resiliencia ante datos nulos o vacíos:** No genera excepciones y retorna `null` de forma segura.
- **Navegación fotográfica:** Botones Anterior (`❮`) y Siguiente (`❯`) con avance y retroceso continuo (ciclado circular).
- **Atajos de teclado:** Soporte para flecha derecha (`ArrowRight`), flecha izquierda (`ArrowLeft`) y tecla `Escape`.
- **Contador:** Indicador visual accesible `{índice actual} / {total de imágenes}`.

#### J. Componente `LoginPrompt` (`src/components/auth/LoginPrompt.test.jsx` — 6 pruebas)
- **Diálogo informativo:** Renderizado del título "Inicia sesión para guardar favoritos" y descripción explicativa.
- **Acción afirmativa:** Botón "Iniciar sesión" dispara `onLogin`.
- **Acción de descarte:** Botón "Ahora no", botón de cerrar "×", overlay y tecla `Escape` disparan `onClose`.

#### K. Componente `Header` (`src/components/Header.test.jsx` — 7 pruebas)
- **Identidad corporativa:** Clic en logo navega a la sección `inicio`.
- **Enlaces de navegación:** Resaltado de sección activa con `hdr__link--active` y `aria-current="page"`.
- **Contadores de insignia (Badges):** Conteo numérico dinámico en "Guardados" y "Visitas".
- **Estado no autenticado:** Muestra botón "Iniciar Sesión" que dispara el modal de autenticación.
- **Estado autenticado:** Despliega el nombre y rol del usuario (`CLIENTE`, `AGENTE`, `ADMINISTRADOR`), con acceso a paneles internos y opción de "Cerrar sesión" invocando `signOut`.

#### L. Componente `LoginModal` (`src/components/auth/LoginModal.test.jsx` — 9 pruebas)
- **Modos Login y Registro:** Alternancia fluida entre formularios con campos dinámicos (nombre y teléfono en registro).
- **Visibilidad de contraseña:** Alternancia del tipo de input (`password` / `text`) con botón de ojo.
- **Redirección por rol:** Redirección automática a `/admin` para Administradores y `/agente` para Agentes.
- **Manejo de errores:** Renderizado de mensajes de error devueltos por el servidor.
- **Acceso rápido:** Opción de "Continuar como invitado" para explorar el catálogo.

#### M. Componente `Footer` (`src/components/Footer.test.jsx` — 4 pruebas)
- **Semántica:** Elemento principal con rol `contentinfo`.
- **Canales de comunicación:** Validación de protocolos de enlace `tel:`, `https://wa.me/` (con `target="_blank"` y `rel="noreferrer"`) y `mailto:`.
- **Respaldo gremial:** Mención a CoDIP y Defensoría del Cliente Inmobiliario (DCI).
- **Marco normativo:** Enlaces a Libro de Reclamaciones, Políticas de cookies y Términos y condiciones.

#### N. Componente `ContactModal` (`src/components/ContactModal.test.jsx` — 5 pruebas)
- **Renderizado en Portal accesible:** Montaje directo en `document.body` mediante `createPortal` para evitar recortes de stacking context y filtros backdrop.
- **Diseño centrado y adaptable:** Posicionamiento en el centro exacto de la pantalla con flexbox centrado, ancho máximo controlado (`450px`) y scroll automático vertical en pantallas pequeñas.
- **Validación de campos obligatorios:** Control de tipeo en campos Nombre y Teléfono antes de admitir el envío.
- **Interacción y envío:** Despacho de solicitud de contacto con mensaje de confirmación amigable.
- **Cierre accesible:** Cierre con tecla `Escape`, overlay exterior y botón accesible de cierre (`×`).

---

## 5. Resultados de Ejecución y Métricas

La suite de pruebas fue ejecutada en el entorno local con Jest 30 y JSDOM, validando tanto el conjunto específico de pruebas unitarias de componentes como la suite global del frontend.

### 5.1 Evidencias Gráficas de Ejecución (Capturas de Terminal)

#### A. Ejecución de Pruebas Unitarias de Componentes (Alcance Asignado — Jhon Ordoñez)
> Verificación de las **15 suites de componentes clave (96 pruebas unitarias)** pasando al 100% en 5.27 segundos.

![Evidencia de ejecución de pruebas unitarias de componentes](evidencias/resultado_pruebas_componentes.png)

#### B. Ejecución de la Suite Completa del Frontend (HouseBroker Perú)
> Verificación de las **47 suites frontend (575 pruebas automatizadas)** pasando al 100% sin ningún error o regresión.

![Evidencia de suite completa de pruebas frontend](evidencias/resultado_suite_completa_frontend.png)

---

### 5.2 Registro de Ejecución (Console Log Oficial)

#### Ejecución de Componentes (`npm test -- src/components --watchAll=false`):
```text
> frontend@0.0.0 test
> jest src/components/Button.test.jsx src/components/TextInput.test.jsx ... --watchAll=false

PASS src/components/Footer.test.jsx
PASS src/components/ToggleGroup.test.jsx
PASS src/components/Select.test.jsx
PASS src/components/Button.test.jsx
PASS src/components/auth/LoginPrompt.test.jsx
PASS src/components/AssistantWidget.test.jsx
PASS src/components/Field.test.jsx
PASS src/components/Stepper.test.jsx
PASS src/components/StatusBadge.test.jsx
PASS src/components/properties/ImageGalleryModal.test.jsx
PASS src/components/ConfirmDialog.test.jsx
PASS src/components/TextInput.test.jsx
PASS src/components/ContactModal.test.jsx
PASS src/components/Header.test.jsx
PASS src/components/auth/LoginModal.test.jsx

Test Suites: 15 passed, 15 total
Tests:       96 passed, 96 total
Snapshots:   0 total
Time:        5.278 s
Ran all test suites matching components.
```

#### Ejecución de la Suite Completa (`npm test -- --watchAll=false`):
```text
> frontend@0.0.0 test
> jest --watchAll=false

PASS src/components/crm/AppointmentModal.test.jsx
PASS src/components/availability/AvailabilityPanel.test.jsx
PASS src/components/properties/FilterSidebar.test.jsx
PASS src/components/properties/useFilterParams.test.jsx
PASS src/components/auth/LoginModal.test.jsx
PASS src/components/availability/ScheduleManager.test.jsx
PASS src/App.favorites.integration.test.jsx
PASS src/components/availability/PropertyStatusSelector.test.jsx
PASS src/components/availability/ScheduleManager.a11y.test.jsx
PASS src/components/properties/FilterSidebar.a11y.test.jsx
PASS src/components/crm/AppointmentListTable.test.jsx
PASS src/components/properties/PropertyCard.test.jsx
PASS src/components/TextInput.test.jsx
PASS src/components/auth/LoginPrompt.a11y.test.jsx
PASS src/components/properties/ImageGalleryModal.test.jsx
PASS src/components/crm/AppointmentModal.a11y.test.jsx
PASS src/components/Header.test.jsx
PASS src/components/properties/PropertyDetail.test.jsx
PASS src/components/ConfirmDialog.test.jsx
PASS src/components/AssistantWidget.test.jsx
PASS src/components/Button.test.jsx
PASS src/components/ToggleGroup.test.jsx
PASS src/components/Select.test.jsx
PASS src/components/auth/LoginPrompt.test.jsx
PASS src/components/Footer.test.jsx
PASS src/components/availability/PropertyStatusSelector.a11y.test.jsx
PASS src/components/Field.test.jsx
PASS src/components/StatusBadge.test.jsx
PASS src/components/Stepper.test.jsx
PASS src/components/ContactModal.test.jsx
PASS src/components/crm/DateSlotsPicker.test.jsx
PASS src/components/properties/FavoriteButton.a11y.test.jsx
PASS src/components/properties/FavoriteButton.test.jsx
PASS src/components/crm/ClientProfileView.test.jsx
PASS src/services/favorites.test.jsx
PASS src/components/properties/Pagination.test.jsx
PASS src/components/availability/axe.a11y.test.jsx
PASS src/services/mocks/integration.test.jsx
PASS src/services/availability.test.jsx
PASS src/services/session.test.jsx
PASS src/hooks/useDebounce.test.jsx
PASS src/services/properties.test.jsx
PASS src/services/appointments.test.jsx
PASS src/components/properties/filters.test.jsx
PASS src/components/properties/PropertyList.test.jsx
PASS src/App.test.jsx
PASS src/components/properties/PropertyForm.test.jsx

Test Suites: 47 passed, 47 total
Tests:       575 passed, 575 total
Snapshots:   0 total
Time:        9.356 s
Ran all test suites.
```

### 5.3 Cuadro Comparativo de Cobertura

| Métrica | Antes del Laboratorio 08 | Con Incremento de Pruebas de Componentes | Delta |
|---|---|---|---|
| **Suites de Pruebas Frontend** | 32 suites | **47 suites** | **+15 suites (+46.8 %)** |
| **Pruebas Automatizadas Totales** | 479 pruebas | **575 pruebas** | **+96 pruebas (+20.0 %)** |
| **Tasa de Aprobación** | 100 % | **100 % (0 fallos)** | **Óptima (100% Verde)** |
| **Tiempo de Ejecución Total** | ~10 s | **9.35 s** | **Excelente rendimiento** |
| **Componentes Clave Cubiertos** | 3 componentes | **15 componentes clave** | **+12 componentes probados** |

---

## 6. Conclusiones

1. **Cumplimiento estricto de la asignación:** Se cubrió al 100% el requerimiento acordado en la votación del equipo (*Pruebas Unitarias de Componentes - Frontend*), implementando pruebas para cada uno de los 15 componentes atómicos y modales de HouseBroker Perú.
2. **Robustez y Detección Temprana de Fallas:** Durante el desarrollo de las pruebas se identificó y corrigió un fallo de desreferencia en `ImageGalleryModal.tsx` ante listas nulas de imágenes (`images?.length ?? 0`), y se perfeccionó la experiencia del usuario reemplazando el enlace nativo de correo por un modal accesible y centrado de contacto (`ContactModal`), garantizando que la aplicación sea tolerante a fallos en producción.
3. **Calidad de Accesibilidad (A11y):** Se verificó que los componentes sigan los estándares WCAG 2.1/2.2 y patrones WAI-ARIA (trampas de foco con `Tab`, cierre con `Escape`, roles semánticos y asociación de mensajes de error con `role="alert"` y `aria-describedby`).
4. **Validación CI/CD:** El incremento se encuentra completamente integrado y compatible con el build de producción (`npm run build` en 265 ms) y el linter del proyecto (`oxlint`), sin introducir ninguna regresión.
