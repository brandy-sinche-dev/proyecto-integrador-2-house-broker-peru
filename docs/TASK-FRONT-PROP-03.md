# [TASK-FRONT-PROP-03] Implementación de lógica de filtrado y sync con URL en React

**Parent Issue:** #HU-PROP-03
**Assignee:** Yohan Ñato
**Estimación:** 12h
**Labels:** `frontend`, `react`

## 1. Objetivo

Implementar la lógica de filtrado del catálogo en React, permitiendo gestionar el estado de los filtros y mantenerlo sincronizado con los parámetros de búsqueda (`searchParams`) de la URL.

Esto permite conservar los filtros aplicados al navegar o recargar la página y facilita compartir una URL con los filtros seleccionados.

## 2. Implementación realizada

### 2.1 Componente `FilterPanel`

Se implementó el componente `FilterPanel` encargado de mostrar y gestionar los controles de filtrado.

El componente permite al usuario modificar los diferentes criterios de búsqueda y mantiene estos valores sincronizados con el estado utilizado por la aplicación.

### 2.2 Sincronización de filtros con la URL

Se implementó un hook personalizado utilizando `useSearchParams` para leer y escribir los parámetros de filtrado en la URL.

El funcionamiento implementado permite:

* Leer los filtros existentes desde los parámetros de la URL.
* Actualizar los parámetros cuando el usuario modifica un filtro.
* Mantener sincronizado el estado de los filtros con la URL.
* Recuperar los filtros al cargar nuevamente la página.

Ejemplo conceptual:

```text
Usuario modifica filtro
        ↓
Actualización del estado
        ↓
Actualización de searchParams
        ↓
URL refleja los filtros seleccionados
```

### 2.3 Función "Limpiar Filtros"

Se implementó la opción **"Limpiar Filtros"**, que permite restablecer todos los criterios de filtrado a su estado inicial.

Al ejecutar esta acción:

1. Se reinicia el estado de los filtros.
2. Se eliminan los parámetros de filtrado de la URL.
3. El catálogo vuelve a mostrar los resultados correspondientes al estado inicial.

## 3. Criterios de aceptación

| Criterio                                            | Resultado  |
| --------------------------------------------------- | ---------- |
| Componente `FilterPanel` implementado               | ✅ Cumplido |
| Controles vinculados al estado de filtros           | ✅ Cumplido |
| Hook personalizado para gestionar parámetros de URL | ✅ Cumplido |
| Lectura de filtros desde `searchParams`             | ✅ Cumplido |
| Escritura/actualización de filtros en la URL        | ✅ Cumplido |
| Estado sincronizado con la URL                      | ✅ Cumplido |
| Función "Limpiar Filtros" implementada              | ✅ Cumplido |
| Limpieza del estado al restablecer filtros          | ✅ Cumplido |
| Limpieza de los parámetros de la URL                | ✅ Cumplido |

## 4. Flujo de funcionamiento

El flujo implementado es el siguiente:

```text
┌─────────────────┐
│   FilterPanel   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Estado filtros  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useSearchParams │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ URL / Parámetros│
└─────────────────┘
```

Para la limpieza:

```text
"Limpiar Filtros"
       ↓
Reiniciar estado
       ↓
Eliminar searchParams
       ↓
URL vuelve al estado inicial
```

## 5. Pruebas realizadas

Se verificó el funcionamiento de la implementación mediante las siguientes pruebas:

* Selección y modificación de filtros.
* Verificación de la actualización de los parámetros en la URL.
* Recarga de la página para comprobar la recuperación de los filtros desde la URL.
* Eliminación individual/modificación de los criterios de filtrado.
* Uso de la opción **"Limpiar Filtros"**.
* Verificación de que, al limpiar los filtros, los parámetros correspondientes sean eliminados de la URL.

## 6. Evidencias

Se adjuntan como evidencia:

* Captura del componente `FilterPanel`.
* Captura de la URL mostrando los parámetros de filtrado.
* Captura de la aplicación con filtros seleccionados.
* Captura del resultado después de utilizar **"Limpiar Filtros"**.
* Capturas o referencia al código del hook encargado de gestionar `useSearchParams`.

## 7. Resultado final

Se implementó la lógica de filtrado del catálogo y la sincronización entre el estado de la aplicación y los parámetros de búsqueda de la URL.

La funcionalidad permite mantener los filtros seleccionados en la URL y restablecer tanto el estado de la aplicación como los parámetros de búsqueda mediante la opción **"Limpiar Filtros"**.
