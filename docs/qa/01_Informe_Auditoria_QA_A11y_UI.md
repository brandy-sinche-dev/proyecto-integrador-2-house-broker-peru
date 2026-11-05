# Informe de auditoría QA — Accesibilidad y calidad visual

**Proyecto:** HouseBroker Perú  
**Tipo de evaluación:** auditoría funcional, accesibilidad, teclado, responsive y calidad visual  
**Entorno:** Docker local con datos de demostración  
**Corte de evidencia:** 4–5 de noviembre de 2026, según los registros de ejecución del navegador  
**Estado:** **NO APROBADO para cierre de accesibilidad y calidad visual**  

---

## 1. Dictamen ejecutivo

El flujo funcional principal de HouseBroker Perú se pudo ejecutar de principio a fin: carga de la
aplicación, consulta del catálogo, detalle de una propiedad, favoritos, consulta de disponibilidad,
reserva de una visita, acceso del agente, consulta de clientes y confirmación de la cita.

Sin embargo, la auditoría no puede cerrarse como aprobada porque se confirmaron defectos de
accesibilidad de impacto crítico/serio, pérdida de foco en el modal de autenticación y overflow
horizontal en el panel del agente para una viewport móvil de `390px`.

| Área | Resultado | Dictamen |
| --- | ---: | --- |
| Disponibilidad del entorno Docker | 3 servicios activos, frontend y API responden `200` | ✅ Conforme |
| Flujo funcional cliente–agente | Flujo completo ejecutado | ✅ Conforme con observaciones |
| Build frontend | Correcto | ✅ Conforme |
| Suite backend | `335/335` | ✅ Conforme |
| Suite focalizada CRM | `15/15` | ✅ Conforme |
| Suite automatizada de accesibilidad existente | `72/72` | ✅ Conforme |
| Suite frontend completa | `475` pruebas pasan y `4` fallan en `useFilterParams.test.jsx` | ⚠ Requiere triage |
| AXE sobre la aplicación completa | Violaciones repetidas en varias rutas y estados | ❌ No conforme |
| Teclado y foco | Login con foco escapable; reserva conforme | ❌ No conforme |
| Responsive público | Sin overflow horizontal en las vistas verificadas | ✅ Conforme |
| Responsive panel de agente | Overflow horizontal confirmado | ❌ No conforme |
| Calidad visual | Texto literal `\n` y posible solapamiento del Concierge en mobile | ⚠ Requiere corrección/verificación |

### Conclusión de auditoría

La aplicación está en condiciones de continuar con pruebas funcionales y correcciones, pero no
debe recibir un sign-off de accesibilidad/UI ni considerarse lista para una entrega final hasta
resolver, como mínimo, los hallazgos **F-001 a F-006** de este informe.

---

## 2. Objetivo y alcance

### 2.1 Objetivo

Evaluar, como auditor QA, la capacidad de HouseBroker Perú para:

1. iniciar correctamente con infraestructura reproducible;
2. soportar el flujo de negocio cliente–agente;
3. exponer controles utilizables con teclado y tecnologías de asistencia;
4. mantener nombres, roles, landmarks y jerarquía semántica coherentes;
5. funcionar sin desbordamientos horizontales en desktop y mobile;
6. presentar una interfaz visual sin defectos evidentes que afecten la comprensión o el uso.

### 2.2 Alcance cubierto

- Landing pública y menú responsive.
- Catálogo de propiedades y filtros.
- Detalle de propiedad.
- Favoritos.
- Consulta de disponibilidad.
- Modal de inicio de sesión.
- Modal de reserva de visita.
- Navegación del cliente y contador de visitas.
- Dashboard del agente (`/agente`).
- Agenda del agente.
- Directorio de clientes (`/agente/clientes`).
- Ficha CRM de cliente (`/agente/clientes/:id`).
- Accesibilidad automática mediante `axe-core`.
- Navegación manual por teclado, foco, `Escape` y menú mobile.
- Revisión visual mediante capturas desktop/mobile.
- Verificación de overflow horizontal.

### 2.3 Fuera de alcance o limitaciones

- No se ejecutó una matriz completa de navegadores y dispositivos físicos; la evidencia manual se
  obtuvo en navegador Chromium mediante Playwright.
- No se ejecutó un lector de pantalla real. La revisión combinó AXE, snapshot de accesibilidad y
  teclado.
