# Índices, Restricciones y Consultas — HouseBroker Peru

Los índices de una base no se eligen por rule of thumb. Se eligen mirando las
consultas que la aplicacion realmente ejecuta, y en este proyecto esas consultas
ya estan escritas: son los filtros del `openapi_spec.yaml`.

Este documento parte de los endpoints, deriva los índices que cada uno necesita, y
separa lo que se crea en la primera migración de lo que se difiere hasta tener
volumen real.

Principio: **todo índice se justifica por una consulta del contrato o por una
garantía de integridad.** Un índice que no responde a ninguno de los dos casos
es un índice que se paga en cada `INSERT` y que nadie consulta.

---

## 1. Consultas que emite la API

Esta es la lista completa. Todo lo demas de este documento se deriva de aquí.

| Endpoint | Consultaunderlying | Columnas |
|---|---|---|
| `GET /properties` | Catálogo con filtros combinados, paginado | `status`, `property_type`, `mode`, `price`, `currency`, `ubigeo`, `search` |
| `GET /properties/{id}` | Punto por PK | `id` |
| `GET /properties/{id}/availability` | Franjas de una fecha concreta | `property_id`, `weekday`, `is_active` |
| `POST /appointments` | Validar solapamiento y crear | `property_id`, `scheduled_at`, `status` |
| `GET /appointments` | Historial con filtros por rol y fecha | `client_id`, `agent_id`, `status`, `scheduled_at` |
| `PATCH /appointments/{id}/status` | Transicion de estado | `id`, `status` |
| `GET /properties/{id}/favorites` | Favoritos de un usuario | `user_id`, `property_id` |
| `GET /auth/me` | Perfil propio | `id` |
| `POST /auth/login` | Buscar por correo normalizado | `lower(email)` |
| `GET /notifications` | Bandeja del usuario | `user_id`, `read_at`, `created_at` |

Los seis parámetros de filtro del catálogo son `MinPrice`, `MaxPrice`,
`PropertyTypeFilter`, `UbigeoFilter`, `Search`, `Page` y `Limit`. El `Limit`
tiene `maximum: 100`, lo que acota el peor caso de cualquier consulta.

---

## 2. Restricciones de integridad

### 2.1 Lo que Django genera solo

`models.py` produce automaticamente:

| Restriccion | De donde sale |
|---|---|
| `PRIMARY KEY` | `id = UUIDField(default=uuid4)` |
| `FOREIGN KEY` con `ON DELETE` | Campo `ForeignKey` |
| `NOT NULL` | Sin `null=True` |
| `UNIQUE` | `unique=True` |
| `CHECK` de rangos | `PositiveIntegerField`, `MinValueValidator` |

Lo que **no** genera y hay que escribir a mano:

| Restriccion | Como se aplica |
|---|---|
| `CHECK` de enums | `RunSQL`, porque Django no tiene tipos enumerados |
| `CHECK` de formato (`email`, `phone`, `ubigeo`) | `RunSQL` |
| `EXCLUDE` de solapamiento | `RunSQL` |
| Índices `Gin` / `GiST` / funcionales | `RunSQL` o `AddIndexConcurrently` |
| Índices parciales | `RunSQL` |
| Índices únicos con `lower()` | `RunSQL` |

El punto importante: **Django no valida en la base de datos lo que valida en
Python.** Un `CHECK` de enums escrito en Python como `choices` no impide un
`INSERT` con un valor invalido hecho por un script, un seed, un `loaddata` o una
migración. Y las migraciones son exactamente el camino por donde un valor mal
escrito entra sin pasar por el servicio.

### 2.2 Enums como `CHECK`

```sql
ALTER TABLE property ADD CONSTRAINT property_status_check
  CHECK (status IN ('DISPONIBLE','RESERVADO','ALQUILADO','VENDIDO','SUSPENDIDO'));

ALTER TABLE property ADD CONSTRAINT property_price_check
  CHECK (price > 0);

ALTER TABLE property ADD CONSTRAINT property_area_check
  CHECK ((area_total IS NULL OR area_total > 0)
     AND (area_built IS NULL OR area_built >= 0)
     AND (area_built IS NULL OR area_total IS NULL OR area_built <= area_total));
```

El último es el único `CHECK` de tres columnas del modelo, y merece justificacion:
`area_built <= area_total` es una invariante real (no se construye más de lo que
cabe en el terreno) que Django no puede expresar con validadores de campo porque
involucra dos columnas. Un `MinValueValidator` en cada una lo permitiria por
separado.

