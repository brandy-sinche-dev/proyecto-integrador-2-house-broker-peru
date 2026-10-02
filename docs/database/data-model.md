# Modelo de Datos — HouseBroker Perú

Definición columna por columna de las 24 tablas. Este es el documento
**autoritativo**: si un diagrama de `architecture.md` o un esquema de
`docs/api/openapi_spec.yaml` discrepan con lo de acá, gana este archivo.

**Leyenda de la columna "Clasif."**

| Código | Significado | Puede salir por API |
|---|---|---|
| `PUB` | Pública | Sí, sin transformación |
| `PUB*` | Pública derivada | Sí, pero se **calcula** desde otra tabla |
| `INT` | Interna | Solo con rol elevado (agente/admin) |
| `RES` | Restringida | **Nunca.** Ni a admins vía endpoint público |
| `SEC` | Secreto | Nunca. Solo el motor de autenticación |

**Leyenda de "Origen"**

| Código | Significado |
|---|---|
| `API` | La columna existe porque el spec la nombra |
| `REQ` | La exige un RF de `docs/01_requerimientos.md` sin endpoint aún |
| `ARQ` | La exige `docs/02_Arquitectura.md` |
| `SOP` | Necesaria para operación, seguridad o trazabilidad |

---

## 1. Identidad y acceso

### 1.1 `user`

Reemplaza `django.contrib.auth.models.User`. Requiere `AUTH_USER_MODEL =
'users.User'` **antes** de la primera migración.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK. `AuthUser.id` |
| `email` | `varchar(254)` | No | — | `PUB` | `API` | UK. Normalizado a minúsculas. Índice `UNIQUE` con `lower(email)` |
| `password` | `varchar(128)` | No | — | `SEC` | `SOP` | Hash Bcrypt. **Nunca** en un serializer |
| `full_name` | `varchar(120)` | No | — | `PUB` | `API` | `AuthUser.full_name` |
| `phone` | `varchar(20)` | Sí | `NULL` | `PUB` | `API` | `RegisterInput.phone`, `maxLength: 20` |
| `role` | `varchar(20)` | No | `CLIENTE` | `PUB` | `API` | `UserRole`. Ver `catalogs.md` §1 |
| `is_active` | `boolean` | No | `true` | `PUB` | `API` | `false` → login `403 account_disabled` |
| `is_staff` | `boolean` | No | `false` | `INT` | `SOP` | Acceso al admin de Django. **Distinto de `role`** |
| `is_superuser` | `boolean` | No | `false` | `INT` | `SOP` | Heredado de `PermissionsMixin` |
| `last_login_at` | `timestamptz` | Sí | `NULL` | `INT` | `REQ` | RF-SEC-01 "último acceso". No está en `AuthUser` |
| `last_login_ip` | `inet` | Sí | `NULL` | `INT` | `SOP` | Detección de anomalías. `RES` si se expone a admin |
| `failed_login_count` | `integer` | No | `0` | `INT` | `SOP` | Alimenta el bloqueo. No es la fuente (esa es `login_attempt`) |
| `password_changed_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | Distingue "nunca cambió" de "cambió hace un día" |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `API` | `AuthUser.created_at` |
| `updated_at` | `timestamptz` | No | `auto_now` | `INT` | `SOP` | |
| `deleted_at` | `timestamptz` | Sí | `NULL` | `RES` | `ARQ` | Eliminación lógica. No está en `AuthUser` |

**Restricciones**

- `CHECK (role IN ('CLIENTE','AGENTE','ADMINISTRADOR'))`
- `CHECK (email = lower(email))` — la normalización ocurre en el setter del modelo
  y en el serializer, pero el `CHECK` la hace definitiva
- `CHECK ((role = 'ADMINISTRADOR') = is_superuser)` — no existe un superusuario que
  no sea administrador del negocio, ni un administrador que no pueda administrar

**Fuera del modelo por diseño**

`AuthUser` expone `id, email, full_name, phone, role, is_active, created_at`. Los
demás campos de esta tabla **no tienen contraparte en el spec**. `is_staff` está
excluido a propósito: el spec lo dice explícitamente ("no incluye `password` ni
`is_staff`"), porque el frontend decide interfaz por `role`, no por permisos de
Django.

El `CHECK` de `role` e `is_superuser` merece una defensa: sin él, alguien que cree
un usuario con `role='ADMINISTRADOR'` e `is_superuser=False` entra al panel de
administración de la API (que lee `role`) pero no al admin de Django (que lee
`is_superuser`), y la investigación de un incidente empieza por un desajuste que
no debería existir.

### 1.2 `client_profile`

Extensión 1:1 de `user` para el rol `CLIENTE`. Alimenta `HU-CRM-03` (ficha del
cliente) y `HU-AI-02` (preferencias persistidas).

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `ARQ` | PK |
| `user_id` | `uuid` | No | — | `INT` | `ARQ` | FK `user`, UK. `ON DELETE CASCADE` |
| `document_type` | `varchar(20)` | Sí | `NULL` | `RES` | `REQ` | `DNI`, `CE`, `PASSPORT`. `NULL` = no declarado |
| `document_number` | `varchar(20)` | Sí | `NULL` | `RES` | `REQ` | PII de identidad. UK parcial con `document_type` |
| `budget_min` | `numeric(12,2)` | Sí | `NULL` | `INT` | `REQ` | Piso del presupuesto declarado |
| `budget_max` | `numeric(12,2)` | Sí | `NULL` | `INT` | `REQ` | Techo. Alimenta el filtro `minPrice`/`maxPrice` |
| `budget_currency` | `varchar(3)` | No | `PEN` | `INT` | `REQ` | `Moneda`. Coherente con `property.currency` |
| `preferred_district` | `varchar(100)` | Sí | `NULL` | `INT` | `REQ` | Texto libre. **No** `ubigeo`: el chat puede mencionar un lugar sin saber el código |
| `preferences` | `jsonb` | No | `{}` | `INT` | `REQ` | Preferencia estructurada que devuelve `AIService.extract_preferences` |
| `interest_level` | `integer` | Sí | `NULL` | `INT` | `REQ` | 1–5. Consolidado de `visit_observation` |
| `notes` | `text` | Sí | `NULL` | `RES` | `REQ` | Notas del agente sobre el cliente. Sin endpoint aún |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `INT` | `SOP` | |

**Restricciones**

- `CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)`
- `CHECK (budget_min IS NULL OR budget_min > 0)`
- `CHECK (interest_level BETWEEN 1 AND 5)`
- UK parcial: `UNIQUE (document_type, document_number) WHERE document_number IS NOT NULL`

**Por qué `preferred_district` es texto y no FK a `district`**

El asistente virtual extrae preferencias de lenguaje natural. Cuando el cliente
dice "por Miraflores", la IA produce `"Miraflores"`, no `150131`. Meter eso en una
FK a `district` exigiría un paso de resolución con fuzzy matching en la ruta de
escritura del chat, y un fallo ahí rompería la conversación.

La columna es texto porque **guarda lo que el usuario dijo**. El matching a
`district.ubigeo` ocurre en el servicio de recomendaciones, que sí puede
normalizar, y el resultado se aplica a `property.ubigeo` en el filtro SQL. Es el
mismo criterio del pipeline híbrido de `docs/02_Arquitectura.md` §6.4: PostgreSQL
filtra sobre datos estructurados y verificables.

`preferences` es `jsonb` y no columnas, a propósito:

```json
{
  "mode": "ALQUILER",
  "property_type": "DEPARTAMENTO",
  "districts": ["Miraflores", "San Isidro"],
  "budget": { "min": 1800, "max": 2500, "currency": "PEN" },
  "bedrooms": 2,
  "bathrooms": 2,
  "parking": true,
  "accepts_pets": true,
  "required_features": ["ascensor", "cerca a transporte"],
  "extracted_at": "2026-10-05T09:12:44Z",
  "source_message_id": "8f2c1a60-..."
}
```

Si estas preferencias fueran columnas, agregar "piscina" al cuestionario del bot
exigiría migración. Con `jsonb`, es un dato nuevo. El compromiso es que
`jsonb` no valida: el contrato de forma vive en el Pydantic/serializer de
`AIService`, no en la base.

### 1.3 `agent_profile`

Extensión 1:1 de `user` para el rol `AGENTE`.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `ARQ` | PK |
| `user_id` | `uuid` | No | — | `INT` | `ARQ` | FK `user`, UK. `ON DELETE CASCADE` |
| `license_number` | `varchar(50)` | Sí | `NULL` | `RES` | `REQ` | N° de habilitación profesional. UK |
| `office` | `varchar(100)` | Sí | `NULL` | `INT` | `REQ` | Sede asignada |
| `hired_at` | `date` | Sí | `NULL` | `INT` | `REQ` | Antigüedad para métricas de `HU-CRM-05` |
| `commission_rate` | `numeric(5,4)` | No | `0.0000` | `RES` | `REQ` | Margen. `0.0250` = 2.5% |
| `is_active` | `boolean` | No | `true` | `INT` | `REQ` | Distinto de `user.is_active`: aquí es "opera comercialmente" |
| `notes` | `text` | Sí | `NULL` | `RES` | `REQ` | Evaluación interna del agente |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `INT` | `SOP` | |

**Restricciones**

- `CHECK (commission_rate >= 0 AND commission_rate <= 1)`
- UK parcial: `UNIQUE (license_number) WHERE license_number IS NOT NULL`

**Doble `is_active`**

`user.is_active` responde "¿puede autenticarse?" y `agent_profile.is_active`
responde "¿acepta citas?". Un agente suspendido por decisión administrativa
(`user.is_active = false`) no entra al sistema; uno dado de baja comercialmente
(`agent_profile.is_active = false`) sigue iniciando sesión pero aparece sin agenda
disponible para el cliente. `HU-CRM-05` mide efectividad de agentes sobre la
segunda bandera.

### 1.4 `password_reset_token`

HU-SEC-02. Implementa lo que `PasswordResetConfirm` del spec exige.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `SEC` | `API` | PK |
| `user_id` | `uuid` | No | — | `SEC` | `API` | FK `user`, `CASCADE` |
| `token_hash` | `char(64)` | No | — | `SEC` | `SOP` | SHA-256 en hex. **No** el token en claro |
| `expires_at` | `timestamptz` | No | — | `SEC` | `API` | `PASSWORD_RESET_TOKEN_LIFETIME` |
| `used_at` | `timestamptz` | Sí | `NULL` | `SEC` | `API` | No `NULL` = el enlace sigue vigente |
| `created_at` | `timestamptz` | No | `timezone.now` | `SEC` | `SOP` | |

**Restricciones**

- UK: `token_hash`
- `CHECK (expires_at > created_at)`

**Por qué se guarda el hash y no el token**

El token viaja por correo. Si el token en claro estuviera en la tabla, cualquiera
con acceso de lectura a `password_reset_token` —incluido un `SELECT` desde un
endpoint de admin, un dump para respaldo, o un log de consultas— podría resetear
la contraseña de cualquier cuenta. Con SHA-256, el atacante que lee la base
obtiene hashes sin reversa y sin ruta al correo.

El argumento también aplica a `refresh_token.token_hash`, por el mismo motivo.

`used_at` en vez de borrar la fila: permite detectar reintentos y responde al
`401 invalid_reset_token` del spec ("ya se usó"). Si se borrara al consumirse, un
segundo intento con el mismo enlace sería indistinguible de un enlace inválido, y
no se podría auditar un abuso.

### 1.5 `login_attempt`

HU-SEC-01 y RNF-04. Alimenta el límite de intentos fallidos.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `bigint` | No | `serial` | `INT` | `SOP` | PK. Autoincremental: es una tabla de flujo alto |
| `user_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `user`, `SET NULL`. `NULL` si el correo no existe |
| `email_entered` | `varchar(254)` | No | — | `RES` | `SOP` | Lo que el usuario escribió, sin normalizar |
| `ip_address` | `inet` | Sí | `NULL` | `RES` | `SOP` | Origen del intento |
| `was_successful` | `boolean` | No | — | `INT` | `SOP` | |
| `failure_reason` | `varchar(50)` | Sí | `NULL` | `INT` | `SOP` | `INVALID_PASSWORD`, `ACCOUNT_DISABLED`, `UNKNOWN_EMAIL` |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |

**Por qué `user_id` puede ser `NULL`**

Es lo que permite detectar credential stuffing: 200 intentos fallidos con correos
que no existen en la base. Si `user_id` fuera obligatorio, esos intentos no
tendrían dónde registrarse y el bloqueo por cuenta no los frenaría. `SET NULL`
conserva el registro forense aunque la cuenta se elimine lógicamente.

**`failure_reason` es interno y no debe filtrarse por API**

Distinguir `UNKNOWN_EMAIL` de `INVALID_PASSWORD` en la respuesta de login es
enumeración de cuentas, exactamente lo que `PasswordResetRequested` del spec evita
con su `email_sent: true` constante. La columna existe para que el operador vea
el patrón; el cliente recibe siempre un mensaje único.

### 1.6 `refresh_token`

Redención de `POST /api/v1/auth/refresh`. Tabla justificada en
`architecture.md` §5.3.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `SEC` | `SOP` | PK |
| `user_id` | `uuid` | No | — | `SEC` | `API` | FK `user`, `CASCADE` |
| `jti` | `uuid` | No | `uuid4` | `SEC` | `API` | UK. Claim `jti` del JWT |
| `token_hash` | `char(64)` | No | — | `SEC` | `SOP` | SHA-256 |
| `expires_at` | `timestamptz` | No | — | `SEC` | `API` | |
| `revoked_at` | `timestamptz` | Sí | `NULL` | `SEC` | `SOP` | `NULL` = vigente |
| `replaced_by_id` | `uuid` | Sí | `NULL` | `SEC` | `API` | FK self. Detecta reutilización |
| `ip_address` | `inet` | Sí | `NULL` | `RES` | `SOP` | |
| `user_agent` | `varchar(255)` | Sí | `NULL` | `RES` | `SOP` | |
| `created_at` | `timestamptz` | No | `timezone.now` | `SEC` | `SOP` | |

**Restricciones**

- UK: `jti`
- UK parcial: `UNIQUE (replaced_by_id) WHERE replaced_by_id IS NOT NULL`
- `CHECK (expires_at > created_at)`

**Reutilización y rotación**

El claim `jti` que documenta `TokenPair.access` permite revocar un token
individual, pero solo si hay dónde registrar que ese token ya se rotó. La
consulta de detección es:

```sql
SELECT 1 FROM refresh_token
WHERE jti = %(presented_jti)s
  AND replaced_by_id IS NOT NULL;
```

Si aparece, el token presentado **no es un robo oportunista, es un robo confirmado**:
alguien tiene una copia de un token que el titular ya cambió. La respuesta es
`401 refresh_token_reused` y se revoca la cadena completa de esa cuenta, no solo
el token presentado. `POST /api/v1/auth/logout` revoca un único `jti`.

---

## 2. Propiedades

### 2.1 `property`