- Lighthouse no estuvo disponible localmente. La ejecución de `npx --no-install lighthouse`
  fue cancelada porque el paquete no estaba instalado y no se autorizó descargarlo. Por eso no se
  presentan métricas nuevas de Performance, SEO o Best Practices.
- No se realizó una auditoría de penetración, carga, seguridad de infraestructura o contrato API.
- El chat IA/WebSocket no se certificó end-to-end en esta sesión.
- No se modificó código de aplicación durante la auditoría. La corrección previa de
  `listAgentAppointments` ya estaba aplicada antes de iniciar las pruebas de accesibilidad.

---

## 3. Sistema, infraestructura y datos de prueba

### 3.1 Repositorio y tecnologías

| Elemento | Valor |
| --- | --- |
| Repositorio local | `C:\Users\kenne\AppData\Local\Temp\opencode\house-broker-peru` |
| Frontend | React 19 + TypeScript + Vite |
| Backend | Django + Django REST Framework |
| Base de datos | PostgreSQL 16 |
| Servido frontend | Nginx dentro de Docker |
| Autenticación | JWT en cookies HttpOnly, según la documentación del proyecto |
| Automatización frontend | Jest, React Testing Library, `jest-axe`, `axe-core` |
| Automatización backend | Django TestCase + DRF APIClient |

### 3.2 Servicios Docker

El stack se levantó mediante el compose documentado por el proyecto:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

| Servicio | Contenedor | Puerto | Resultado observado |
| --- | --- | ---: | --- |
| Frontend | `housebroker-frontend` | `8080` | `running` |
| Backend | `housebroker-backend` | `8000` | `running` |
| PostgreSQL | `housebroker-db` | `5433` → `5432` | `running` |

Verificación de disponibilidad ejecutada durante la auditoría:

```text
GET http://localhost:8080/          → 200 text/html
GET http://localhost:8000/api/health/ → 200
{"status": "ok", "service": "housebroker-api"}
```

El stack quedó activo al finalizar las pruebas para permitir la continuidad del QA. No se ejecutó
`docker compose down`.

### 3.3 Datos y credenciales de demostración

El backend ejecuta `migrate` y `seed_demo` al iniciar el contenedor. El seed es idempotente y
crea usuarios, distritos, propiedades, horarios y datos necesarios para el recorrido.

| Rol | Usuario de demostración |
| --- | --- |
| Cliente | `cliente@housebroker.pe` |
| Agente | `yohan.nato@housebroker.pe` |
| Agente | `agente@housebroker.pe` |
| Administrador | `admin@housebroker.pe` |

**Contraseña de QA local:** `Housebroker2026.`

Estas credenciales son únicamente de demostración local y no deben utilizarse en un entorno
productivo.

### 3.4 Datos utilizados en el flujo

- Propiedad: **Terreno residencial en Villa El Salvador**.
- Identificador: `57f3c7c1-4bf1-4a98-8c07-04929fb907c0`.
- Cita utilizada para validar el circuito: **6 de noviembre de 2026, 09:00**.
- Resultado del recorrido: el cliente reservó la visita y el agente Yohan la confirmó.

---

## 4. Plan de pruebas

| ID | Prueba | Objetivo | Evidencia esperada |
| --- | --- | --- | --- |
| QA-ENV-01 | Arranque del entorno | Confirmar que los servicios y la API estén disponibles | Contenedores activos y healthcheck `200` |
| QA-AUT-01 | Suite backend | Detectar regresiones de API y reglas de negocio | Todas las pruebas verdes |
| QA-AUT-02 | Build frontend | Confirmar compilación TypeScript/Vite | Build exitoso |
| QA-AUT-03 | Suite frontend focalizada | Validar servicios, CRM y accesibilidad automatizada | Resultado por suite |
| QA-FUNC-01 | Flujo público | Validar home, catálogo, detalle, favoritos y navegación | Flujo completado |
| QA-FUNC-02 | Reserva cliente | Validar disponibilidad y creación de cita | Cita visible para el agente |
| QA-FUNC-03 | Gestión agente | Validar dashboard, agenda, clientes y confirmación | Estado de cita actualizado |
| QA-A11Y-01 | AXE | Detectar problemas WCAG automatizables | Violaciones por ruta/estado |
| QA-A11Y-02 | Teclado y foco | Validar orden, modal, `Escape` y foco contenido | Resultado manual reproducible |
| QA-RESP-01 | Responsive | Detectar overflow y contenido fuera de viewport | `scrollWidth` y capturas |
| QA-UI-01 | Revisión visual | Detectar defectos de composición y contenido | Capturas desktop/mobile |