La lista completa de `CHECK` esta en `data-model.md`, columna por columna. Lo que
se aplica aquí es el mecanismo.

### 2.3 El solapamiento de citas

Este es la restriccion más importante del modelo y la única que Django no puede
declarar.

Una propiedad no puede tener dos citas simultaneas. La regla no esta en el
servicio: tiene que estar en la base, porque una cita se crea desde el movil del
cliente y desde el panel del agente al mismo tiempo.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointment ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    property_id WITH =,
    tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval) WITH &&
  ) WHERE (status NOT IN ('CANCELLED','NO_SHOW'));
```

Tres decisiones en ese `EXCLUDE`:

**1. `btree_gist` es obligatorio.** `EXCLUDE` combina `=` (que usa B-tree) y `&&`
(que usa GiST). Sin la extension, Postgres no sabe mezclar los dos metodos de
acceso y la sentencia falla. La extension se crea en el `init` del contenedor de
base de datos o en una migración previa.

**2. `tstzrange` y no dos columnas de inicio y fin.** El rango se calcula. La cita
tiene `scheduled_at` y `duration_minutes`, y el fin se deriva. Guardar
`ends_at` sería redundante y abriría la possibility de que las dos columnas
discrepen.

**3. La prediccion del `WHERE` es una decisián de negocio.** Se excluyen
`CANCELLED` y `NO_SHOW` porque una cita cancelada no ocupa la agenda. Si una cita
`COMPLETED` se completara al mismo tiempo que otra, el `EXCLUDE` lo impide. Y una
cita `RESCHEDULED` **si** ocupa su horario nuevo mientras libera el anterior,
porque solo existe una fila y su `scheduled_at` es el nuevo.

**El coste de esta restriccion.** Un `EXCLUDE` sobre GiST se evalua en cada
`INSERT` y en cada `UPDATE` de las columnas implicadas. Para el volumen del MVP
es irrelevante, y para el volumen real también: las visitas a una propiedad son
decenas, no millones.

### 2.4 Unicidad con normalizacion

```sql
CREATE UNIQUE INDEX user_email_lower_uniq ON "user" (lower(email));
```

Ver `security-and-privacy.md` §3.3 para el por que de un índice funcional en vez
de `CITEXT` o de normalizar en el servicio.

### 2.5 Unicidad compuesta

| Índice | Evita |
|---|---|
| `property_owner (property_id)` | Dos ficha de propietario para el mismo inmueble |
| `property (slug)` | Dos URLs publicly iguales |
| `property (code)` | Dos códigos internos iguales |
| `favorite_property (user_id, property_id)` | El mismo favorito dos veces |
| `property_schedule_slot (property_id, weekday, start_time)` | Dos franjas que empiezan a la vez |
| `appointment (property_id, scheduled_at)` | Dos citas a la misma hora |
| `notification (user_id, created_at)` | Colisiones de orden en la bandeja |
| `message (conversation_id, created_at)` | Colisiones de orden en el chat |

`favorite_property (user_id, property_id)` tiene doble funcion: evita duplicados y
sirve de índice para `GET /properties/{id}/favorites`, que es la lectura de esa
tabla.

---

## 3. Índices del catálogo

`GET /properties` es el endpoint más consultado del sistema. Sus filtros se
combinan, y esa combinacion es la que dicta el diseño.

### 3.1 Índice compuesto principal

```sql
CREATE INDEX property_catalog_idx ON property (
  is_active,
  status,
  property_type,
  created_at DESC
);
```

El orden de las columnas no es arbitrario:

| Posicion | Columna | Motivo |
|---|---|---|
| 1 | `is_active` | Es el filtro que siempre se aplica: una propiedad inactiva nunca se lista. Va primero porque reduce más filas |
| 2 | `status` | El siguiente filtro más frecuente del catálogo |
| 3 | `property_type` | Filtro de la UI, menos frecuente que `status` |
| 4 | `created_at DESC` | Es el orden por defecto del catálogo, y por eso cierra el índice: permite el `ORDER BY` sin sort |

Poner `is_active` primero parece redundante porque su cardinalidad es 2. No lo es:
es el filtro que descarta el 100% de las filas de un listing de propiedades
suspendidas o borradas lógicamente, y en tablas donde la proporción de inactivas
crece con el tiempo, esa primera columna vale más que las otras tres juntas.

`created_at DESC` al final aprovecha que los índices B-tree en Postgres pueden
satisfacer un `ORDER BY` si las columnas del `ORDER BY` aparecen en el índice en
el mismo orden. Sin ella, cada pagina del catálogo paga un sort.

### 3.2 Índice de rango de precio

```sql
CREATE INDEX property_price_idx ON property (price, currency)
  WHERE is_active AND status = 'DISPONIBLE';