La tabla central. `HU-PROP-01` a `HU-PROP-05`.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK. `Property.id` |
| `code` | `varchar(20)` | No | — | `INT` | `SOP` | UK. `PROP-00125`. Identificador comercial |
| `title` | `varchar(200)` | No | — | `PUB` | `API` | `Property.title`, `minLength: 1` |
| `description` | `text` | Sí | `NULL` | `PUB` | `API` | `PropertyInput` **no** lo expone aún. Reservado |
| `price` | `numeric(12,2)` | No | — | `PUB` | `API` | `CHECK > 0`. Filtra `minPrice`/`maxPrice` |
| `currency` | `varchar(3)` | No | `PEN` | `PUB` | `API` | `Moneda`. `PEN`/`USD` |
| `mode` | `varchar(12)` | No | — | `PUB` | `API` | `TransactionMode`. `VENTA`/`ALQUILER` |
| `status` | `varchar(15)` | No | `DISPONIBLE` | `INT` | `API` | `PropertyStatus`. Ver §2.6 |
| `agent_id` | `uuid` | Sí | `NULL` | `INT` | `ARQ` | FK `user`. Responsable del inmueble |
| `district_id` | `uuid` | No | — | `PUB*` | `API` | FK `district`. Alimenta el filtro `ubigeo` |
| `address` | `varchar(300)` | No | — | `PUB` | `API` | Se busca con `search` |
| `reference` | `varchar(100)` | Sí | `NULL` | `PUB` | `API` | Código interno del anuncio |
| `area_total` | `numeric(10,2)` | Sí | `NULL` | `PUB` | `API` | m². `minimum: 0` |
| `area_built` | `numeric(10,2)` | Sí | `NULL` | `PUB` | `API` | m² construidos |
| `bedrooms` | `smallint` | Sí | `NULL` | `PUB` | `API` | `dormitorios`. `CHECK >= 0` |
| `bathrooms` | `smallint` | Sí | `NULL` | `PUB` | `API` | `banos`. `CHECK >= 0` |
| `parking_spaces` | `smallint` | No | `0` | `PUB` | `API` | `estacionamientos`. **No nullable**: el 0 es un dato válido |
| `maintenance_fee` | `numeric(10,2)` | Sí | `NULL` | `PUB` | `API` | `mantenimiento`. `NULL` si no aplica |
| `accepts_pets` | `boolean` | No | `false` | `PUB` | `REQ` | RF-PROP-01. **No está en el spec** |
| `accepts_children` | `boolean` | No | `false` | `PUB` | `REQ` | RF-PROP-01. **No está en el spec** |
| `is_negotiable` | `boolean` | Sí | `NULL` | `PUB` | `API` | `negociable`. Triestado: `NULL` = no se declara |
| `is_featured` | `boolean` | No | `false` | `PUB` | `API` | `destacado`. Badge del catálogo |
| `exterior_url` | `varchar(500)` | Sí | `NULL` | `PUB` | `API` | `link_galeria`. Enlace externo |
| `floorplan_url` | `varchar(500)` | Sí | `NULL` | `PUB` | `API` | `link_planos` |
| `features` | `jsonb` | No | `{}` | `PUB` | `REQ` | Características clave. Estructura abierta |
| `is_active` | `boolean` | No | `true` | `PUB` | `API` | `false` → fuera del catálogo |
| `commission_rate` | `numeric(5,4)` | Sí | `NULL` | `RES` | `REQ` | Margen negociado con el propietario |
| `owner_notes` | `text` | Sí | `NULL` | `RES` | `REQ` | Instrucciones internas de manejo |
| `created_by_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `user`. Autoría del registro |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `API` | `Property.created_at` |
| `updated_at` | `timestamptz` | No | `auto_now` | `INT` | `SOP` | |
| `deleted_at` | `timestamptz` | Sí | `NULL` | `RES` | `ARQ` | `DELETE` es lógico |

**Correspondencia exacta con `Property` del spec**

| Columna BD | Campo JSON | Nota |
|---|---|---|
| `id` | `id` | Directo |
| `title` | `title` | Directo |
| `price` | `price` | Directo |
| `currency` | `moneda` | **Renombrado** |
| `mode` | `mode` | Directo |
| `address` | `address` | Directo |
| `property_type` | `property_type` | Ver §2.2 |
| `is_active` | `is_active` | Directo |
| `created_at` | `created_at` | Directo |
| `area_total` | `area_total` | Directo |
| `area_built` | `area_construida` | **Renombrado** |
| `bedrooms` | `dormitorios` | **Renombrado** |
| `bathrooms` | `banos` | **Renombrado** |
| `parking_spaces` | `estacionamientos` | **Renombrado** |
| `exterior_url` | `link_galeria` | **Renombrado** |
| `floorplan_url` | `link_planos` | **Renombrado** |
| `is_negotiable` | `negociable` | **Renombrado** |
| `is_featured` | `destacado` | **Renombrado** |
| `maintenance_fee` | `mantenimiento` | **Renombrado** |

**Por qué nueve columnas cambian de nombre**

Las nueve renombradas están en español en el contrato y en `types.ts`, mientras que
el resto del modelo —y el resto del spec— es inglés. Es una inconsistencia heredada
del Sprint 1.

Se conservan los nombres JSON sin cambio, porque cambiarlos rompería
`frontend/src/services/types.ts`, que el `README` de la API obliga a mantener
sincronizado con el spec. La traducción vive **solo en el serializer**, en un
`to_representation` explícito y escrito a mano. Un `fields = '__all__'` con
`source` implícito escondería el mapa; escribirlo a mano hace que el renombre sea
visible en el código y no en una convención.

`status`, `code`, `district_id`, `accepts_pets`, `features`, `commission_rate` y
`owner_notes` **no tienen** campo en `Property`. Los primeros son internos; se
detallan en §2.6 y §2.2.

**Restricciones**

```sql
CHECK (price > 0)
CHECK (maintenance_fee IS NULL OR maintenance_fee >= 0)
CHECK (area_total IS NULL OR area_total >= 0)
CHECK (area_built IS NULL OR area_built >= 0)
CHECK (bedrooms IS NULL OR bedrooms >= 0)
CHECK (bathrooms IS NULL OR bathrooms >= 0)
CHECK (parking_spaces >= 0)
CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1))
CHECK (currency IN ('PEN', 'USD'))
CHECK (mode IN ('VENTA', 'ALQUILER'))
CHECK (property_type IN ('DEPARTAMENTO', 'CASA', 'TERRENO', 'OFICINA'))
CHECK (status IN ('DISPONIBLE', 'RESERVADO', 'ALQUILADO', 'VENDIDO', 'SUSPENDIDO'))
CHECK (created_at <= updated_at)
```

**Una restricción que va más allá de `CHECK`**

`status = 'SUSPENDIDO'` obliga a `is_active = false`. El spec lo afirma en
`PropertyStatusResult`:

> Es `false` exactamente cuando `status` es `SUSPENDIDO`.

Eso es una bicondicional y va como `CHECK` de tabla:

```sql
CHECK ((status = 'SUSPENDIDO') = (NOT is_active) OR status <> 'SUSPENDIDO')
```

Simplificado a la forma equivalente, más legible:

```sql
CHECK (status <> 'SUSPENDIDO' OR is_active = false)
```

que solo cubre una dirección. La forma completa, en dos `CHECK` distintos, es la
que se migra:

```sql
CHECK (NOT (status = 'SUSPENDIDO' AND is_active = true))
CHECK (NOT (status <> 'SUSPENDIDO' AND is_active = false AND deleted_at IS NULL))
```

El segundo se pone en un trigger en vez de `CHECK`, porque `DELETE` lógico deja
`is_active = false` con `status` intacto: los cuatro primeros estados mantienen el
inmueble visible, pero `is_active` también baja por eliminación. Sin la excepción
`deleted_at IS NULL`, la primera visita de `DELETE` a una propiedad ya suspendida
fallaría.

**Índices**

`property` es la tabla más consultada del sistema. Sus índices están en
`indexes-and-queries.md` §2, no acá.

### 2.2 `property_type` y por qué no es tabla

El tipo de inmueble se almacena como `varchar` con `CHECK`, no como tabla de
catálogo, y no hay `property_type` en el inventario de `architecture.md` §3. Es
una decisión que conviene defender porque parece inconsistente con `district`,
que sí es tabla.

La diferencia es el ritmo de cambio:

| | `district` | `property_type` |
|---|---|---|
| Quién lo cambia | INEI, por ley | HouseBroker, por producto |
| Frecuencia | Cada censo | Prácticamente nunca |
| Referencia cruzada | Identifica la propiedad | No identifica nada |
| Es referenciado por | FK de `property` | Solo como valor |

Un `district` es una **entidad con identidad**: otras tablas lo referencian. Un
tipo de inmueble es una **etiqueta de clasificación**: nadie apunta a "el tipo
DEPARTAMENTO".

Si `property_type` fuera tabla, haría falta una clave primaria, y además un
índice y una unión para leer un valor que el `CHECK` ya garantiza. El coste no
compensa. Los valores están centralizados en `catalogs.md` §2, que es el lugar
único donde hay que editarlos.

### 2.3 `property_owner`

HU-PROP-01. Dato del propietario del inmueble. **No figura en el ERS global** de
`architecture.md` porque todas sus columnas son PII de terceros.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `RES` | `REQ` | PK |
| `property_id` | `uuid` | No | — | `RES` | `REQ` | FK `property`, `CASCADE` |
| `full_name` | `varchar(150)` | No | — | `RES` | `REQ` | |
| `document_type` | `varchar(20)` | Sí | `NULL` | `RES` | `REQ` | |
| `document_number` | `varchar(20)` | Sí | `NULL` | `RES` | `REQ` | |
| `phone` | `varchar(20)` | Sí | `NULL` | `RES` | `REQ` | |
| `email` | `varchar(254)` | Sí | `NULL` | `RES` | `REQ` | |
| `is_representative` | `boolean` | No | `false` | `RES` | `REQ` | Actúa por poder de un tercero |

**Restricciones**

- UK parcial: `UNIQUE (property_id, document_number) WHERE document_number IS NOT NULL`

**Por qué no está en `property`**

Podría haber sido un `owner_name` y un `owner_phone` en `property`. Se separó
porque un inmueble puede tener **más de un propietario registrado**, y conmutar
representantes a mitad de una negociación no debería requerir editar el
inmueble. Consecuencia práctica: `DELETE` de `property_owner` es un hecho
auditable, no una sobrescritura de texto.

### 2.4 `property_image`

HU-PROP-02. El spec solo expone `link_galeria` como URL externa; esta tabla es la
vía para galería propia cuando el MVP lo implemente.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `ARQ` | PK |
| `property_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `property`, `CASCADE` |
| `storage_key` | `varchar(500)` | No | — | `INT` | `ARQ` | Ruta en el almacén de objetos. UK con `property_id` |
| `sort_order` | `integer` | No | `0` | `PUB` | `ARQ` | Orden en la galería |
| `width` | `integer` | Sí | `NULL` | `INT` | `SOP` | Para reservar espacio y evitar layout shift |
| `height` | `integer` | Sí | `NULL` | `INT` | `SOP` | Ídem |
| `is_cover` | `boolean` | No | `false` | `PUB` | `ARQ` | Foto principal. Una por propiedad |
| `alt_text` | `varchar(200)` | Sí | `NULL` | `PUB` | `ARQ` | **Accesibilidad**. No opcional en la práctica |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |

**Restricciones**

- UK: `(property_id, storage_key)`
- UK parcial: `UNIQUE (property_id) WHERE is_cover = true`
- `CHECK (width IS NULL OR width > 0)`, `CHECK (height IS NULL OR height > 0)`
- `CHECK (sort_order >= 0)`

**`storage_key`, no la URL completa**

Guardar `https://cdn.housebroker.pe/...` completo obliga a reescribir cada fila si
el dominio o el proveedor cambian. Guardando solo la clave, cambiar de proveedor es
un `UPDATE` de una columna o ni siquiera eso, si el dominio se resuelve en
configuración. La URL se compone en el serializer.

`alt_text` existe por `TASK-A11Y-PROP-02` y el criterio de accesibilidad del
proyecto. Es `nullable` porque la base no debe rechazar un alta antes de que el
frontend lo provea, pero la regla operativa es que toda imagen publicada la tenga.

### 2.5 `property_schedule_slot`

HU-CRM-01. Implementa `PropertySchedules` del spec.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK. `ScheduleSlot.id`, "estable entre reemplazos" |
| `property_id` | `uuid` | No | — | `PUB` | `API` | FK `property`, `CASCADE` |
| `weekday` | `smallint` | No | — | `PUB` | `API` | 0=LUNES … 6=DOMINGO. **Interno numérico** |
| `start_time` | `time` | No | — | `PUB` | `API` | `HH:MM`, zona `America/Lima` |
| `end_time` | `time` | No | — | `PUB` | `API` | `HH:MM`, zona `America/Lima` |
| `is_active` | `boolean` | No | `true` | `PUB` | `API` | `PUT` desactiva en vez de borrar |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `INT` | `SOP` | |

**Restricciones**

- `CHECK (weekday BETWEEN 0 AND 6)`
- `CHECK (end_time > start_time)`
- UK: `(property_id, weekday, start_time)` — impide duplicar el inicio de una franja
- UK: `(property_id, weekday, start_time, end_time)`

**La asimetría `time` vs `timestamptz` es la decisión más importante de la tabla**

`USE_TZ = True` hace que toda fecha/hora sea `timestamptz` en UTC. Estas dos
columnas son la excepción, y es deliberada:

Un bloque `09:00` de lunes significa **las 09:00 de Lima, todos los lunes**, en
enero y en octubre. Guardarlo como `timestamptz` exigiría elegir una fecha de
ancla, y en el momento del cambio horario de Perú las 09:00 pasarían a ser 10:00 o
08:00 en la tabla, con citas ya agendadas para el horario viejo.

Guardarlo como `time` sin zona mantiene la intención del negocio intacta. La
materialización a un instante concreto ocurre al calcular `AvailableSlots`, que sí
produce `timestamptz`. Por eso `AvailableSlots` es un recurso calculado y no una
tabla: la conversión depende de la fecha, y por eso no puede precalcularse.

Los nombres del recurso calculado no coinciden con los de la tabla, y conviene
fijarlo para que el serializer no se improvise:

| `AvailableSlot` (API) | Origen en la base |
|---|---|
| `start_at` | Franja `start_time` + fecha solicitada, materializada en `America/Lima` |
| `end_at` | Franja `end_time` + misma fecha |
| `duration_minutes` | `end_at - start_at` en minutos, con el mismo `CHECK BETWEEN 15 AND 480` |

El intervalo es semiabierto `[start_at, end_at)`, igual que en
`property_schedule_slot`, para que dos visitas contiguas no se consideren
solapadas. Cuando el cliente agenda, envía `start_at` como `scheduled_at` y el
valor debe coincidir exactamente con el que el endpoint devolvió.

**`weekday` numérico, no el string del enum**

El spec declara `Weekday` como enum de strings (`LUNES`, `MARTES`, …). Se persiste
`smallint` y el mapeo vive en `catalogs.md` §3. Tres razones:

1. `ORDER BY weekday` con enteros da lunes-primero; con los strings del enum el
   orden sería alfabético, que es domingo-primero.
2. Ocupa 2 bytes en vez de 8, y la tabla se lee en cada cálculo de disponibilidad.
3. `WeekdayScheduleInput` sigue devolviendo strings: el mapeo está en el serializer.

**Sin `CHECK` de no solapamiento por fila**

Que dos franjas del mismo día no se solapen es una restricción que abarca **varias
filas**, y `CHECK` solo puede mirar la fila que se inserta. Se implementa con una
exclusión `gist`, documentada en `indexes-and-queries.md` §4.3.

**`PUT` desactiva, no borra**

El spec lo dice de `ScheduleSlot.is_active`: un `PUT` desactiva las franjas ausentes
en lugar de borrarlas, "de modo que las citas ya agendadas conserven su referencia".
De ahí el `ON DELETE` de `appointment.schedule_slot_id`: **`RESTRICT`, no `CASCADE`**.
Si una franja referenciada se borrara, `cascade` llevaría consigo la cita entera.

### 2.6 `property_status_change`

HU-PROP-04. Historial append-only.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `API` | PK |
| `property_id` | `uuid` | No | — | `INT` | `API` | FK `property`, `CASCADE` |
| `previous_status` | `varchar(15)` | Sí | `NULL` | `INT` | `API` | `NULL` solo en el alta inicial |
| `new_status` | `varchar(15)` | No | — | `INT` | `API` | `PropertyStatusResult.status` |
| `reason` | `text` | Sí | `NULL` | `INT` | `API` | `PropertyStatusInput.reason`, 5–500 chars |
| `changed_by_id` | `uuid` | Sí | `NULL` | `INT` | `API` | FK `user`, `SET NULL`. `NULL` = sistema |
| `changed_at` | `timestamptz` | No | `timezone.now` | `INT` | `API` | `PropertyStatusResult.changed_at` |

**Restricciones**

- `CHECK (previous_status IS NULL OR previous_status <> new_status)`
- `CHECK (previous_status IS NULL OR previous_status IN (...5 valores...))`
- `CHECK (new_status IN (...5 valores...))`

**Por qué `previous_status` y `previous_status` no bastan para "quién lo hizo"**

`PropertyStatusResult` ya expone `changed_by` y `changed_at`. Lo que la tabla
agrega es la **cadena**: sin ella, `GET /api/v1/properties/{id}/status` solo podría
devolver el estado actual, y el dashboard de `HU-CRM-05` no podría mostrar "pasó de
DISPONIBLE a RESERVADO el martes por el agente X".

**Motivo obligatorio en transiciones auditables**

El spec exige `reason` para `SUSPENDIDO`, `RESERVADO`, `ALQUILADO` y `VENDIDO`, y
lo deja opcional al volver a `DISPONIBLE`. Eso no es una validación del serializer:
se implementa en el servicio, con la tabla como constancia:

```python
AUDITABLE_TRANSITIONS = {'SUSPENDIDO', 'RESERVADO', 'ALQUILADO', 'VENDIDO'}

def change_status(property, new_status, reason, actor):
    if new_status in AUDITABLE_TRANSITIONS and not reason:
        raise ValidationError("reason es obligatorio para esta transición")
    ...
```

Se deja como regla de servicio, no como `CHECK`, porque el `CHECK` no puede
depender del valor de `previous_status` de forma útil al hacer `INSERT` y obliga a
un trigger.

**Tabla append-only**

Un `UPDATE` sobre `property_status_change` es un bug, no una corrección. No hay
endpoint que la actualice y el permiso del rol `audit` es `INSERT` solamente. Si
alguna vez haya que corregir un registro, se inserta una fila de corrección y se
documenta; la fila original no se toca.

---

## 3. CRM

### 3.1 `appointment`