---

## 5. Procedimiento ejecutado de inicio a fin

### Paso 1 — Preparación del repositorio

Se trabajó sobre el repositorio local clonado en la ruta indicada en §3.1. Antes de la auditoría
de accesibilidad ya se había corregido un error de carga del frontend relacionado con el consumo
de citas: se agregó `listAgentAppointments` con paginación y su prueba de regresión.

La auditoría documentada aquí no reabrió ni modificó esa corrección.

### Paso 2 — Levantamiento de infraestructura

Se ejecutó:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

El compose esperó la salud de PostgreSQL y del backend antes de iniciar el frontend. El backend
aplicó migraciones y ejecutó el seed de demostración.

### Paso 3 — Smoke test de disponibilidad

Se verificaron:

1. carga HTTP del frontend en `http://localhost:8080`;
2. healthcheck del backend en `http://localhost:8000/api/health/`;
3. estado `running` de los tres contenedores;
4. render inicial del home sin bloqueo funcional.

Resultado: **conforme**.

### Paso 4 — Ejecución de pruebas automatizadas existentes

Los comandos de referencia documentados en el proyecto son:

```bash
# Backend
cd backend
DJANGO_DB_ENGINE=sqlite uv run python manage.py test apps.properties

# Frontend
cd frontend
pnpm test
pnpm test:coverage
pnpm run lint
pnpm run build
```

En esta sesión, las dependencias frontend disponibles se ejecutaron mediante `npm` para las
pruebas focalizadas:

```bash
npm test -- --runInBand --testPathPatterns=a11y
```

Resultado específico de accesibilidad automatizada:

```text
Test Suites: 7 passed, 7 total
Tests:       72 passed, 72 total
```

También se verificaron el build frontend y la suite CRM. La suite frontend completa dejó cuatro
fallos en `frontend/src/components/properties/useFilterParams.test.jsx`, mientras 475 pruebas
pasaron. Estos fallos se registran para triage y no se atribuyeron a los hallazgos visuales/A11y
de esta auditoría.

### Paso 5 — Recorrido funcional como cliente

1. Se abrió el home como usuario anónimo.
2. Se verificó la navegación pública y el menú mobile.
3. Se ingresó al catálogo de propiedades.
4. Se abrió el detalle de la propiedad de Villa El Salvador.
5. Se verificó la acción de favorito.
6. Se abrió el flujo de disponibilidad.
7. Se seleccionó una fecha y un horario disponible.
8. Se inició sesión como `cliente@housebroker.pe`.
9. Se confirmó la reserva de la visita.
10. Se comprobó que el contador de visitas reflejara la cita.

Resultado: **flujo completado**.

### Paso 6 — Recorrido funcional como agente

1. Se inició sesión como `yohan.nato@housebroker.pe`.
2. Se abrió el dashboard `/agente`.
3. Se revisó la vista de cronograma/agenda.
4. Se consultó el directorio `/agente/clientes`.
5. Se abrió la ficha CRM del cliente.
6. Se localizó la cita asociada a la propiedad de prueba.
7. Se confirmó la cita del 6 de noviembre de 2026 a las 09:00.

Resultado: **flujo completado**. La navegación funcional no se bloqueó, aunque el panel presenta
el problema responsive descrito en F-006.

### Paso 7 — Auditoría automática con AXE

Se cargó la versión de `axe-core` incluida en `frontend/node_modules` y se ejecutó sobre el
documento completo y, para el modal de reserva, también sobre el nodo `[role="dialog"]`.

La forma equivalente de ejecución fue:

```javascript
const result = await window.axe.run(document, {
  resultTypes: ['violations', 'incomplete'],
});
```

Se registraron tanto `violations` como `incomplete`. Los resultados `incomplete` no se elevaron
automáticamente como defectos confirmados: se analizaron manualmente para distinguir problemas
reales de advertencias causadas por solapamiento visual o heurísticas que requieren revisión.

### Paso 8 — Prueba manual de teclado y foco

Se utilizó `Tab`, `Shift+Tab`, `Enter`, `Espacio` y `Escape` en desktop y mobile. Se observaron
los elementos mediante el snapshot de accesibilidad y se comprobó si el elemento activo permanecía
dentro del componente modal correspondiente.

