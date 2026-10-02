# [TASK-UI-PROP-02] Diseño de componentes UI en Figma para Catálogo y Detalle

## 1. Objetivo

Diseñar en Figma los componentes y layouts necesarios para las vistas de catálogo y detalle de propiedades, considerando un diseño responsivo para dispositivos **Desktop y Mobile**.

El diseño busca establecer una base visual consistente para el desarrollo de la interfaz y facilitar el hand-off entre diseño y desarrollo.

## 2. Componentes diseñados

Se diseñaron los siguientes componentes dentro del Design System:

### 2.1 PropertyCard

Componente utilizado para representar una propiedad dentro del catálogo.

El componente contempla la información visual necesaria para identificar una propiedad, incluyendo:

* Imagen de la propiedad.
* Título o nombre.
* Ubicación.
* Precio.
* Información relevante de la propiedad.
* Acciones correspondientes.

### 2.2 PropertyGrid

Se diseñó la estructura de grid utilizada para organizar las tarjetas de propiedades dentro del catálogo.

El layout contempla diferentes distribuciones según el tamaño de pantalla:

* Desktop.
* Mobile.

Se consideró la adaptación del contenido para mantener una correcta visualización y distribución de las tarjetas.

### 2.3 PaginationControl

Se diseñó el componente de paginación para permitir la navegación entre las diferentes páginas del catálogo.

El componente contempla los controles necesarios para:

* Página anterior.
* Página siguiente.
* Selección de página.
* Identificación de la página actual.

## 3. Estados de los componentes

Se definieron las diferentes variantes visuales requeridas para los componentes:

| Estado          | Descripción                                                     |
| --------------- | --------------------------------------------------------------- |
| Normal          | Estado predeterminado del componente.                           |
| Hover           | Apariencia al colocar el cursor sobre el elemento.              |
| Focus           | Apariencia cuando el elemento recibe el foco.                   |
| Disabled        | Estado en el que la interacción se encuentra deshabilitada.     |
| Skeleton Loader | Estado de carga mientras la información aún no está disponible. |

Estas variantes permiten mantener un comportamiento visual consistente en diferentes situaciones de interacción y carga.

## 4. Diseño de la vista de detalle

Se diseñó el layout completo correspondiente a la vista de detalle del inmueble:

```text
/properties/{id}
```

La vista contempla la organización de la información de una propiedad y su adaptación a diferentes tamaños de pantalla.

Se consideraron versiones para:

* Desktop.
* Mobile.

La estructura permite presentar de forma organizada la información principal, imágenes, características y acciones relacionadas con el inmueble.

## 5. Diseño responsivo

Se establecieron layouts adaptados a:

### Desktop

* Distribución amplia del contenido.
* Grid de propiedades.
* Espaciado adecuado entre componentes.
* Organización de la información de detalle.

### Mobile

* Adaptación del grid a pantallas pequeñas.
* Componentes reorganizados verticalmente.
* Ajuste de tamaños y espaciados.
* Navegación y contenido optimizados para interacción táctil.

## 6. Especificaciones para Hand-off

Se definieron en Figma las especificaciones necesarias para facilitar la implementación del diseño por parte del equipo de desarrollo.

Se consideraron:

### Espaciado

Definición de márgenes, padding y separación entre componentes.

### Colores

Definición de los colores utilizados por el tema y sus diferentes aplicaciones dentro de la interfaz.

### Tipografía

Definición de:

* Familia tipográfica.
* Tamaños.
* Pesos.
* Jerarquías de texto.

Estas especificaciones permiten mantener consistencia visual durante la implementación.

## 7. Criterios de aceptación

| Criterio                                | Resultado  |
| --------------------------------------- | ---------- |
| Componente `PropertyCard` diseñado      | ✅ Cumplido |
| Componente `PropertyGrid` diseñado      | ✅ Cumplido |
| Componente `PaginationControl` diseñado | ✅ Cumplido |
| Estado Normal                           | ✅ Cumplido |
| Estado Hover                            | ✅ Cumplido |
| Estado Focus                            | ✅ Cumplido |
| Estado Disabled                         | ✅ Cumplido |
| Estado Skeleton Loader                  | ✅ Cumplido |
| Vista de detalle `/properties/{id}`     | ✅ Cumplido |
| Diseño Desktop                          | ✅ Cumplido |
| Diseño Mobile                           | ✅ Cumplido |
| Especificaciones de espaciado           | ✅ Cumplido |
| Especificaciones de colores             | ✅ Cumplido |
| Especificaciones de tipografía          | ✅ Cumplido |
| Preparación para Hand-off               | ✅ Cumplido |

## 8. Evidencias

Se incluyen como evidencia:

* Enlace al archivo/proyecto de Figma.
* Capturas de los componentes del Design System.
* Capturas de las variantes de estados.
* Capturas del catálogo en Desktop y Mobile.
* Capturas de la vista de detalle en Desktop y Mobile.
* Capturas o referencias a las especificaciones de diseño utilizadas para el Hand-off.

## 9. Resultado final

Se completó el diseño UI de los componentes principales del catálogo y la vista de detalle de propiedades en Figma.

El diseño incluye componentes reutilizables, variantes de estados, layouts responsivos para Desktop y Mobile y especificaciones visuales de espaciado, colores y tipografía para facilitar su implementación durante el desarrollo.