HU-CRM-01 y HU-CRM-02. La tabla con más reglas de integridad del modelo.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK |
| `property_id` | `uuid` | No | — | `PUB` | `API` | FK `property`, `RESTRICT` |
| `client_id` | `uuid` | No | — | `PUB` | `API` | FK `user`, `RESTRICT` |
| `agent_id` | `uuid` | No | — | `PUB` | `API` | FK `user`, `RESTRICT` |
| `schedule_slot_id` | `uuid` | Sí | `NULL` | `INT` | `API` | FK `property_schedule_slot`, `RESTRICT` |
| `scheduled_at` | `timestamptz` | No | — | `PUB` | `API` | UTC. Filtra `dateFrom`/`dateTo` |
| `end_at` | `timestamptz` | No | — | `INT` | `SOP` | `scheduled_at + duration_minutes`. Para el `EXCLUDE` |
| `duration_minutes` | `integer` | No | `45` | `PUB` | `API` | `CHECK BETWEEN 15 AND 480`. Copia del slot |
| `status` | `varchar(15)` | No | `PENDING` | `PUB` | `API` | `AppointmentStatus` |
| `reason` | `text` | Sí | `NULL` | `PUB` | `API` | Último motivo. 5–500 chars |
| `rescheduled_from_id` | `uuid` | Sí | `NULL` | `PUB` | `SOP` | FK self. Cadena de reprogramaciones |
| `reschedule_count` | `integer` | No | `0` | `INT` | `SOP` | Corta Cortafuegos de reprogramaciones abusivas |
| `confirmed_at` | `timestamptz` | Sí | `NULL` | `INT` | `SOP` | |
| `cancelled_at` | `timestamptz` | Sí | `NULL` | `INT` | `SOP` | |
| `completed_at` | `timestamptz` | Sí | `NULL` | `INT` | `SOP` | |
| `source` | `varchar(20)` | No | `CLIENT_WEB` | `INT` | `SOP` | `CLIENT_WEB`, `AGENT`, `ADMIN`, `AI_CHAT` |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `API` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `PUB` | `API` | `Appointment.updated_at` |

**`duration_minutes` es una copia, no una referencia**

El spec dice que `duration_minutes` "deriva del `ScheduleSlot` reservado". Si solo
existiera la FK, leer la duración sería un `JOIN`, y `Appointment` tendría que
serializar un dato de otra tabla. Copiándolo al agendar, la cita queda **autocontenida**:
si la franja se desactiva o se reescribe su `end_time`, la cita ya reservada
conserva la duración con la que se agendó. Es la misma razón por la que el spec
incluye `duration_minutes` en el schema en vez de pedirlo al endpoint de
disponibilidad en cada lectura.

**`end_at` es una columna calculada que no está en el spec**

Existe solo para el `EXCLUDE USING gist` de solapamiento, que necesita un rango
materializado para indexar. Django la mantiene con un trigger o la calcula en
`save()`. Sin ella, la exclusión tendría que ir sobre un expression index, que es
más frágil y no se puede usar con `NULL`.

**`ON DELETE RESTRICT` en las tres FKs**

Citas, clientes y agentes usan `RESTRICT`, no `CASCADE`. Una cita es un hecho
histórico de la agenda; que se elimine lógicamente un usuario o una propiedad **no**
puede arrastrar las citas que tuvo. Es la regla de `docs/02_Arquitectura.md` §8:
"la eliminación lógica evita perder historial relacionado con citas".

La consecuencia es que hay que escribir la orden de eliminación explícita, y por eso
el `DELETE` lógico es siempre `is_active = false` + `deleted_at`, nunca un borrado
físico.

**Restricciones**

```sql
CHECK (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED',
                  'COMPLETED', 'CANCELLED', 'NO_SHOW'))
CHECK (duration_minutes BETWEEN 15 AND 480)
CHECK (end_at = scheduled_at + make_interval(mins => duration_minutes))
CHECK (reschedule_count >= 0)
CHECK (scheduled_at > created_at - interval '1 year')
CHECK (created_at <= updated_at)
```

**Solapamiento: la restricción que más código ahorra**

Dos citas del mismo agente no pueden solaparse en el tiempo. Sin una restricción en
la base, eso es un `SELECT` seguido de un `INSERT`, y entre ambos dos peticiones
concurrentes reservan el mismo horario. La respuesta sería `409
appointment_slot_conflict`, que es exactamente lo que el spec promete.

La garantía correcta es declarativa:

```sql
ALTER TABLE appointment ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    agent_id WITH =,
    tstzrange(scheduled_at, end_at, '[)') WITH &&
  ) WHERE (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED'));
```

El `WHERE` parcial es lo que hace la regla manejable: las citas `CANCELLED`,
`COMPLETED` y `NO_SHOW` no bloquean, porque ya no ocupan agenda. Un `EXCLUDE` sin
el filtro parcial dejaría la historia de citas pasadas bloqueando el horario para
siempre, y en unas semanas el agente no podría agendar nada.

El intervalo `'[)'` coincide con el intervalo semiabierto que el spec usa en
`TimeSlotInput`: 09:00–12:00 y 12:00–15:00 son contiguas, no solapadas.

Requiere la extensión `btree_gist`. Ver `migrations-and-seeding.md` §2.

### 3.2 `appointment_status_change`

HU-CRM-02. Historial append-only. Espejo exacto de `PropertyStatusResult`.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK |
| `appointment_id` | `uuid` | No | — | `PUB` | `API` | FK `appointment`, `CASCADE` |
| `previous_status` | `varchar(15)` | Sí | `NULL` | `PUB` | `API` | `NULL` en el alta inicial |
| `new_status` | `varchar(15)` | No | — | `PUB` | `API` | |
| `previous_scheduled_at` | `timestamptz` | Sí | `NULL` | `PUB` | `API` | Se guarda **siempre**, aunque no cambie |
| `new_scheduled_at` | `timestamptz` | Sí | `NULL` | `PUB` | `API` | Solo difiere en `RESCHEDULED` |
| `reason` | `text` | Sí | `NULL` | `PUB` | `API` | |
| `changed_by_id` | `uuid` | Sí | `NULL` | `INT` | `API` | FK `user`, `SET NULL` |
| `changed_at` | `timestamptz` | No | `timezone.now` | `PUB` | `API` | |

**Por qué `previous_scheduled_at` se guarda siempre**

El spec dice: "se devuelve siempre, incluso si no cambió, para que el cliente tenga
el valor completo con el que revertir". Eso aplica igual a la tabla. Guardarlo solo
cuando cambia obligaría a un `COALESCE` en cada lectura para distinguir "no cambió"
de "no se registró", que es información distinta.

**Estados terminales**

El spec es explícito: `COMPLETED`, `CANCELLED` y `NO_SHOW` no admiten transición de
salida, y `PENDING` está excluido del conjunto de destinos. La matriz completa de
transiciones válidas está en `catalogs.md` §5, y se aplica en el servicio.

Se aplica también al historial: no se insertan filas para transiciones inválidas.
Una fila por cambio de estado aceptado, sin excepciones.

### 3.3 `visit_observation`

HU-CRM-04. **Ninguna columna es pública.** Es la tabla de notas internas del agente.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `RES` | `REQ` | PK |
| `appointment_id` | `uuid` | No | — | `RES` | `REQ` | FK `appointment`, `CASCADE`. **UK** |
| `agent_id` | `uuid` | No | — | `RES` | `REQ` | FK `user`, `RESTRICT`. Quién escribió |
| `interest_level` | `integer` | Sí | `NULL` | `RES` | `REQ` | 1–5. Alimenta `client_profile.interest_level` |
| `client_showed_up` | `boolean` | Sí | `NULL` | `RES` | `REQ` | `NULL` = visita aún no realizada |
| `notes` | `text` | Sí | `NULL` | `RES` | `REQ` | Feedback, nivel de interés, contexto |
| `counteroffer_amount` | `numeric(12,2)` | Sí | `NULL` | `RES` | `REQ` | Contraoferta del cliente |
| `counteroffer_currency` | `varchar(3)` | Sí | `NULL` | `RES` | `REQ` | `Moneda` |
| `followup_at` | `timestamptz` | Sí | `NULL` | `INT` | `REQ` | Recordatorio de seguimiento |
| `created_at` | `timestamptz` | No | `timezone.now` | `RES` | `SOP` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `RES` | `SOP` | |

**Restricciones**

- UK: `appointment_id` — una observación por cita. No es 1:N porque una visita
  tiene un resultado; las correcciones se auditan en `audit_log`
- `CHECK (interest_level IS NULL OR interest_level BETWEEN 1 AND 5)`
- `CHECK (counteroffer_amount IS NULL OR counteroffer_amount > 0)`
- `CHECK (counteroffer_amount IS NULL) = (counteroffer_currency IS NULL)`

**El `CHECK` de contraoferta merece explicación**

Si hay monto sin moneda, el número no significa nada. Con una revisión de negocio,
un agente que escribía `counteroffer_amount = 120000` sin moneda se encontraba con
120 000 soles o 120 000 dólares según el convenido de la casa. La restricción
obliga a que ambos campos vayan juntos, y hace que esa ambigüedad sea un `500`
visible en desarrollo y no una confusión meses después.

**Ninguna columna tiene campo en `openapi_spec.yaml`**