### Paso 9 — Prueba responsive y visual

Se utilizaron las siguientes viewports:

| Perfil | Viewport |
| --- | ---: |
| Desktop | `1440 × 900` |
| Mobile | `390 × 844` |

Para cada ruta relevante se capturó la pantalla completa y se midió:

```javascript
{
  innerWidth: window.innerWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  horizontalOverflow:
    document.documentElement.scrollWidth >
    document.documentElement.clientWidth + 1,
}
```

---

## 6. Resultados funcionales

| Flujo | Resultado | Observación |
| --- | --- | --- |
| Landing pública | ✅ | Renderiza y permite iniciar navegación |
| Menú mobile | ✅ | Abre y permite acceder al catálogo |
| Catálogo | ✅ | Propiedades, filtros y navegación disponibles |
| Detalle de propiedad | ✅ | Se resolvió el identificador de la ruta |
| Favoritos | ✅ | La acción se reflejó en la interfaz |
| Consulta de disponibilidad | ✅ | Se cargaron horarios disponibles |
| Reserva de visita | ✅ | Se creó la cita para la propiedad de prueba |
| Navegación de visitas cliente | ✅ | Se mostró el contador de visitas |
| Dashboard agente | ✅ | Se pudo acceder y navegar |
| Agenda agente | ✅ | La cita creada estuvo disponible |
| Directorio de clientes | ✅ | Se encontró el cliente relacionado |
| Ficha CRM | ✅ | Se abrió la ficha; presenta defectos semánticos de landmarks |
| Confirmación de cita | ✅ | Yohan confirmó la cita de prueba |

Este resultado significa que el circuito funcional básico respondió; no significa que la interfaz
cumpla todavía con WCAG ni con los criterios visuales responsive.

---

## 7. Resultados de accesibilidad automática con AXE

Los impactos indicados abajo son los reportados por AXE. Un mismo defecto puede aparecer en varias
rutas o estados y se consolida como un solo hallazgo en §9.

| Ruta/estado | Reglas AXE observadas | Impacto reportado |
| --- | --- | --- |
| Home público `/` | `color-contrast`, `heading-order`, `link-name`, `region` | Serious / Moderate |
| Catálogo | `color-contrast`, `label-content-name-mismatch`, `link-name`, `region` | Serious / Moderate |
| Detalle `/properties/:id` | `color-contrast`, `heading-order`, `link-name`, `region` | Serious / Moderate |
| Login abierto | `button-name`, `color-contrast`, `heading-order`, `link-name`, `region` | Critical / Serious / Moderate |
| Modal de reserva | Sin violaciones confirmadas al auditar el dialog aislado; quedaron resultados `incomplete` para revisión | Incomplete |
| Dashboard `/agente` | `color-contrast`, `page-has-heading-one`, `region` | Serious / Moderate |
| Clientes `/agente/clientes` | `color-contrast`, `region` | Serious / Moderate |
| Ficha `/agente/clientes/:id` | `color-contrast`, `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`, `region` | Serious / Moderate |

### Observaciones concretas de AXE

- El contraste `#6b7280` sobre `#f8f6f3` produjo una relación observada de `4.48`, por debajo
  del mínimo esperado de `4.5:1` para texto normal.
- El footer presenta cuatro elementos `.footer__social-btn[href="#"]` sin nombre discernible.
- El control de visibilidad de contraseña del login aparece como un botón sin nombre accesible.
- El toggle visible `80–150` se reportó con `label-content-name-mismatch` frente al nombre
  accesible `Entre 80 y 150 m²`.
- AXE reportó saltos de jerarquía en `.footer__col:nth-child(2) > .footer__title`.
- El dashboard del agente no contiene un encabezado de nivel uno.
- Varias páginas tienen contenido fuera de landmarks, reportado mediante el selector `#root`.
- La ficha CRM contiene landmarks `main` anidados/duplicados.

### Interpretación frente a documentación histórica

Los documentos `docs/08_TASK_A11Y_PROP_02.md` y `docs/15_TASK_A11Y_PROP_03.md` registran
auditorías anteriores de alcance más reducido, especialmente sobre el catálogo y sus filtros.
Este informe evalúa el estado actual de la aplicación completa, incluyendo login, reserva, CRM y
dashboard. Por ello, el resultado actual no debe interpretarse como una contradicción de aquellas
pruebas históricas: el alcance, los estados y la versión auditada son diferentes.

