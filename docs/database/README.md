# Documentación de Base de Datos — HouseBroker Perú

Modelo de datos del backend (Django + PostgreSQL 16).

> **Alcance:** Especificación del modelo de datos completo (ERS, tablas, columnas,
> restricciones, índices y clasificación de datos). Sustituye a la rama local
> obsoleta `docs/task-arc-prop-04`.

## Por qué este documento es más extenso que el de API

`docs/api/` describe **lo que cruza el cable**. Este documento describe **lo que
existe**, y son cosas distintas a propósito:

| | `docs/api/` | `docs/database/` |
|---|---|---|
| Objeto | Contrato HTTP (`openapi_spec.yaml`) | Esquema PostgreSQL |
| Público objetivo | Frontend, QA, integraciones | Backend, datos, seguridad |
| Rompe por | Cambiar un `status` o un filtro | Migrar una columna o una tabla |
| Visible para el cliente | Todo lo que devuelve un endpoint | Nada directamente |

Las dos_difference que justifican que este documento sea más largo:

- **La API proyecta; la base de datos conserva.** Un endpoint de lista devuelve 5
  columnas de una fila de 30. Lo que no se envía no está inútil: sostiene los
  reportes, la auditoría, el CRM y el pipeline de recomendación.
- **La API nunca expone lo sensible.** Contraseñas hasheadas, tokens de
  recuperación, direcciones IP, notas internas del agente, el margen de comisión,
  la identidad del propietario y los contrasentidos de negociación **existen en
  columnas que ningún esquema de `openapi_spec.yaml` nombra**. Documentarlas acá
  es lo que permite auditarlas.

Esas dos diferencias son las que justifican que este documento sea más largo que
el de API.

La sección [`security-and-privacy.md`](security-and-privacy.md) clasifica cada
columna en `PÚBLICA`, `INTERNA` o `RESTRINGIDA` y declara explícitamente si puede
aparecer en una respuesta de API. Esa tabla es la frontera entre los dos
documentos.

## Regla de oro

> Si un dato no está en `docs/api/`, su ausencia en la API **no** significa que
> no exista en la base de datos. Significa que es interno.
>
> Y a la inversa: si una columna aparece en `openapi_spec.yaml`, **debe** existir
> como columna o como valor derivado documentado acá. La especificación de API es
> un subconjunto del modelo de datos, nunca un invento independiente.

## Documentos

| Archivo | Contenido |
|---|---|
| [`architecture.md`](architecture.md) | ERS completo, agrupación por dominio, límites de módulo |
| [`data-model.md`](data-model.md) | Tabla por tabla, columna por columna, con restricciones |
| [`catalogs.md`](catalogs.md) | Enumeraciones, catálogo de distritos (INEI), datos semilla |
| [`security-and-privacy.md`](security-and-privacy.md) | Clasificación de datos, PII, matriz de exposición, retención |
| [`indexes-and-queries.md`](indexes-and-queries.md) | Índices, constraints de integridad, consultas que los justifican |
| [`migrations-and-seeding.md`](migrations-and-seeding.md) | Estrategia de migraciones y plan de carga inicial |

## Estado del artefacto

Este documento es **especificación de diseño**, no descripción de un esquema ya
migrado. Estado real del backend al momento de escribir esto:

| Componente | Estado |
|---|---|
| `infra/docker-compose.yml` (PostgreSQL 16-alpine, puerto `5433`) | Existe |
| `backend/config/settings.py` → `DATABASES` con `django.db.backends.postgresql` | Existe |
| Driver `psycopg[binary]>=3.3.5` declarado en `pyproject.toml` | Existe |
| `.env.example` con `POSTGRES_DB/USER/PASSWORD/HOST/PORT` | Existe |
| App `apps/` | **Paquete vacío** |
| `AUTH_USER_MODEL` | **No definido** (se usa `django.contrib.auth.models.User`) |
| `models.py` / `migrations/` / `admin.py` | **No existen** |

Por lo tanto este documento es el contrato que la implementación de modelos debe
satisfacer, y las fases de `migrations-and-seeding.md` están escritas como
próximos pasos, no como algo ya ejecutado.

## Configuración de referencia

Extraída literalmente de `backend/config/settings.py` y `infra/docker-compose.yml`.
Cualquier cambio aquí obliga a actualizar las dos fuentes.

| Parámetro | Valor | Origen |
|---|---|---|
| Motor | `django.db.backends.postgresql` | `settings.py` |
| Puerto en el host | `5433` → contenedor `5432` | `docker-compose.yml` |
| Base de datos | `housebroker` | `POSTGRES_DB` |
| Usuario | `housebroker` | `POSTGRES_USER` |
| Versión de Postgres | 16 (imagen `-alpine`) | `docker-compose.yml` |
| Zona horaria | `America/Lima` | `TIME_ZONE` |
| Lenguaje | `es-pe` | `LANGUAGE_CODE` |
| Zona horaria consciente | `USE_TZ = True` | `settings.py` |
| Driver | `psycopg` 3.3.5 | `pyproject.toml` |
| Volumen persistente | `postgres_data` | `docker-compose.yml` |

**Consecuencia de `USE_TZ = True`:** toda columna de fecha/hora de este modelo es
`timestamptz` y se almacena en **UTC**. Solo las horas del día de la agenda
semanal se guardan como `time` sin zona, porque un bloque `09:00` significa las
09:00 de Lima los lunes de octubre y de enero por igual. Esa asimetría es
deliberada y está documentada en [`data-model.md`](data-model.md).

## Convenciones

### Nombres

- **Tablas y columnas:** `snake_case`, singular en inglés (`property`, `appointment`),
  columnas en inglés. Coincide con `Property.id`, `Appointment.status`, etc. del
  spec, de modo que el mapeo ORM→JSON sea directo.