Ni `interest_level`, ni `counteroffer_amount`. `RF-CRM-04` lo pide, el backlog lo
contempla, y el endpoint no está especificado. Cuando se escriba, los nombres
JSON deben ser en inglés como el resto del contrato, y estas columnas deben pasar a
`INT` con autorización por objeto (el agente que escribió, o cualquier agente del
inmueble).

---

## 4. Conversaciones

### 4.1 `conversation`

HU-SEC-03. Estados de `docs/02_Arquitectura.md` §7.2.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `ARQ` | PK |
| `client_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `user`, `RESTRICT` |
| `agent_id` | `uuid` | Sí | `NULL` | `PUB` | `ARQ` | FK `user`, `SET NULL`. `NULL` en modo bot |
| `status` | `varchar(20)` | No | `BOT_ACTIVE` | `PUB` | `ARQ` | `BOT_ACTIVE`, `WAITING_AGENT`, `HUMAN_ACTIVE`, `CLOSED` |
| `mode` | `varchar(10)` | No | `VIRTUAL` | `PUB` | `ARQ` | `VIRTUAL`, `HUMAN` |
| `unread_count_client` | `integer` | No | `0` | `PUB` | `REQ` | Badge del cliente |
| `unread_count_agent` | `integer` | No | `0` | `PUB` | `REQ` | Badge del agente. Cola de `HU-SEC-03` |
| `last_message_at` | `timestamptz` | Sí | `NULL` | `PUB` | `SOP` | Orden de la lista de conversaciones |
| `closed_at` | `timestamptz` | Sí | `NULL` | `PUB` | `SOP` | |
| `closed_by` | `varchar(10)` | Sí | `NULL` | `PUB` | `SOP` | `CLIENTE`, `AGENTE`, `SISTEMA` |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `SOP` | |
| `updated_at` | `timestamptz` | No | `auto_now` | `PUB` | `SOP` | |

**Restricciones**

- UK parcial: `UNIQUE (client_id) WHERE status IN ('BOT_ACTIVE', 'WAITING_AGENT', 'HUMAN_ACTIVE')`
- `CHECK (status IN ('BOT_ACTIVE', 'WAITING_AGENT', 'HUMAN_ACTIVE', 'CLOSED'))`
- `CHECK (mode IN ('VIRTUAL', 'HUMAN'))`
- `CHECK (unread_count_client >= 0 AND unread_count_agent >= 0)`
- `CHECK ((status = 'HUMAN_ACTIVE') = (agent_id IS NOT NULL) OR status <> 'HUMAN_ACTIVE')`

**El UK parcial es la regla del "chat único"**

`docs/02_Arquitectura.md` §7 dice que hay **un solo chat continuo** y que la
transferencia al agente humano no crea una conversación nueva. El UK parcial lo
garantiza a nivel de base: un cliente no puede tener dos conversaciones abiertas.

La condición del índice importa. Sin ella, un cliente que alguna vez cerró una
conversación no podría volver a iniciar otra, porque el histórico ocupa el
par único. Con ella, las conversaciones `CLOSED` quedan fuera del índice y el
cliente puede abrir una nueva.

El `mode` y el `status` están juntos a propósito: `status` es el ciclo de vida
completo y `mode` responde "quién responde ahora mismo". Un par redundante se
justifica porque el índice de la bandeja del agente y la del cliente filtran por
distintos campos, y un solo enum no cubre las consultas de ambos.

### 4.2 `message`

HU-SEC-03. El historial permanente vive acá, no en Redis.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `ARQ` | PK |
| `conversation_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `conversation`, `CASCADE` |
| `sender_id` | `uuid` | Sí | `NULL` | `PUB` | `ARQ` | FK `user`, `SET NULL`. `NULL` = bot |
| `sender_type` | `varchar(10)` | No | — | `PUB` | `ARQ` | `CLIENT`, `AGENT`, `BOT`, `SYSTEM` |
| `content` | `text` | No | — | `PUB` | `ARQ` | Cuerpo del mensaje |
| `attachments` | `jsonb` | No | `[]` | `PUB` | `ARQ` | Lista de objetos `{key, mime, size}` |
| `is_flagged` | `boolean` | No | `false` | `INT` | `REQ` | HU-SEC-06. Mensaje marcado para revisión |
| `flag_reason` | `varchar(255)` | Sí | `NULL` | `INT` | `REQ` | Motivo del marcado |
| `replied_to_id` | `uuid` | Sí | `NULL` | `PUB` | `SOP` | FK self. Hilos de respuesta |
| `delivered_at` | `timestamptz` | Sí | `NULL` | `PUB` | `ARQ` | Push por WebSocket |
| `read_at` | `timestamptz` | Sí | `NULL` | `PUB` | `ARQ` | Marca de leído |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `ARQ` | |

**Restricciones**

- `CHECK (sender_type IN ('CLIENT', 'AGENT', 'BOT', 'SYSTEM'))`
- `CHECK ((sender_type = 'BOT') = (sender_id IS NULL) OR sender_type IN ('CLIENT', 'AGENT', 'SYSTEM'))`
- `CHECK (length(trim(content)) > 0 OR jsonb_array_length(attachments) > 0)`
- `CHECK (delivered_at IS NULL OR delivered_at >= created_at)`
- `CHECK (read_at IS NULL OR read_at >= created_at)`

**El `CHECK` de mensaje vacío**

Un mensaje sin texto y sin adjuntos es ruido en el historial y una linea inutilínea
en el chat. La condición conjunta permite enviar solo un archivo, que es un caso
real, y bloquea el envío vacío que un cliente malicioso produciría para inflar el
historial.

**Por qué `sender_id` es `NULL` para el bot**

El asistente virtual no es un `user`: no tiene correo, ni contraseña, ni sesión,
ni rol. Si el bot fuera un usuario, tendría que autenticarse, aparecería en
`/api/admin/users/` y ocuparía un rol de los tres del enum. `sender_type`
desambigua sin todas esas consecuencias.

**`is_flagged` es interno**

Un administrador marca mensajes por control de calidad (`HU-SEC-06`), pero la
marca no es visible para el cliente ni para el agente. Si lo fuera, cambiaría el
comportamiento de quien escribe. El contenido del mensaje tampoco cambia: el
supervisor de auditoría lee el texto directamente bajo autorización administrativa.

**`delivered_at` y `read_at` en la base, no en Redis**

`docs/02_Arquitectura.md` §7.3 dice: "los mensajes se guardarán en PostgreSQL antes
de confirmar su entrega. Redis no será el almacenamiento definitivo". Las marcas
de tiempo van en la misma fila que el mensaje por eso: si vivieran en Redis y este
se vaciara, se perdería el estado de lectura del historial permanente.

### 4.3 `handoff_request`

HU-AI-04. Solicitud de atención humana dentro de la conversación existente.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `ARQ` | PK |
| `conversation_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `conversation`, `CASCADE`. **UK** |
| `requested_by_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `user`. Quién pidió |
| `assigned_agent_id` | `uuid` | Sí | `NULL` | `PUB` | `ARQ` | FK `user`. Agente al que se ofrecio |
| `accepted_by_id` | `uuid` | Sí | `NULL` | `PUB` | `ARQ` | FK `user`. Quién aceptó |
| `status` | `varchar(15)` | No | `PENDING` | `PUB` | `ARQ` | `PENDING`, `ACCEPTED`, `CANCELLED`, `EXPIRED` |
| `requested_at` | `timestamptz` | No | `timezone.now` | `PUB` | `ARQ` | |
| `accepted_at` | `timestamptz` | Sí | `NULL` | `PUB` | `ARQ` | |
| `wait_seconds` | `integer` | Sí | `NULL` | `INT` | `REQ` | SLI de espera. Alimenta `docs/07_SLO_SLI_SLA.md` |

**Restricciones**

- UK: `conversation_id` — **una solicitud viva por conversación**
- `CHECK (status IN ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED'))`
- `CHECK ((status = 'ACCEPTED') = (accepted_by_id IS NOT NULL AND accepted_at IS NOT NULL) OR status <> 'ACCEPTED')`
- `CHECK (wait_seconds IS NULL OR wait_seconds >= 0)`

**El UK en `conversation_id` es la regla de "no se duplica ni se pierde"**

`docs/02_Arquitectura.md` §7.1: "no se creará una conversación nueva", "no se
creará… ni perder la conversación actual". Con UK en `conversation_id`, un doble
clic en "hablar con un agente" o dos peticiones simultáneas no crean dos
solicitudes. La segunda recibe `409`, que es el comportamiento correcto: la
primera ya puso al cliente en cola.

**`wait_seconds` no es un `timestamp`, es un entero de segundos**

Es una métrica de duración, no un instante. Guardarlo como `generated` de
timestamps obligaría a restarlos en cada lectura para el dashboard. Se calcula
una vez, en `accepted_at`, y se lee directo.