```

`MinPrice` y `MaxPrice` son parámetros del contrato, y un filtro de rango no
puede usar un índice compuesto con `status` al frente: el índice se usa cuando
las columnas previas estan fijadas por igualdad, y el precio se busca por rango.

El índice es **parcial**: solo propiedades disponibles y activas. Una propiedad
alquilada o vendida no aparece en un filtro de precio, porque el filtro opera
sobre el catálogo disponible. El índice cubre menos filas y por eso es más chico.

`currency` va en el índice porque el catálogo puede filtrar por moneda, y el
precio sin la moneda no es comparable. Los índices de la tabla tienen una sola
columna de rango, y `price` es esa columna: `currency` esta antes solo porque
funciona como filtro de igualdad.

### 3.3 Índice geográfico

```sql
CREATE INDEX property_ubigeo_idx ON property (ubigeo)
  WHERE is_active;
```

`UbigeoFilter` es un filtro exacto de 6 dágitos, no un rango ni una busqueda
geométrica. Un índice B-tree es exactamente lo que corresponde.

**Por que no hay índice espacial** ni columnas `latitude`/`longitude`:

1. El contrato no expone coordenadas.
2. La búsqueda por distancia ("propiedades cerca de mí") no está en el MVP.
3. Un índice `GIST` sobre `point` es más caro de mantener y de escribir, y sin
   consultas de distancia no paga su costo.

Cuando exista la geolocalización, el cambio es agregar columnas y el índice
correspondiente. No es una reescritura del modelo.

### 3.4 Índice parcial de `is_active = false`

```sql
CREATE INDEX property_inactive_idx ON property (deleted_at)
  WHERE NOT is_active;
```

Django ya genera un índice para `is_active` porque el campo tiene
`db_index=True`. Ese índice mezcla activas e inactivas, y para las consultas del
administrador ("dame las propiedades suspendidas") es medio inutil: recorre el
índice entero y descarta la mitad.

El índice parcial resuelve exactamente ese caso y ocupa el espacio de las
inactivas, que son pocas.

### 3.5 Índice de texto completo

`Search` exige `minLength: 2`, lo que descarta el problema de un índice de
trigramas particional: con 2 caracteres el número de trigramas es estable y el
índice no se infla de forma significativa.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX property_search_trgm_idx ON property
  USING gin (title gin_trgm_ops, description gin_trgm_ops);
```

**Por que trigramas y no `tsvector`.**

`to_tsvector('spanish', ...)` resuelve mejor los nombres propios y las palabras
comunes, pero exige que el texto este escrito en español y que el índice se
reconstruya si cambia el lematizador. Un índice de trigramas funciona sobre
cualquier texto, tolera erratas, y no distingue mayusculas de minusculas.

Para un catálogo de propiedades en espanol, los trigramas son la eleccion
razonable en el MVP. El coste es que no ordena por relevancia: el `ORDER BY` es
por fecha y el `search` es un filtro, no un ranking.

Si en el futuro `search` debe devolver resultados ordenados por relevancia, hace
falta un `tsvector` generado con índice GIN:

```sql
ALTER TABLE property ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(district_name, '')), 'C')
  ) STORED;

CREATE INDEX property_search_vector_idx ON property USING gin (search_vector);
```

Ese `GENERATED ALWAYS AS STORED` es de Postgres 12 en adelante, y no requiere
disparador. Se recomputa solo en cada `INSERT` y `UPDATE`.

`unaccent` no se usa en ningán índice. `unaccent` no es `IMMUTABLE`, y Postgres
no puede usar una funcion no inmutable en un índice generado ni en una expresion
de índice. Es una limitación conocida y la razón por la que las tildes en
busquedas funcionan con el operador de trigramas pero no en el `tsvector`
generado.

### 3.6 `jsonb` y `features`

```sql
CREATE INDEX property_features_idx ON property USING gin (features jsonb_path_ops);
```

