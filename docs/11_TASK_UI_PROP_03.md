# [TASK-UI-PROP-03] Diseño UI/UX del Panel de Filtros

## 1. Objetivo

Diseñar en Figma la interfaz responsiva del panel de filtros para el catálogo de propiedades, considerando una experiencia de uso adecuada tanto para dispositivos Desktop como Mobile.

El diseño contempla un panel lateral fijo para pantallas grandes y un componente tipo Drawer/Modal para dispositivos móviles.

## 2. Implementación del diseño

### 2.1 Panel lateral Desktop

Se diseñó un panel lateral fijo para la vista Desktop, destinado a contener los diferentes criterios de filtrado del catálogo.

El panel permite organizar de manera clara los controles de filtrado y mantenerlos disponibles mientras el usuario consulta los resultados.

## 3. Drawer / Modal Mobile

Se diseñó una versión adaptada para dispositivos móviles mediante un componente tipo **Drawer**, que permite mostrar y ocultar el panel de filtros mediante una interacción deslizable.

El diseño considera:

* Apertura del panel desde el lateral.
* Organización vertical de los filtros.
* Botón para cerrar el panel.
* Acciones para aplicar o restablecer los filtros.
* Adaptación a pantallas de menor tamaño.

## 4. Componentes de interacción

Se diseñaron los componentes necesarios para permitir la selección y configuración de los filtros.

### Slider de rango

Componente utilizado para seleccionar valores dentro de un rango, por ejemplo:

* Precio mínimo.
* Precio máximo.

### Checkbox

Permite seleccionar una o varias opciones simultáneamente dentro de una categoría de filtros.

### Select

Permite seleccionar una opción de una lista de valores disponibles.

### Botón de Reset

Se diseñó el botón de restablecimiento para permitir al usuario limpiar los filtros seleccionados y regresar al estado inicial.

## 5. Diseño responsivo

Se definieron las siguientes adaptaciones:

| Vista   | Diseño                  |
| ------- | ----------------------- |
| Desktop | Panel lateral fijo      |
| Mobile  | Drawer/Modal deslizable |

El contenido y los controles se reorganizan según el tamaño de pantalla para mantener una experiencia consistente y facilitar la interacción.

## 6. Criterios de aceptación

| Criterio                        | Resultado  |
| ------------------------------- | ---------- |
| Panel lateral fijo para Desktop | ✅ Cumplido |
| Drawer/Modal para Mobile        | ✅ Cumplido |
| Slider de rango                 | ✅ Cumplido |
| Checkbox                        | ✅ Cumplido |
| Select                          | ✅ Cumplido |
| Botón de Reset                  | ✅ Cumplido |
| Diseño responsivo               | ✅ Cumplido |

## 7. Evidencias

Se incluyen como evidencia:

* Enlace al archivo/proyecto de Figma.
* Captura del panel lateral en Desktop.
* Captura del Drawer en Mobile.
* Capturas de los sliders de rango.
* Capturas de los Checkboxes.
* Capturas de los Selects.
* Captura del botón de Reset.

## 8. Resultado final

Se completó el diseño UI/UX del panel de filtros para las vistas Desktop y Mobile.

El diseño proporciona una estructura clara para los controles de filtrado y contempla los principales componentes de interacción necesarios para la selección, modificación y restablecimiento de los filtros.