---

## 8. Resultados de teclado, foco y modales

### 8.1 Navegación general

En el home público, el recorrido por `Tab` pasó por el logo, navegación, contacto, inicio de
sesión, llamada a ver propiedades y enlaces de contacto del footer. Los controles principales
fueron alcanzables con teclado.

### 8.2 Login — resultado no conforme

Con el foco inicial en el campo de correo, el recorrido observado fue equivalente a:

```text
correo → contraseña → botón mostrar/ocultar contraseña → recuperar contraseña
→ ingresar → continuar como invitado → registrarse → Concierge IA → body
```

El foco salió del modal antes de cerrarlo. Esto permite que el usuario interactúe con contenido
de fondo y luego termine en el `body`, aunque el componente se presenta como modal.

### 8.3 Reserva — resultado conforme en la prueba manual

El modal de reserva expone `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y
`aria-describedby`. Al pulsar `Tab` repetidamente, el foco permaneció dentro del dialog y alternó
entre sus controles. `Escape` cerró el modal correctamente.

El resultado `incomplete` de AXE sobre un párrafo del modal se debió a una condición de contraste
que el algoritmo no pudo resolver por solapamiento parcial; no se contabilizó como una violación
confirmada sin una revisión adicional.

### 8.4 Menú mobile

El menú mobile se pudo abrir y permitió seleccionar `Propiedades`. Las vistas públicas no
presentaron overflow horizontal en la medición realizada.

---

## 9. Hallazgos detallados

### F-001 — Botón de visibilidad de contraseña sin nombre accesible

**Severidad:** Crítica  
**Regla/evidencia:** AXE `button-name`, impacto `critical`  
**Ubicación:** modal de login; botón de mostrar/ocultar contraseña  

**Reproducción**

1. Abrir el home.
2. Seleccionar `Iniciar Sesión`.
3. Ejecutar AXE o navegar por los controles del formulario.
4. Inspeccionar el botón asociado al campo de contraseña.

**Resultado actual:** el botón no expone un nombre discernible para lector de pantalla ni snapshot
de accesibilidad.

**Resultado esperado:** el control debe anunciar una acción inequívoca, por ejemplo `Mostrar
contraseña` o `Ocultar contraseña`, y actualizar el nombre con el estado.

**Recomendación:** agregar un nombre accesible dinámico (`aria-label` o texto visible asociado),
mantener el estado (`aria-pressed` cuando corresponda) y cubrirlo con una prueba de accesibilidad.

---

### F-002 — El foco escapa del modal de login

**Severidad:** Alta  
**Regla relacionada:** patrón de dialog modal, orden de foco y navegación por teclado  
**Ubicación:** `frontend/src/components/auth/LoginModal.tsx`  

**Reproducción**

1. Abrir `Iniciar Sesión`.
2. Enfocar el campo de correo.
3. Pulsar `Tab` hasta recorrer todos los controles.
4. Continuar pulsando `Tab` después de `Regístrate aquí`.

**Resultado actual:** el foco pasa a `Abrir Concierge IA` y después al `body`, fuera del modal.

**Resultado esperado:** mientras el modal está abierto, el foco debe permanecer dentro de sus
controles; al cerrar, debe restaurarse en el botón que abrió el modal.

**Recomendación:** implementar o corregir el focus trap del dialog, gestionar foco inicial y
restauración de foco, y probar `Tab`, `Shift+Tab`, `Escape` y apertura repetida.

---

### F-003 — Enlaces sociales del footer sin nombre discernible

**Severidad:** Alta  
**Regla/evidencia:** AXE `link-name`, impacto `serious`, cuatro nodos  
**Ubicación:** footer de home, catálogo y detalle  

**Reproducción**

1. Abrir una vista pública.
2. Ejecutar AXE.
3. Revisar los cuatro `.footer__social-btn[href="#"]`.

**Resultado actual:** los enlaces no tienen texto accesible ni `aria-label` que indique la red o
la acción.

**Resultado esperado:** cada enlace debe tener un nombre único y descriptivo, por ejemplo
`Instagram de HouseBroker Perú`, `Facebook de HouseBroker Perú`, etc.; si todavía no existe un
destino real, no debería exponerse como enlace operativo.

**Recomendación:** agregar nombres accesibles y destinos válidos, o convertir los elementos en
contenido no interactivo hasta que exista una acción real.

---

### F-004 — Contraste insuficiente en texto y controles

**Severidad:** Alta  
**Regla/evidencia:** AXE `color-contrast`, impacto `serious`  
**Ubicación:** home, filtros, tarjetas, detalle, login, dashboard, clientes y footer  

**Reproducción**

1. Abrir las rutas incluidas en la matriz de §7.
2. Ejecutar AXE en cada estado.
3. Revisar los nodos reportados por `color-contrast`.

**Resultado actual:** se reportaron múltiples textos y controles por debajo de los umbrales. Un
caso medido fue `4.48:1` cuando se requería `4.5:1`.

**Resultado esperado:** texto normal con al menos `4.5:1`, texto grande con al menos `3:1`, y
controles/elementos gráficos con contraste suficiente según WCAG 2.2 AA.

**Recomendación:** consolidar tokens de color accesibles, medir estados normal/hover/focus/active
y no corregir únicamente el nodo que AXE muestre primero, porque el defecto se repite en varias
superficies.

---

### F-005 — Nombre accesible inconsistente en toggle de metraje

**Severidad:** Alta  
**Regla/evidencia:** AXE `label-content-name-mismatch`, impacto `serious`  
**Ubicación:** filtro de metraje del catálogo  

**Reproducción**

1. Abrir el catálogo.
2. Localizar el toggle que muestra visualmente `80–150`.
3. Ejecutar AXE o inspeccionar su nombre accesible.

**Resultado actual:** el texto visible y el nombre accesible no coinciden completamente; AXE
reportó el nombre `Entre 80 y 150 m²` frente al texto visible abreviado.

**Resultado esperado:** el nombre accesible debe contener el texto visible o el componente debe
usar un rótulo visible completo.

**Recomendación:** mantener un texto visible inequívoco o hacer que el nombre accesible incluya
el texto exacto visible, verificando también los demás toggles de metraje y habitaciones.

---

### F-006 — Overflow horizontal en el panel mobile del agente

**Severidad:** Alta  
**Evidencia:** viewport `390px`; `scrollWidth` del documento `424px`; tabla `474px`  
**Ubicación:** `/agente`, vista de cronograma/agenda  

**Reproducción**

1. Iniciar sesión como agente.
2. Abrir `/agente`.
3. Establecer viewport `390 × 844`.
4. Abrir la vista que contiene la tabla de citas.
5. Medir `document.documentElement.scrollWidth`.

**Resultado actual:** el documento mide `424px` y la tabla mide `474px`, por lo que columnas y
acciones quedan fuera de la viewport.

**Resultado esperado:** el panel debe adaptarse a `390px` sin hacer crecer el documento, o debe
ofrecer un contenedor de tabla desplazable claramente identificado y usable con teclado.

**Recomendación:** definir una estrategia responsive explícita para la tabla: tarjetas/filas
apiladas para mobile o scroll horizontal contenido dentro de una región con nombre y foco. No se
recomienda ocultar columnas esenciales sin exponer sus datos por otra vía.

---

### F-007 — Contenido fuera de landmarks

**Severidad:** Media  
**Regla/evidencia:** AXE `region`, impacto `moderate`, selector `#root`  
**Ubicación:** varias vistas públicas y de agente  