`jsonb_path_ops` es la variante para el operador `@>` y es más pequena y más
rapida que la de la ruta por defecto. Como el uso previsto es
`features @> '{"amenities": ["piscina"]}'`, es exactamente la variante correcta.

**Lo que este índice no puede hacer:** los agentes de IA filtran por
`features.nearby` y por tags. Un `@>` sobre un array de texto funciona, pero no
ordena por relevancia y no entiende que "piscina" y "piscina techada" se parezcan.
Esa parte es del LLM, según `docs/02_Arquitectura.md` §6.4: PostgreSQL filtra de
forma verificable, el modelo interpreta.

El índice se crea **después** de la primera migración, porque hasta que exista
una consulta que lo use es escritura pura.

---

## 4. Índices de citas

### 4.1 Historial por cliente

```sql
CREATE INDEX appointment_client_idx ON appointment (client_id, scheduled_at DESC);
```

Es la consulta de `GET /appointments` con `AppointmentRoleFilter=CLIENTE`, y el
`ORDER BY` es por fecha descendente. El índice la resuelve entera.

### 4.2 Agenda del agente

```sql
CREATE INDEX appointment_agent_idx ON appointment (agent_id, scheduled_at);
```

La agenda del agente necesita orden **ascendente**: "mis visitas de hoy, de 9 a
mille". Por eso el `DESC` de §4.1 no se replica.

Son dos índices para dos consultas distintas, no un índice duplicado por error.

### 4.3 Filtros temporales

```sql
CREATE INDEX appointment_status_date_idx ON appointment (status, scheduled_at);
```

Cubre `AppointmentStatusFilter` combinado con `AppointmentDateFrom` y
`AppointmentDateTo`.

Cuando el rango de fechas acota mucho la consulta, el índice por `status` deja de
ser selectivo y PostgreSQL prefiere un índice sobre `scheduled_at` a secas. Ese
índice **no se crea ahora**: depende de la distribucion real de fechas, y el
criterio para crearlo es que `EXPLAIN ANALYZE` lo sugiera.

### 4.4 `WHERE scheduled_at BETWEEN ... AND status IN (...)`

Este es el patron de la agenda del día, y es un índice parcial:

```sql
CREATE INDEX appointment_today_idx ON appointment (agent_id, scheduled_at)
  WHERE status IN ('PENDING','CONFIRMED','RESCHEDULED');
```

Las citas `CANCELLED` y `NO_SHOW` no se muestran en la agenda, asi que no
necesitan estar en el índice. Igual que §3.2: índice más chico, menos filas que
recorrer.

### 4.5 Las.historiales de estado

```sql
CREATE INDEX appointment_status_change_appointment_idx
  ON appointment_status_change (appointment_id, created_at DESC);

CREATE INDEX property_status_change_property_idx
  ON property_status_change (property_id, created_at DESC);
```

El orden descendente es porque la vista de historial muestra el cambio más
reciente arriba. Es el mismo criterio que el catálogo: el `ORDER BY` por defecto
de una pantalla define la última columna del índice.

Ambas tablas son **append-only**. No tienen `updated_at` porque nada las actualiza,
y por eso el índice incluye solo `created_at`: un índice con una columna que
siempre es nula es espacio desperdiciado.

---

## 5. Índices de agenda y disponibilidad

```sql
CREATE INDEX property_schedule_slot_property_idx
  ON property_schedule_slot (property_id, weekday, is_active);

CREATE INDEX property_schedule_slot_active_window_idx
  ON property_schedule_slot (property_id, start_time)
  WHERE is_active;
```

El primero sirve para `GET /properties/{id}/availability`, que lee las franjas de
un día de la semana: filtra por propiedad y día, y entre las inactivas.

El segundo es parcial y cubre el calculo de disponibilidad, que solo considera
franjas activas.

### 5.1 La disponibilidad es una operacián de lectura costosa

Calcular los huecos libres de un día implica:

1. Leer las franjas activas de ese weekday.
2. Leer las citas de ese día en la propiedad.
3. Restar los intervalos ocupados de las franjas.

Es un calculo de rangos, y el paso 3 no es una consulta SQL directa. La opcion
correcta es materializar los intervalos ocupados y resolver el resto en Python,
que es donde vive la lógica de `AvailableSlots` del contrato.

Lo que **no** se debe hacer es traer todas las citas de la propiedad y filtrar en
Python por fecha. Es el error clásico de este endpoint, y con 200 citas de
histórico por propiedad produce una respuesta de cientos de milisegundos por
petición.