---

## 5. Inteligencia artificial

### 5.1 `ai_session`

HU-AI-01. Una sesión por conversación activa con el asistente.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `ARQ` | PK |
| `conversation_id` | `uuid` | No | — | `INT` | `ARQ` | FK `conversation`, `CASCADE`. UK |
| `client_id` | `uuid` | Sí | `NULL` | `INT` | `ARQ` | FK `user`, `SET NULL` |
| `provider` | `varchar(20)` | No | `GEMINI` | `INT` | `ARQ` | `GEMINI`, `LOCAL`, `FALLBACK` |
| `model_name` | `varchar(50)` | No | — | `INT` | `ARQ` | `gemini-3.1-flash-lite` |
| `token_type` | `varchar(10)` | No | `FLASH` | `INT` | `ARQ` | `FLASH`, `PRO`. Control de costo |
| `preferences` | `jsonb` | No | `{}` | `INT` | `ARQ` | Salida de `extract_preferences` |
| `turns_count` | `integer` | No | `0` | `INT` | `SOP` | |
| `status` | `varchar(15)` | No | `ACTIVE` | `INT` | `SOP` | `ACTIVE`, `COMPLETED`, `FALLBACK`, `ABORTED` |
| `fallback_reason` | `varchar(100)` | Sí | `NULL` | `INT` | `SOP` | `TIMEOUT`, `QUOTA_EXCEEDED`, `INVALID_RESPONSE` |
| `started_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |
| `ended_at` | `timestamptz` | Sí | `NULL` | `INT` | `SOP` | |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |

**Restricciones**

- UK: `conversation_id` — una sesión viva por conversación
- `CHECK (status IN ('ACTIVE', 'COMPLETED', 'FALLBACK', 'ABORTED'))`
- `CHECK (status <> 'FALLBACK' OR fallback_reason IS NOT NULL)`
- `CHECK (turns_count >= 0)`

**Por qué `provider` y `model_name` están en cada fila**

Son datos del proveedor externo, no configuración. La variable `GEMINI_MODEL` es
el valor por defecto de la sesión **nueva**; una sesión ya empezada conserva el
modelo con el que corrió. Sin esas columnas, cambiar de modelo a mitad de una
conversación dejaría el historial sin contexto de qué lo generó, y el reporte de
costo de `HU-AI-05` no podría agrupar por modelo.

Es la consecuencia del `AIService`: el patrón Adapter permite cambiar Gemini por un
modelo local, y estas columnas son el registro de que eso ocurrió.

### 5.2 `ai_recommendation`

HU-AI-02 y HU-AI-03. Las 2 o 3 recomendaciones que el cliente ve con su `match %`.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `API` | PK |
| `ai_session_id` | `uuid` | No | — | `PUB` | `API` | FK `ai_session`, `CASCADE` |
| `property_id` | `uuid` | No | — | `PUB` | `API` | FK `property`, `RESTRICT` |
| `position` | `integer` | No | — | `PUB` | `API` | 1 a 3. `RF-AI-02` fija el rango |
| `rules_score` | `numeric(5,2)` | No | — | `INT` | `ARQ` | Puntaje por reglas SQL. 0–100 |
| `llm_score` | `numeric(5,2)` | Sí | `NULL` | `INT` | `ARQ` | `NULL` = no hubo scoring LLM (fallback) |
| `final_score` | `numeric(5,2)` | No | — | `PUB` | `API` | El `match %` que ve el cliente |
| `reasons` | `jsonb` | No | `[]` | `PUB` | `API` | `["acepta mascotas", "cerca al transporte"]` |
| `explanation` | `text` | Sí | `NULL` | `PUB` | `API` | `RF-AI-03`. Texto del por qué |
| `was_clicked` | `boolean` | No | `false` | `INT` | `REQ` | Métrica de efectividad. `HU-AI-05` |
| `led_to_appointment_id` | `uuid` | Sí | `NULL` | `INT` | `REQ` | FK `appointment`, `SET NULL`. Atribución |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `SOP` | |

**Restricciones**

- UK: `(ai_session_id, property_id)` — la IA no recomienda dos veces el mismo
- UK: `(ai_session_id, position)`
- `CHECK (position BETWEEN 1 AND 3)`
- `CHECK (rules_score BETWEEN 0 AND 100)`
- `CHECK (llm_score IS NULL OR llm_score BETWEEN 0 AND 100)`
- `CHECK (final_score BETWEEN 0 AND 100)`

**La fórmula del `final_score`**

`docs/02_Arquitectura.md` §6.4 fija:

```text
puntaje_final = (puntaje_reglas × 0.70) + (puntaje_llm × 0.30)
```

Cuando hay fallback sin IA, `llm_score` es `NULL` y `final_score = rules_score`. La
fórmula se implementa en `RecommendationService`, no como columna generada, porque
`llm_score` llega del LLM **después** de que `rules_score` ya está en la fila.

**El `CHECK (position BETWEEN 1 AND 3)` hace cumplir `RF-AI-02`**

El requisito dice "entre 2 y 3 recomendaciones óptimas". El `CHECK` impone el
máximo de 3 a nivel de base. El mínimo de 2 no se puede expresar en un `CHECK`
porque depende de cuántas filas hay, y se valida en el servicio: si el filtro SQL
devuelve 0 o 1 candidatos, no hay recomendaciones y el bot lo reconoce
("reconocer cuando no existen coincidencias", `docs/02_Arquitectura.md` §6.5) en
vez de inventar una.

**`led_to_appointment_id` es lo que convierte una métrica en un resultado**

`was_clicked` mide interés. `led_to_appointment_id` mide conversión. El segundo es
un FK a `appointment`, y se setea cuando el cliente agenda desde la tarjeta de
recomendación. Sin él, `HU-AI-05` solo puede reportar clics, que es un número que
casi cualquier sistema mejora sin mejorar nada.

### 5.3 `ai_audit_event`

HU-AI-05. Supervisión del bot.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `INT` | `REQ` | PK |
| `ai_session_id` | `uuid` | Sí | `NULL` | `INT` | `REQ` | FK `ai_session`, `SET NULL` |
| `user_id` | `uuid` | Sí | `NULL` | `INT` | `REQ` | FK `user`, `SET NULL` |
| `event_type` | `varchar(30)` | No | — | `INT` | `REQ` | `PREFERENCE_EXTRACTED`, `SCORED`, `HANDOFF`, `ERROR` |
| `provider` | `varchar(20)` | Sí | `NULL` | `INT` | `REQ` | Proveedor que atendió |
| `is_fallback` | `boolean` | No | `false` | `INT` | `REQ` | |
| `was_hallucinated` | `boolean` | No | `false` | `INT` | `REQ` | La IA propuso un id no candidato |
| `latency_ms` | `integer` | Sí | `NULL` | `INT` | `REQ` | SLI. `RNF-02` pide < 3000 ms |
| `prompt_tokens` | `integer` | Sí | `NULL` | `INT` | `REQ` | Control de cuota |
| `completion_tokens` | `integer` | Sí | `NULL` | `INT` | `REQ` | Control de cuota |
| `payload_redacted` | `jsonb` | No | `{}` | `RES` | `SOP` | Respuesta del modelo, **anonimizada** |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `REQ` | |

**Restricciones**

- `CHECK (latency_ms IS NULL OR latency_ms >= 0)`
- `CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0)`
- `CHECK (completion_tokens IS NULL OR completion_tokens >= 0)`

**`was_hallucinated` es la métrica de seguridad del módulo**

`docs/02_Arquitectura.md` §6 dice: "Gemini no podrá agregar propiedades nuevas al
resultado. Si devuelve un identificador que no estaba entre los candidatos, Django
lo descartará". El descarte es correcto, pero invisible: sin esta columna, un
sistema que aprendiera a confiar de más en el LLM no dejaría rastro hasta que un
cliente viera una propiedad inventada.

Cada vez que el servicio descarta un `property_id` fuera del conjunto candidato,
inserta una fila con `was_hallucinated = true`. El contador es la alarma temprana
de `HU-AI-05`.

**`payload_redacted` es redactado por diseño**

`docs/02_Arquitectura.md` §6.6 limita lo que se envía a Gemini: sin contraseñas, sin
documentos, sin teléfonos, sin correos, con identificadores reemplazados por
referencias temporales. `payload_redacted` guarda lo que **volvió**, ya sin
referencias internas. Guardar el payload crudo sería crear, dentro de la propia
base de datos, una copia de los datos que la política de privacidad prohíbe
mandar al proveedor.

---

## 6. Transversales

### 6.1 `notification`

HU-SEC-05. Notificaciones omnicanal.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB` | `ARQ` | PK |
| `user_id` | `uuid` | No | — | `PUB` | `ARQ` | FK `user`, `CASCADE` |
| `type` | `varchar(40)` | No | — | `PUB` | `ARQ` | `APPOINTMENT_CONFIRMED`, `NEW_MESSAGE`, `NEW_LEAD`, … |
| `channel` | `varchar(10)` | No | `IN_APP` | `PUB` | `ARQ` | `IN_APP`, `EMAIL`, `PUSH` |
| `subject` | `varchar(200)` | No | — | `PUB` | `ARQ` | |
| `body` | `text` | No | — | `PUB` | `ARQ` | |
| `context` | `jsonb` | No | `{}` | `PUB` | `ARQ` | Datos para el template del frontend |
| `appointment_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `appointment`, `SET NULL` |
| `conversation_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `conversation`, `SET NULL` |
| `property_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `property`, `SET NULL` |
| `sent_at` | `timestamptz` | Sí | `NULL` | `INT` | `ARQ` | `NULL` = en cola |
| `read_at` | `timestamptz` | Sí | `NULL` | `PUB` | `ARQ` | |
| `created_at` | `timestamptz` | No | `timezone.now` | `PUB` | `ARQ` | |

**Restricciones**

- `CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH'))`
- `CHECK (read_at IS NULL OR sent_at IS NOT NULL)`