**Resultado actual:** AXE identifica contenido que no está contenido dentro de landmarks
semánticos suficientes.

**Resultado esperado:** la página debe exponer regiones claras y navegables, como `header`,
`nav`, un único `main`, `search` cuando corresponda, `aside`/`complementary` y `footer`.

**Recomendación:** revisar el árbol semántico de cada layout y no resolver el reporte agregando
landmarks genéricos o duplicados sin nombre.

---

### F-008 — Jerarquía de headings incorrecta y dashboard sin `<h1>`

**Severidad:** Media  
**Reglas/evidencia:** AXE `heading-order` y `page-has-heading-one`  
**Ubicación:** footer público y `/agente`  

**Resultado actual:** el footer presenta un salto de nivel en `.footer__title` y el dashboard
del agente no contiene un heading de nivel uno.

**Resultado esperado:** cada página debe tener un título principal identificable y los niveles de
heading deben avanzar sin saltos arbitrarios.

**Recomendación:** revisar la jerarquía completa del layout, no solo cambiar etiquetas para
silenciar AXE; el nivel debe representar la estructura real del contenido.

---

### F-009 — Landmarks `main` anidados y duplicados en la ficha CRM

**Severidad:** Media  
**Reglas/evidencia:** `landmark-main-is-top-level`, `landmark-no-duplicate-main` y
`landmark-unique`, impacto `moderate`  
**Ubicación:** `/agente/clientes/:id`, `.client-profile` y `div:nth-child(2) > main`  

