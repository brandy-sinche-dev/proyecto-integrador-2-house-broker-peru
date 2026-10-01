# [TASK-A11Y-PROP-02] Accesibilidad WCAG 2.2 AA en Catálogo y Paginación


## 1. Objetivo

Garantizar que el catálogo y el sistema de paginación cumplan con los criterios de accesibilidad establecidos por **WCAG 2.2 Nivel AA**, facilitando su uso por personas que utilizan teclado y lectores de pantalla.

## 2. Implementación realizada

Se realizaron las siguientes mejoras de accesibilidad:

### 2.1 Etiquetas ARIA en la paginación

Se agregaron etiquetas `aria-label` descriptivas a los controles de paginación para que los lectores de pantalla puedan identificar correctamente la función de cada botón.

Ejemplos:

* `Ir a la página 1`
* `Ir a la página 2`
* `Ir a la página 3`
* `Página siguiente`
* `Página anterior`

### 2.2 Notificación de cambios del catálogo

Se incorporó `aria-live="polite"` en el contenedor correspondiente al catálogo.

Esto permite que los lectores de pantalla sean informados cuando el contenido del catálogo cambia como consecuencia de una navegación entre páginas, sin interrumpir inmediatamente la interacción del usuario.

### 2.3 Navegación mediante teclado

Se verificó que los controles del catálogo y la paginación puedan utilizarse mediante teclado.

Se realizaron pruebas utilizando:

* `Tab` para avanzar entre elementos interactivos.
* `Shift + Tab` para retroceder.
* `Enter` para activar los controles.

También se verificó que no exista una **trampa de foco (Focus Trap)** que impida al usuario continuar o retroceder en la navegación.

### 2.4 Auditoría de accesibilidad

Se realizó una auditoría utilizando **AXE DevTools** para identificar posibles problemas relacionados con accesibilidad.

Se verificaron los criterios correspondientes a los niveles **A y AA**.

**Resultado:** 0 violaciones detectadas en la auditoría realizada.

## 3. Criterios de aceptación

| Criterio                                           | Resultado      |
| -------------------------------------------------- | -------------- |
| Botones de paginación con `aria-label` descriptivo | ✅ Cumplido     |
| Contenedor del catálogo con `aria-live="polite"`   | ✅ Cumplido     |
| Navegación mediante `Tab`                          | ✅ Cumplido     |
| Navegación mediante `Shift + Tab`                  | ✅ Cumplido     |
| Activación mediante `Enter`                        | ✅ Cumplido     |
| Sin Focus Trap                                     | ✅ Cumplido     |
| Auditoría con AXE DevTools                         | ✅ Realizada    |
| Violaciones WCAG A/AA                              | ✅ 0 detectadas |

## 4. Evidencias

Se adjuntan como evidencia de la implementación:

* Capturas de la paginación mostrando los controles accesibles.
* Captura de la inspección de los elementos donde se observan los atributos ARIA.
* Captura de la prueba de navegación mediante teclado.
* Captura del resultado de la auditoría de AXE DevTools mostrando 0 violaciones.

## 5. Resultado final

La funcionalidad de catálogo y paginación fue adaptada para mejorar su accesibilidad y facilitar su utilización mediante teclado y tecnologías de asistencia.

La implementación cumple con los puntos establecidos en la tarea **TASK-A11Y-PROP-02** y la auditoría realizada con AXE DevTools no reportó violaciones de nivel A o AA.