El índice parcial de §4.4, aplicado a citas, es lo que hace posible el paso 2 con
un rango acotado.

---

## 6. Índices de CRM y mensajería

```sql
CREATE INDEX visit_observation_appointment_idx
  ON visit_observation (appointment_id, created_at DESC);

CREATE INDEX visit_observation_agent_idx ON visit_observation (agent_id, created_at DESC);

CREATE INDEX conversation_client_idx ON conversation (client_id, updated_at DESC);

CREATE INDEX conversation_agent_idx ON conversation (agent_id, updated_at DESC)
  WHERE status = 'HUMAN_ACTIVE';

CREATE INDEX message_conversation_idx ON message (conversation_id, created_at);
```

`message (conversation_id, created_at)` es el índice más importante de los tres:
cada vez que se abre un chat se leen los mensajes ordenados por fecha, y el
`LIMIT` de paginacion corta la lectura en cuanto hay mensajes suficientes.

El índice parcial de `conversation_agent_idx` cubre la cola de agentes: solo las
conversaciones con un humano asignado son las que un agente ve en su panel.

```sql
CREATE INDEX handoff_request_pending_idx ON handoff_request (requested_at)
  WHERE status = 'PENDING';

CREATE INDEX notification_unread_idx ON notification (user_id, created_at DESC)
  WHERE read_at IS NULL;
```

Los dos son parciales por la misma razón: la consulta del sistema es
permanentemente "los pendientes" y "los no leídos". Un índice sobre el estado
completo serviria para una consulta que nadie ejecuta.

---

## 7. Lo que no se indexa, y por que

| Columna tempting | Por que no |
|---|---|
| `user.full_name` | No se filtra por nombre de usuario en ningán endpoint |
| `user.phone` | Se busca porPk o por correo |
| `property.description` | Solo entra en `search`, que ya usa trigramas |
| `property.updated_at` | Ningun endpoint ordena por fecha de actualizacion |
| `appointment.notes` | Texto libre, nunca se filtra |
| `property_owner.owner_dni` | Se busca porPk de la propiedad |
| `ai_conversation.log` | No se consulta; se borra por fecha |
| `ai_session.embedding` | Solo lectura por `conversation_id` |
| Todas las columnas `*_at` de las tablas sin consulta por fecha | Un índice por columna es un índice sin consulta |

La regla es concreta: **una columna no se indexa porque es una fecha o porque es
texto**. Se indexa porque alguna consulta del contrato la filtra, la ordena o la
une.

`deleted_at` tiene su índice parcial (§3.4) precisamente porque el administrador
si lo consulta, aunque el catálogo no.

---

## 8. Lo que vive fuera de la base

La arquitectura usa Redis para lo que no debe ocupar una tabla. Distinguir ambas
cosas evita modelar en Postgres lo que es un contador con caducidad.

| Recurso | Dónde vive | Razón |
|---|---|---|
| Rate limit de login y reset | Redis | Contador con ventana de tiempo |
| Cache de disponibilidad | Redis | Cálculo caro, invalidable por evento |
| Cola de notificaciones | Redis + worker | Trabajo asíncrono |
| Sesiones activas de IA | Redis | Estado efímero de conversación |
| Tokens revocados `jti` | Redis **o** tabla | Ver `security-and-privacy.md` §5.1 |
| Búsqueda de texto completo | PostgreSQL | `pg_trgm` alcanza, no hace falta Elasticsearch |
| Filtros del catálogo | PostgreSQL | El proyecto lo define así en §6.4 |

**La fila de `jti` es una decisión pendiente.** Redis resuelve el caso de un
sistema de una sola instancia, que es el MVP. Si el backend escala a varias
instancias, la lista de revocación necesita estar en la base o en un Redis
compartido, porque cada proceso tiene su Redis local.

**El cache de disponibilidad tiene una regla de invalidación:**

| Evento | Acción |
|---|---|
| Se crea una cita | Invalidar el día afectado |
| Se cancela una cita | Invalidar el día afectado |
| Se reprograma una cita | Invalidar los dos días |
| Se edita una franja de agenda | Invalidar los 30 días siguientes |
| Se cambia el estado de la propiedad | Invalidar todo |

La cache no es una optimización opcional: sin invalidación, el cliente ve un
horario que ya no existe y agenda sobre una franja ocupada. La segunda fila de la
tabla es la que peor falla, porque el error se descubre cuando dos clientes
reservan el mismo horario.