**Resultado actual:** la ficha CRM contiene más de un `main` o un `main` dentro de otro landmark
principal.

**Resultado esperado:** debe existir un único `main` de nivel superior; los componentes internos
deben utilizar `section`, `article` o regiones nombradas según su función.

**Recomendación:** centralizar el landmark `main` en el layout de página y retirar el `main` de
los componentes anidados.

---

### F-010 — Texto literal `\n` visible al final de las páginas

**Severidad:** Baja, con impacto visual transversal  
**Evidencia:** capturas desktop/mobile de detalle, home y dashboard  

**Resultado actual:** las capturas muestran una secuencia literal `\n` al final de la página.

**Resultado esperado:** no debe aparecer texto técnico o de escape en la interfaz del usuario.

**Recomendación:** localizar el origen del string en el renderizado, revisar concatenaciones y
templates, y agregar una prueba visual/DOM que impida volver a mostrar escapes literales.

---

### OBS-001 — Posible solapamiento del Concierge en contenido mobile

**Clasificación:** Observación pendiente de confirmación  
**Evidencia:** capturas de páginas completas en viewport `390 × 844`  

El widget Concierge puede superponerse visualmente con contenido inferior en algunas capturas.
No se elevó como defecto confirmado porque requiere una comprobación adicional con el estado
exacto del widget, scroll y z-index. Debe verificarse junto con F-006 y F-010.

---

### QA-TEST-01 — Cuatro fallos en la suite frontend completa

**Clasificación:** Riesgo de regresión / pendiente de triage  
**Ubicación:** `frontend/src/components/properties/useFilterParams.test.jsx`  

La ejecución completa registró `475` pruebas exitosas y `4` fallidas. Los fallos no se
relacionaron con los defectos A11y/UI observados durante esta auditoría, pero no deben quedar
ocultos dentro de un resultado global. Se recomienda identificar si corresponden a una expectativa
desactualizada, a una regresión del hook o a una diferencia de entorno antes del siguiente release.

---

## 10. Priorización de remediación

### P0 — Antes de cualquier sign-off A11y/UI

1. Corregir el nombre accesible del botón de visibilidad de contraseña (F-001).
2. Encerrar el foco del login y restaurarlo al cerrar (F-002).
3. Corregir el contraste de textos y controles en todas las superficies repetidas (F-004).
4. Dar nombre y destino válidos a los cuatro enlaces sociales (F-003).
5. Eliminar el overflow horizontal del panel del agente en `390px` (F-006).

### P1 — Antes de declarar WCAG AA conforme

1. Corregir el mismatch de nombre visible/accesible en filtros (F-005).
2. Revisar landmarks y dejar un único `main` por página (F-007 y F-009).
3. Añadir el `h1` del dashboard y corregir la jerarquía de headings (F-008).

### P2 — Calidad visual y estabilidad

1. Retirar el texto literal `\n` (F-010).
2. Confirmar o descartar el solapamiento del Concierge (OBS-001).
3. Resolver los cuatro fallos de `useFilterParams.test.jsx` (QA-TEST-01).
4. Instalar/ejecutar Lighthouse en un entorno autorizado si se requieren métricas actuales de
   performance, SEO y Best Practices.

---

## 11. Plan de re-prueba y criterios de salida

Después de aplicar correcciones, la re-prueba debe repetir las mismas rutas, estados y viewports.
No es suficiente validar únicamente el componente modificado.

### 11.1 Comandos mínimos

```bash
# Estado del entorno
docker compose -f infra/docker-compose.yml ps

# Build frontend
cd frontend
npm run build

# Suite automatizada de accesibilidad
npm test -- --runInBand --testPathPatterns=a11y

# Suite completa
npm test -- --runInBand

# Backend, según el comando documentado por el proyecto
cd ../backend
DJANGO_DB_ENGINE=sqlite uv run python manage.py test apps.properties
```

### 11.2 Criterios de aceptación para cerrar la auditoría