**Un registro por evento, no por canal**

`channel` es una columna, no una tabla de destinatarios. Se eligió así porque el
MVP envía por un canal a la vez; si un evento llegara a necesitar fan-out a varios
canales, se divide en N filas con el mismo `type` y `context`, y el índice
`(user_id, read_at)` sigue sirviendo.

**Las tres FKs de contexto son opcionales y `SET NULL`**

Una notificación debe sobrevivir a que se elimine lógicamente el objeto que la
originó. Si un cliente cancela una cita y la cita se archiva, la notificación de
"cita cancelada" sigue siendo un hecho que el usuario debe poder leer. Con
`CASCADE`, desaparecería.

### 6.2 `audit_log`

HU-CRM-05 y RNF-04. Append-only. La tabla más importante para la seguridad del
sistema y la única cuya escritura se exige desde todas las apps.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `bigint` | No | `serial` | `INT` | `ARQ` | PK. El volumen lo justifica |
| `user_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | FK `user`, `SET NULL` |
| `actor_role` | `varchar(20)` | Sí | `NULL` | `INT` | `SOP` | `NULL` = acción de sistema |
| `action` | `varchar(50)` | No | — | `INT` | `SOP` | `PROPERTY_CREATED`, `USER_SUSPENDED`, … |
| `entity_type` | `varchar(40)` | No | — | `INT` | `SOP` | Nombre de la tabla afectada |
| `entity_id` | `uuid` | Sí | `NULL` | `INT` | `SOP` | |
| `request_id` | `uuid` | Sí | `NULL` | `INT` | `API` | Correlación con `X-Request-Id` |
| `ip_address` | `inet` | Sí | `NULL` | `RES` | `SOP` | |
| `user_agent` | `varchar(255)` | Sí | `NULL` | `RES` | `SOP` | |
| `before_snapshot` | `jsonb` | Sí | `NULL` | `INT` | `SOP` | Estado previo |
| `after_snapshot` | `jsonb` | Sí | `NULL` | `INT` | `SOP` | Estado posterior |
| `created_at` | `timestamptz` | No | `timezone.now` | `INT` | `SOP` | |

**Restricciones**

- `CHECK (user_id IS NOT NULL OR actor_role IS NULL)` — una acción de sistema no
  declara rol; una acción de usuario sin actor es un bug de instrumentación
- `CHECK (action <> '' AND entity_type <> '')`
- UK parcial: `UNIQUE (request_id, action, entity_id) WHERE request_id IS NOT NULL`

**Los snapshots pueden contener datos restringidos**

`before_snapshot` y `after_snapshot` guardan el estado completo de la fila
afectada. Si alguien edita `visit_observation`, el snapshot incluye `notes` y
`counteroffer_amount`, que son `RES`.

Por eso `audit_log` tiene `Clasif. = INT` y no `PUB`, y por eso el endpoint de
auditoría de `GET /api/admin/audit/` debe **redactar** los snapshots de las tablas
con columnas `RES` antes de responder. La redacción es del serializer, no del
modelo: la tabla debe conservar el dato completo para la investigación forense.

**El UK parcial previene el doble registro dentro de una petición**

Sin él, un `PATCH /api/v1/properties/{id}/status` que actualiza el estado **y**
dispara un side effect podría insertar dos filas de `PROPERTY_STATUS_CHANGED` con
el mismo `request_id`. Con el UK, la segunda insert falla, que es el comportamiento
deseado: un evento, un registro.

**`request_id` une la auditoría con los logs de aplicación**

El spec expone `request_id` en `Problem` y en `ProblemInternalServerError`, y
`X-Request-Id` como parámetro de cabecera. Guardarlo en la base convierte esa
identificador de correlación en algo consultable: "muéstrame todo lo que pasó en
la petición que falló".

### 6.3 `district`

Catálogo de distritos de Lima Metropolitana, para el filtro `ubigeo`.

| Columna | Tipo | Null | Default | Clasif. | Origen | Notas |
|---|---|:--:|---|:--:|---|---|
| `id` | `uuid` | No | `uuid4` | `PUB*` | `API` | PK |
| `ubigeo` | `char(6)` | No | — | `PUB` | `API` | UK. Código INEI de 6 dígitos |
| `name` | `varchar(100)` | No | — | `PUB*` | `API` | `AppointmentPropertyRef.district` |
| `province` | `varchar(100)` | No | — | `PUB` | `SOP` | Provincia |
| `department` | `varchar(100)` | No | `Lima` | `PUB` | `SOP` | Departamento |
| `is_active` | `boolean` | No | `true` | `INT` | `SOP` | Baja lógica sin borrar historia |

**Restricciones**

- UK: `ubigeo`
- `CHECK (ubigeo ~ '^[0-9]{6}$')` — replica el `pattern` de `UbigeoFilter`

**`AppointmentPropertyRef.district` no es una columna de `property`**

Es un JOIN a través de `property.district_id`. Se derivó para evitar que
`property` guarde el nombre del distrito y tenga que actualizarse cada vez que
INEI renombra un distrito: el nombre vive en un solo lugar.

**El `CHECK` del patrón replica el contrato**

`UbigeoFilter` declara `pattern: '^[0-9]{6}$'` y el backend rechaza `?ubigeo=1501`
con `400`. Poner el mismo `CHECK` en la columna hace que el dato inválido no pueda
entrar ni siquiera por una ruta que saltarse el serializer —un `INSERT` manual, un
script de carga, un futuro endpoint. La validación del `400` es responsabilidad de
la API; esta es la red de contención del dato.

`char(6)` con longitud fija es correcto aquí porque el dominio es de exactamente 6
dígitos, y en Postgres `char` rellena con espacios, que complicaría el `=`
comparativo. Para códigos de longitud variable se usaría `varchar`.

Los 43 distritos de Lima Metropolitana y su carga están en `catalogs.md` §6.

---

## 7. Resumen de divergencias con la API

Las cuatro cosas que la API expone y **no son columnas**. Es la lista más importante
del documento para quien implemente los serializers.

| En la respuesta | Cómo se obtiene |
|---|---|
| `Property.is_favorite` | `EXISTS (SELECT 1 FROM favorite WHERE property_id = p.id AND user_id = %s)` |
| `AppointmentPropertyRef.district` | JOIN `district` vía `property.district_id` |
| `AppointmentPropertyRef.title` / `address` | JOIN `property` |
| `AppointmentPersonRef.full_name` / `email` / `phone` | JOIN `user` |
| `AvailableSlots` completo | Recurso calculado. `indexes-and-queries.md` §5 |
| `PropertySchedules.timezone` | Constante `America/Lima` de la configuración, no una columna |
| `PropertySchedules.total_slots` | `COUNT` de franjas activas |
| `Paginated*.count` | `COUNT` del filtro activo |

Y dos decisiones de diseño que conviene no deshacer al implementar:

1. **`property.status` y `property.is_active` son cosas distintas.** El spec lo
   dice en `PropertyStatus`: "`is_active` decide la visibilidad en el catálogo,
   mientras `status` describe en qué etapa comercial está". Los cuatro primeros
   estados mantienen el inmueble visible; `SUSPENDIDO` lo retira.
2. **`appointment.agent_id` y `property.agent_id` son cosas distintas.**
   Ver `architecture.md` §5.1.

Ambas confusiones producen bugs silenciosos: una propiedad reservada que desaparece
del catálogo, o un agente que ve citas que no atiende.