- **Clases Django:** `PascalCase` (`Property`, `AppointmentStatusChange`).
- **Relaciones inversas:** `related_name` explícito en **todas** las `ForeignKey`,
  sin depender del nombre por defecto `<model>_set`. Un `related_name` implícito
  es una dependencia oculta entre apps.

### Llaves primarias

Toda llave primaria es **UUID v4** (`uuid` de Postgres), nunca `serial`. Razón:
el frontend ya maneja UUID (`format: uuid` en todo el spec, fixtures
`b2c1f5a0-…-111111111111`), los identificadores viajan en URLs cacheables y en
correos, y un `serial` filtra volumen de negocio. El único autoincremental es
`django_migrations`, que es interno de Django.

`DEFAULT_AUTO_FIELD` **no está definido** en `settings.py` (hoy produce `id`
`AutoField` en las apps de contrib). Al crear `apps/users` hay que fijar
`DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'` **antes** de la primera
migración, o django creará claves primarias `INTEGER` en las tablas nuevas.

### Marcas de tiempo

| Convención | Significado |
|---|---|
| `created_at` | Inserción. Inmutable. `default=timezone.now` |
| `updated_at` | Última modificación de la fila. `auto_now=True` |
| `deleted_at` | Eliminación lógica. `NULL` en filas vivas |

Se usa `timezone.now`, nunca `datetime.now`: con `USE_TZ = True` un
`datetime.now()` naïve produce un `timestamptz` interpretado en la zona del
servidor, que no es `America/Lima` en un contenedor UTC.

### Nulos

Dos clases de nulidad, y no son intercambiables:

- **Ausencia real** → `NULL`. Ejemplo: una propiedad sin cocina (`amenities.cooking IS NULL`).
- **Pendiente de completar** → `NOT NULL DEFAULT`. Ejemplo: `property.status` nace
  en `DISPONIBLE`, no en `NULL`.

Una columna `NULL` que representa un valor válido del dominio (como
`price = NULL` significando "precio a consultar") se documenta como tal en
`data-model.md`. Si el dominio no admite el valor, es `NOT NULL`.

### Booleanos

Se llaman con prefijo `is_` o `has_`, nunca negativos. `is_active = false` es el
significado en todo el sistema. No existe un `disabled` ni un `deleted` en
`boolean`; la eliminación lógica se expresa con `is_active` + `deleted_at`.

### Enumeraciones

Todo dominio cerrado se almacena como `varchar` con `CHECK`, **no** como tipo
`ENUM` nativo de Postgres ni como `IntegerField` con números mágicos.

Dos razones concretas:

1. `ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de una transacción en
   Postgres 16, lo que complica las migraciones de Django.
2. Un `ENUM` nativo obliga a bloquear y reescribir la tabla para reordenar
   valores. Con `varchar` + `CHECK`, se suelta el `CHECK` y se añade otro.

La lista completa de valores y su código para migraciones de datos está en
[`catalogs.md`](catalogs.md).

## Trazabilidad

Cada tabla declara a qué épica y a qué historias de usuario responde, con el
mismo formato `EPIC-HU-NN` del backlog (`docs/scrum/backlog.md`). Las historias
son de negocio, no técnicas: `HU-PROP-04` «Gestionar disponibilidad de
propiedades» es lo que justifica `property.status` y
`property_status_change`, no `RF-PROP-04`.

## Divergencias conocidas con la API

Estas son deliberadas. La columna existe en la base de datos y **no** se expone.

| Columna / estructura | Por qué no sale por API |
|---|---|
| `user.password` | Hash Bcrypt. Escribes credenciales, jamás lees el hash |
| `password_reset_token.token_hash` | Equivale a la contraseña mientras vigente |
| `property.owner_*` | Identidad del propietario. Dato comercial reservado |
| `property.commission_rate` | Margen. Nunca es información de catálogo |
| `visit_observation.notes` | Notas internas del agente (RF-CRM-04) |
| `client_profile.*` | Preferencias y presupuesto del cliente (RF-CRM-03) |
| `property.features` (JSONB) | Estructura abierta pendiente de congelar en el spec |
| `property.amenities.accepts_pets` | RF-PROP-01 lo pide, ningún endpoint lo devuelve aún |

Y esta va en sentido contrario: **la API expone cosas que no son columnas.**

| En la API | En la base de datos |
|---|---|
| `Property.is_favorite` | Derivado de `favorite`, filtrado por el token |
| `AppointmentPropertyRef.district` | Derivado de `district` vía `property.ubigeo` |
| `AvailableSlots` | **No se persiste.** Recurso calculado |
| `Appointment.duration_minutes` | Copia del `ScheduleSlot` reservado en el momento de agendar |
| `AuthUser.role` | Columna real, pero el backend también la lleva en el claim `role` del JWT |

La justificación de cada una está en `data-model.md`, en la sección de la tabla
correspondiente.

## Convenciones heredadas de la arquitectura

Recogidas de `docs/02_Arquitectura.md` §17 y §4.4, y aplicadas al modelo:

1. **PostgreSQL es la fuente de verdad.** Redis solo guarda presencia,
   canales WebSocket y eventos pendientes (`presence`, throttling). Ninguna
   tabla de este modelo es reconstruible desde Redis.
2. **El historial no se borra.** `appointment_status_change` y
   `property_status_change` son tablas de solo-append. Un `UPDATE` sobre ellas es
   un bug.
3. **Django es la única puerta a los datos.** Ni React ni Gemini conectan a
   Postgres. El motor de IA recibe candidatos que Django ya filtró.
4. **Recomendación híbrida.** La parte verificable del scoring (precio, distrito,
   tipo, estado) se resuelve con índices de esta base; el LLM solo puntúa lo que
   Django le pasó.