- AXE sin violaciones `critical` o `serious` en home, catálogo, detalle, login, reserva y CRM.
- Botón de contraseña con nombre accesible que refleje su estado.
- El foco del login permanece dentro del dialog y vuelve al disparador al cerrar.
- Cada enlace social tiene nombre accesible y destino válido, o deja de ser enlace.
- Contraste mínimo WCAG 2.2 AA verificado en estados normales y de foco.
- Un único `main` de nivel superior por página y landmarks correctamente nombrados.
- Un `<h1>` coherente en el dashboard y jerarquía sin saltos.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` en las
  vistas mobile auditadas, salvo un scroll interno explícitamente diseñado y accesible.
- La tabla/agenda del agente es operable en `390 × 844` sin perder acciones esenciales.
- No aparece `\n` literal en las capturas ni en el árbol DOM visible.
- Suite frontend completa sin fallos no justificados.
- Repetición del flujo cliente–agente con una cita nueva o un dataset controlado para comprobar
  que las correcciones no rompan el negocio.

---

## 12. Registro de evidencias

| Evidencia | Descripción |
| --- | --- |
| `docker compose ps` | Tres contenedores `running` al cierre de la revisión |
| `GET /` | Frontend respondió `200` |
| `GET /api/health/` | API respondió `200` con `status: ok` |
| AXE home/catálogo | Contraste, footer, headings y landmarks |
| AXE detalle | Contraste, footer, headings y región |
| AXE login | Botón sin nombre, contraste, footer, headings y región |
| AXE reserva | Dialog sin violaciones confirmadas; resultados `incomplete` analizados |
| AXE dashboard | Contraste, ausencia de `h1` y región |
| AXE clientes/ficha CRM | Contraste, región y landmarks duplicados en ficha |
| Playwright keyboard | Foco escapable en login; reserva mantiene foco y cierra con `Escape` |
| Playwright responsive | Público sin overflow; agente mobile con `424px` de contenido |
| Captura detalle desktop | `page-2026-11-05T01-08-43-057Z.png` |
| Captura detalle mobile | `page-2026-11-05T01-08-52-395Z.png` |
| Captura home mobile | `page-2026-11-05T01-09-36-338Z.png` |
| Captura agente desktop | `page-2026-11-05T01-10-17-749Z.png` |
| Captura agente mobile | `page-2026-11-05T01-10-26-027Z.png` |
| Pruebas A11y frontend | `7` suites, `72/72` pruebas |
| Suite backend | `335/335` pruebas |
| Suite CRM | `15/15` pruebas |
| Suite frontend completa | `475` pasan; `4` fallan en `useFilterParams.test.jsx` |

Las capturas y logs de Playwright se generaron en el directorio temporal del runtime y no se
versionaron como parte de este documento. Los resultados numéricos y las rutas quedaron
registrados aquí para permitir la repetición.

---

## 13. Integridad del trabajo y archivos relevantes

Durante la auditoría de accesibilidad y calidad visual no se modificó código de aplicación. Al
inicio del trabajo documental ya existían cambios de preparación en:

- `frontend/src/services/appointments.ts`;
- `frontend/src/services/appointments.test.jsx`.

Este informe agrega únicamente la documentación de auditoría:

- `docs/qa/01_Informe_Auditoria_QA_A11y_UI.md`.

Archivos consultados para comprender el sistema y sus criterios:

- `README.md`;
- `infra/docker-compose.yml`;
- `backend/apps/properties/management/commands/seed_demo.py`;
- `frontend/src/components/auth/LoginModal.tsx`;
- `frontend/src/components/crm/AppointmentModal.tsx`;
- `frontend/src/components/crm/ClientProfileView.tsx`;
- `frontend/src/components/admin/AgentePanel.tsx`;
- `docs/03_UX_UI_Autenticacion.md`;
- `docs/04_UX_UI_CRM.md`;
- `docs/06_UX_UI_PROP.md`;
- `docs/08_TASK_A11Y_PROP_02.md`;
- `docs/12_Pruebas_Automatizadas.md`;
- `docs/15_TASK_A11Y_PROP_03.md`.

---

## 14. Referencias

- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- axe-core: <https://github.com/dequelabs/axe-core>
- Documentación de ejecución del proyecto: `README.md` §4.
- Estrategia automatizada: `docs/12_Pruebas_Automatizadas.md`.
- Accesibilidad histórica del catálogo: `docs/08_TASK_A11Y_PROP_02.md` y
  `docs/15_TASK_A11Y_PROP_03.md`.