---

## 9. Consultas que el modelo habilita y la API no expone

Estas consultas existen en el modelo para uso interno y administrativo. No tienen
endpoint, y por eso tampoco tienen índice todavía.

| Consulta | Uso | Índice que necesitaría |
|---|---|---|
| Propiedades sin propietario asignado | Alertas de onboarding | `property (id) WHERE owner_id IS NULL` |
| Citas de un propietario | Venta del inmueble | `property_owner (id)`, ya cubierto por FK |
| Agente con mayor carga de citas | Balanceo de carga | `appointment (agent_id, status)` |
| Propiedades sin visitas en 90 días | Antigüedad del inventario | `property (created_at) WHERE is_active` |
| Usuarios que nunca han iniciado sesión | Campañas de reactivación | `user (last_login) WHERE is_active` |

Ninguna tiene índice. Se crean cuando exista la pantalla o el reporte que las
pide, y no antes: un índice para un reporte que se ejecuta una vez al trimestre
puede ser un `CREATE INDEX` a mano en ese momento.

---

## 10. Anti-patrones

### 10.1 `SELECT *` sobre columnas grandes

`property` tiene `description` en `text`, `features` en `jsonb` y
`internal_notes` en `text`. El listado del catálogo no necesita ninguno de los
tres, y `SELECT *` los trae.

Django lo evita con `only()` y `defer()`, o con un `.values()`:

```python
Property.objects.filter(
    is_active=True, status=Property.Status.DISPONIBLE
).only("id", "slug", "title", "price", "currency", "bedrooms",
       "bathrooms", "area_built", "district_name")
```

Es la diferencia entre servir 40 KB por pagina de 12 y 4 KB. Con paginacion de
100, el factor es diez.

### 10.2 N+1 en el detalle de una cita

`Appointment` incluye `AppointmentPropertyRef` y `AppointmentPersonRef`, que son
datos del inmueble y de los dos participantes. Sin `select_related`, Django hace
una consulta por cada referencia y el detalle de una cita pasa de 3 consultas a
5.

```python
Appointment.objects.select_related(
    "property", "client", "agent"
)
```

### 10.3 Contar para paginar

`PaginatedAppointments` y `PaginatedFavorites` traen `count`, `next`, `previous`.
`count` es una consulta aparte, y sobre tablas grandes es la más cara de las tres
porque no puede usar índice.

Es un compromiso del contrato, no un error de implementación. Con los volumenes
del MVP no se nota, y cambiar el contrato para ahorrar una consulta es una
decisión peor.

### 10.4 Filtrar en Python lo que se puede filtrar en SQL

El caso concreto: los slots de disponibilidad. Si el backend trae todas las citas
de la propiedad y calcula huecos en Python, el costo crece con el histórico. Si
trae solo el rango de fechas solicitado, es constante.

La segunda forma es un filtro de fecha con índice. La diferencia es la que separa
una agenda que responde en 50 ms de una que responde en 2 s.

---

## 11. Verificacion

Antes de declarar cualquier consulta como optimizada:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, slug, title, price, bedrooms
FROM property
WHERE is_active AND status = 'DISPONIBLE'
  AND property_type = 'DEPARTAMENTO'
  AND price BETWEEN 150000 AND 400000
  AND ubigeo = '150133'
ORDER BY created_at DESC
LIMIT 12;
```

Que mirar:

| Indicador | Lo que revela |
|---|---|
| `Seq Scan` en una tabla grande | Falta un índice, o el filtro no lo aprovecha |
| `Sort` con `external merge Disk` | El `ORDER BY` no lo resuelve el índice |
| `Rows Removed by Filter` alto | El índice es correcto pero poco selectivo |
| `Heap Fetches: 0` | El índice parcial cubre la consulta |
| Tiempo de la primera fila alta | Consulta pesada; el `LIMIT` no salva si el plan es malo |

**Criterio de decisián:** un índice nuevo se crea cuando `EXPLAIN ANALYZE` sobre
datos realistas muestra un plan que lo necesitaría. No antes, y no porque una tabla
"debería" tener índice.

Con `ANALYZE` corrido sobre datos de prueba pequenos, el plan siempre va a decir
`Seq Scan`, porque la tabla entera cabe en memoria. Los índices se evaluan sobre
un volumen que justifique el costo, o no se evaluan.