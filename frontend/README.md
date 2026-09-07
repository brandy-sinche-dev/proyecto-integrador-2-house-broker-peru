# Frontend — HouseBroker Perú

## Instalación

```bash
npm install
```

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo (Vite)
npm run build    # Compilación de TypeScript y build de producción
npm run lint     # Linter (Oxlint)
npm run preview  # Previsualizar el build de producción
```

## Variables de entorno

Configúralas en un archivo `.env` (usa `.env.example` como referencia):

| Variable             | Descripción                                                | Valor por defecto            |
|----------------------|------------------------------------------------------------|------------------------------|
| `VITE_API_URL`       | URL base de la API (incluye el prefijo `/api`)             | `http://localhost:8000/api`  |
| `VITE_ENABLE_MOCKS`  | Activa el módulo de simulación de datos (`true`/`false`)   | `false`                      |

## Servicio de Mocks (axios-mock-adapter)

El módulo vive en **`src/services/mocks`** y aísla el desarrollo del Front-End
simulando las respuestas de la API definidas en el contrato
`docs/api/openapi_spec.yaml` (TASK-ARC-PROP-01).

### ¿Cómo se activa?

Crea un archivo `.env` con `VITE_ENABLE_MOCKS=true`. Al arrancar el proyecto,
`src/main.tsx` ejecuta `setupMocks()`, que intercepta las peticiones del
cliente de Axios (`src/services/axios.ts`).

Las peticiones que no coinciden con ningún endpoint simulado pasan directo al
backend real (`onNoMatch: 'passthrough'`).

### Endpoints simulados

| Método | Ruta                  | Respuesta(s)                                 |
|--------|-----------------------|----------------------------------------------|
| GET    | `/v1/properties`      | `200` lista de propiedades ✓ / `500`         |
| POST   | `/v1/properties`      | `201` propiedad creada ✓ / `400`             |
| GET    | `/v1/properties/{id}` | `200` detalle ✓ / `404`                      |
| PUT    | `/v1/properties/{id}` | `200` actualizada ✓ / `400` / `404`          |
| DELETE | `/v1/properties/{id}` | `200` baja lógica ✓ / `404`                  |

### Persistencia en memoria

Los datos viven en un arreglo en memoria durante toda la sesión del navegador
(`src/services/mocks/data/properties.ts` trae un fixture de 25 propiedades).
Los cambios hechos con POST/PUT/DELETE se mantienen mientras la pestaña esté
abierta; al recargar se restaura el fixture inicial.

### Simulación de errores

- **`400`**: se retorna automáticamente al enviar datos inválidos en POST/PUT
  (campos requeridos vacíos, `price` no numérico/negativo, `property_type`
  fuera del enum `DEPARTAMENTO | CASA | TERRENO | OFICINA`).
- **`404`**: se retorna al consultar un `id` inexistente.
- **`500`**: forzable enviando el header `X-Mock-Error: 500` en la petición
  para probar el manejo de errores del servidor. Ejemplo:

```ts
api.get('/v1/properties', { headers: { 'X-Mock-Error': '500' } })
```

### API del servicio

La capa de servicios (`src/services/properties.ts`) expone funciones tipadas
alineadas al contrato:

```ts
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from './services/properties'

const lista = await getProperties()
const detalle = await getProperty('id-propiedad')
const creada = await createProperty({ title, price, address, property_type })
const actualizada = await updateProperty('id-propiedad', { ... })
const desactivada = await deleteProperty('id-propiedad')
```
