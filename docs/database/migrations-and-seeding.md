# Migraciones y Datos Iniciales - HouseBroker Peru

El backend no tiene todavía ningún archivo de migración. Este documento define la
estrategia de migraciones del proyecto: el orden en que se construyen las 24
tablas, que se escribe a mano y que Django genera solo, y como se cargan los
catálogos sin que una prueba de produccion dependa de datos inventados.

La regla que gobierna todo lo demas: **una migración describe el esquema, y un
comando de gestion carga datos**. La excepcion son los catálogos de referencia,
que son datos y a la vez son estructura, y se tratan aparte.

---

## 1. Division de trabajo

| Que | Donde va | Por que |
|---|---|---|
| Tablas, columnas, claves foráneas | `models.py`, generadas por Django | Es lo que Django sabe hacer bien |
| Tipos enumerados como `CHECK` | `RunSQL` en una migración | Django no tiene tipo enumerado |
| Formato de `email`, `phone`, `ubigeo` | `RunSQL` | Una validacián de formato en la base |
| Restricciones de rango entre columnas | `RunSQL` | Ningun validador de campo la expresa |
| `EXCLUDE` de solapamiento | `RunSQL` | Django no expone el `EXCLUDE` en `Meta` |
| ándices GIN, GiST, funcionales y parciales | `Meta.indexes` donde se pueda, `RunSQL` si no | Los parciales no existen en `Meta` |
| Extensiones de Postgres | `RunSQL` inicial | `btree_gist` es requisito del `EXCLUDE` |
| Catálogo de distritos | Migracián de datos | Es estructura, no contenido de negocio |
| Propiedades de ejemplo, usuarios de prueba | Comando `seed_demo` | Un `manage.py migrate` en produccion no debe inventar datos |

La razán de la última fila es la que suele importar. Un seed dentro de una
migración se ejecuta en cada `migrate`, en todos los entornos, incluidas las
bases de datos de produccion. Si el seed inserta usuarios de prueba con
contrasenas conocidas, esos usuarios existen en produccion.

---

## 2. Orden de las migraciones

### 2.1 La dependencia que no se puede invertir

El usuario debe existir antes que todo lo demas, porque 20 de las 24 tablas tienen
una clave foránea hacia el.

```
0001_auth_user          (sin dependencias)
0002_extensions         (sin dependencias)
      |
0003_agents            ---+
0004_properties -------+   todas dependen de 0001
0005_property_owners ----+
0006_appointments -----+
      |
0007_property_schedules
0008_appointments_schedules
0009_appointments_status_change
0010_property_status_change
0011_favorites
0012_conversations
0013_messages
0014_handoff_requests
0015_ai_sessions
0016_ai_conversations
0017_notifications
0018_visit_observations
```

Cada migración declara `dependencies` de forma explicita, incluso cuando la
dependencia es obvia. Las dependencias de Django se resuelven por nombre de
archivo, y una dependencia implicita produce un error de orden en el momento más
inoportuno, que es cuando dos ramas se mueven a la vez.

### 2.2 `AUTH_USER_MODEL` antes de la primera migración

`settings.py` no define `AUTH_USER_MODEL`. Sin ella, Django usa
`auth.User` y el modelo vive en la tabla `auth_user`, con su propia estructura y
sus propias restricciones.

Las dos consecuencias:

**La primera, inmediata: las claves foráneas quedan mal.** El modelo documentado
declara `user`, `client`, `agent`, `owner_agent` apuntando al modelo de usuario
propio. Si ese modelo es `auth.User`, las claves foráneas apuntan a `auth_user` y
la app no es dueña de su propio usuario. Cambiarlo despuás exige una migración de
datos de claves foráneas en 20 tablas.

**La segunda, de seguridad: las poláticas de contraseáa no aplican.** Los
validadores de `AUTH_PASSWORD_VALIDATORS` trabajan contra los campos del modelo de
usuario. Un usuario personalizado que no exponga `password`, `email` y
`full_name` hace que `UserAttributeSimilarityValidator` deje de funcionar.

La migración `0001_auth_user` tiene que existir antes que cualquier otra que la
requiera, y `AUTH_USER_MODEL = "auth.User"` en `settings.py` tiene que estar
escrito antes de correr `makemigrations`.

---

## 3. El modelo de usuario

No es un `AbstractUser`. Las razones están en `catalogs.md` §1 y en
`security-and-privacy.md` §3: el rol viaja en el JWT y `is_staff` no debe existir
en la representacion publica.

```python
class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=False)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=16, default="CLIENTE")
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()
```

### 3.1 Decisiones de campo que parecen detalles

| Decision | Motivo |
|---|---|
| `email` con `unique=False` | El ándice único real es el funcional sobre `lower(email)`. Un `unique=True` además crearia un ándice más que no representa la regla del negocio y no se podráa quitar sin recrear la tabla |
| `full_name` en `REQUIRED_FIELDS` | Sin esto, `createsuperuser` pide solo el correo y deja el nombre vacio |
| `last_login` manual | `AbstractBaseUser` no lo actualiza solo; hay que sobrescribir `update_last_login` en el manager |
| Sin `username` | `USERNAME_FIELD = "email"` hace que el campo `username` sea sobrante. Django no lo crea si no se declara |
| `deleted_at` además de `is_active` | `is_active` es un interruptor; `deleted_at` es la fecha. Un usuario desactivado por una regla de negocio no esta borrado |

### 3.2 El manager

```python
class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("El correo es obligatorio")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user
```

`use_in_migrations = True` es lo que permite `manage.py createsuperuser` y los
dumps de fixtures con usuarios validos. Sin eso, un `dumpdata` produce una
contraseáa inutilizable.

`normalize_email` de Django pasa el dominio a minusculas pero deja el usuario como
esta escrito. La comparacion la resuelve el ándice funcional sobre `lower()`, no
el manager, y por eso las dos cosas no se contradicen.

---

## 4. Tipos de Postgres que produce Django

La tabla que hay que tener a mano para no sorpreenderse en el `psql`:

| Campo de Django | Tipo en Postgres | Nota |
|---|---|---|
| `UUIDField` | `uuid` | `DEFAULT` no lo pone Postgres; lo pone Django en Python |
| `CharField(n)` | `varchar(n)` | Con `max_length` explicito siempre |
| `TextField` | `text` | Sin lámite |
| `EmailField` | `varchar(254)` | **No valida nada.** La validacián es de Django |
| `DecimalField(max_digits, decimal_places)` | `numeric(p, s)` | El orden de los argumentos esta invertido respecto a la convencion de Django |
| `PositiveIntegerField` | `integer` con `CHECK >= 0` | El `CHECK` lo genera Django |
| `IntegerField` con `MinValueValidator` | `integer` con `CHECK` | El validador crea el `CHECK` en la base |
| `DateTimeField` | `timestamptz` | Con `USE_TZ=True`, que ya es el caso |
| `DateField` | `date` | |
| `TimeField` | `time without time zone` | El horario semanal de las franjas |
| `JSONField` | `jsonb` | Django lo pide explicitamente |
| `BooleanField` | `boolean` | |
| `ForeignKey` | `integer` más `foreign key` | El `uuid` no es el `integer`: Django crea la FK con el tipo de la PK referenciada |

La última fila merece una verificacion. Con una PK `uuid`, la clave foránea
generada por Django es `uuid`, no `integer`, porque Django usa el tipo de la PK
referenciada. Si alguien espera un `integer` en `property.agent_id`, se
equivoca.

### 4.1 `time` y la zona horaria

`property_schedule_slot.start_time` y `end_time` son `TimeField`, que producen
`time without time zone`. Es correcto y es deliberado: el horario semanal es una
intencion en hora local, "los martes de 9 a 11", y `America/Lima` no cambia de
offset desde 2019.

La conversion a un instante concreto ocurre al materializar la cita, con
`zoneinfo`, según `catalogs.md` §9. Guardar la franja ya en UTC sería un error:
un "martes de 9" que se desplazara por el horario de verano de otro pais.

---

## 5. Migracián inicial: extensiones y restricciones

### 5.1 La migración 0002_extensions

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("auth", "0012_alter_user_first_name_max_length")]
    operations = [
        migrations.RunSQL(
            "CREATE EXTENSION IF NOT EXISTS btree_gist;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
```

Las dos extensiones se necesitan para las restricciones de `indexes-and-queries.md`:
`btree_gist` para el `EXCLUDE` de solapamiento, `pg_trgm` para la busqueda de texto.

`reverse_sql=migrations.RunSQL.noop` es deliberado: revertir una migración no
debe eliminar la extension del servidor. Es una dependencia del cluster, no de
esta aplicacion, y borrarla afectaria a otras bases de datos del mismo Postgres.

El `CREATE EXTENSION` requiere superusuario. El usuario de la aplicacion es
`housebroker` y probablemente no lo es. La solucion es declararlas en la
imagen del contenedor, en la seccion `postgres-initdb.d` del servicio de base de
datos de `infra/docker-compose.yml`, que se ejecuta una vez cuando el volumen se
crea.

### 5.2 La migración de restricciones

Una migración `RunSQL` por tabla, o una sola con todas. La diferencia es
practica: una sola es más rapida de revisar y más lenta de aplicar si falla a la
mitad. Por tabla es más comoda de depurar y más lenta de escribir.

```python
class Migration(migrations.Migration):
    dependencies = [("properties", "0004_property_owner")]
    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE property
                  ADD CONSTRAINT property_status_check
                  CHECK (status IN ('DISPONIBLE','RESERVADO','ALQUILADO',
                                    'VENDIDO','SUSPENDIDO')),
                  ADD CONSTRAINT property_type_check
                  CHECK (property_type IN ('DEPARTAMENTO','CASA',
                                           'TERRENO','OFICINA')),
                  ADD CONSTRAINT property_price_check CHECK (price > 0),
                  ADD CONSTRAINT property_area_check
                  CHECK ((area_total IS NULL OR area_total > 0)
                     AND (area_built IS NULL OR area_built >= 0)
                     AND (area_built IS NULL OR area_total IS NULL
                          OR area_built <= area_total));
            """,
            reverse_sql="""
                ALTER TABLE property
                  DROP CONSTRAINT property_status_check,
                  DROP CONSTRAINT property_type_check,
                  DROP CONSTRAINT property_price_check,
                  DROP CONSTRAINT property_area_check;
            """,
        ),
    ]
```

El `reverse_sql` se escribe completo. Una constraint de reversion a medias
deja el esquema en un estado que ninguna migración describe, y el error
aparece tres migraciones más adelante.

### 5.3 El `EXCLUDE` de solapamiento

Va en la migración de `appointment`, despuás de que exista el ándice
`appointment (property_id, scheduled_at)`. Postgres necesita un ándice GiST para
evaluar la restriccion de exclusion de forma eficiente.

```python
migrations.RunSQL(
    sql="""
        ALTER TABLE appointment
          ADD CONSTRAINT appointment_no_overlap
          EXCLUDE USING gist (
            property_id WITH =,
            tstzrange(scheduled_at,
                      scheduled_at + (duration_minutes || ' minutes')::interval
            ) WITH &&
          ) WHERE (status NOT IN ('CANCELLED','NO_SHOW'));
    """,
    reverse_sql="""
        ALTER TABLE appointment
          DROP CONSTRAINT appointment_no_overlap;
    """,
)
```

### 5.4 ándices: `Meta.indexes` contra `RunSQL`

Los ándices normales van en `Meta.indexes`, porque Django sabe crearlos y
borrarlos:

```python
class Property(models.Model):
    class Meta:
        indexes = [
            models.Index(
                fields=["is_active", "status", "property_type", "-created_at"],
                name="property_catalog_idx",
            ),
            models.Index(fields=["price"], name="property_price_idx"),
        ]
```

El `name` es obligatorio y es una decisión de arquitectura: Django genera nombres
automaticos que incluyen un hash del modelo y cambian si el conjunto de campos
cambia. Un nombre estable permite:

- Referenciar el ándice en una migración posterior.
- Crearlo con `CREATE INDEX CONCURRENTLY` sin renombrar.
- Verificar en una prueba de rendimiento que existe el ándice que se cree.

Los ándices **parciales**, los **funcionales** y los **GIST** van en `RunSQL`,
porque `models.Index` no tiene sintaxis para ellos. Se mantiene el nombre
explicito en las tres formas.

### 5.5 `CREATE INDEX CONCURRENTLY` y su trampa

`CREATE INDEX` bloquea escrituras en la tabla mientras construye el ándice.
`CONCURRENTLY` no bloquea, y tiene dos restricciones:

1. **No se puede ejecutar dentro de una transaccion.** Django envuelve cada
   migración en una transaccion. Hay que declarar la migración como atomica y
   correrla con `--no-transaction` o marcar `atomic = False` en la clase.
2. **No puede ir dentro de `AddIndex`.** Hay que usar `RunSQL`.

```python
class Migration(migrations.Migration):
    atomic = False

    operations = [
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY property_features_idx "
            "ON property USING gin (features jsonb_path_ops);",
            reverse_sql="DROP INDEX IF EXISTS property_features_idx;",
        ),
    ]
```

`atomic = False` desactiva la transaccion de esa migración completa. Es un
compromiso: si el `CREATE INDEX` falla a medias, hay que limpiar a mano. Por eso
Los ándices concurrentes se agregan despuás de la primera migración, cuando la tabla ya
esta en produccion y el volumen justifica el costo. `CONCURRENTLY` en una tabla
vacia es más lento que el `CREATE INDEX` normal.

### 5.6 Ejecutar migraciones

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py sqlmigrate properties 0004_property   # revisar antes de aplicar
```

`sqlmigrate` es el comando que convierte una migración en el SQL que realmente
se ejecuta. Revisar esa salida antes de aplicar es el control más barato que
existe: muestra el `CREATE INDEX`, el `ALTER TABLE` y los defaults, y detecta
un `DEFAULT` que Django cambio de tipo sin avisar.

---

## 6. Datos iniciales

### 6.1 Que va en una migración de datos

Solo dos cosas:

| Dato | Por que |
|---|---|
| El catálogo de distritos | Es estructura de referencia. Sin el, el filtro `ubigeo` no puede funcionar |
| Los valores de un `CHECK` nuevo, si se agrega una tabla de permisos | Es esquema disfrazado |

El catálogo de distritos va en `RunPython`, porque Django no tiene declaracion
nativa de datos de referencia aparte de las migraciones de datos de sus propias
apps.

```python
def seed_districts(apps, schema_editor):
    District = apps.get_model("core", "District")
    # Fuentes: INEI, Censo Nacional. Verificar antes de ejecutar.
    for row in VERIFIED_DISTRICTS:
        District.objects.update_or_create(ubigeo=row["ubigeo"], defaults=row)

def unseed_districts(apps, schema_editor):
    District = apps.get_model("core", "District")
    District.objects.filter(ubigeo__in=[r["ubigeo"] for r in VERIFIED_DISTRICTS]).delete()
```

Los dos extremos usan `apps.get_model`, no el import directo del modelo. Es un
requisito de Django en migraciones de datos: importar el modelo real hace que la
migración dependa del código actual y no del código de cuando se escribio, y
falla en cuanto ese modelo cambia.

### 6.2 El catálogo de distritos no se puede seedear todavía

`catalogs.md` §6 documenta el problema con claridad: los cádigos INEI están
escritos de memoria y hay al menos tres filas marcadas `(verificar)` donde el
número y el nombre no corresponden.

Un seed con datos incorrectos es peor que un seed vacio:

- Un `ubigeo` equivocado en la base no se detecta al cargar, sino cuando un
  cliente busca una propiedad y no aparece.
- Un distrito con el código de otro se corrige en una migración posterior, y
  mientras tanto el filtro devuelve resultados de otra zona.
- Un catálogo de 43 filas da una sensacion de completitud que no corresponde con
  la calidad del dato.

Lo que corresponde antes de escribir `seed_districts`: bajar el Censo Nacional del
INEI, extraer los 43 distritos de la provincia de Lima y los 3 de Callao,
verificar que los cádigos de 6 dágitos corresponden a la convencion INEI, y dejar
la fuente citada en un comentario.

Mientras tanto, `District` se crea vacia y el filtro `ubigeo` queda marcado como
no listo. Es un estado honesto.

### 6.3 Que va en un comando de gestion

Todo lo que es contenido de negocio y no estructura:

| Comando | Que carga |
|---|---|
| `seed_districts` | El catálogo verificado (migración o comando, según se decida) |
| `seed_demo` | Usuarios de prueba, propiedades de ejemplo, agentes, agenda |
| `seed_reference` | Enums no implementados como `CHECK` y datos de configuracián |

`seed_demo` tiene que estar en un modulo que se excluya de produccion:

```python
class Command(BaseCommand):
    help = "Carga datos de demostracion. NO ejecutar en produccion."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Ejecuta aunque el entorno no sea de desarrollo.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            self.stdout.write(self.style.ERROR(
                "Datos de demostracion bloqueados: DEBUG=False. "
                "Use --force si realmente sabe lo que hace."
            ))
            return
```

La comprobacion por defecto debe ser una condicion de salida, no un warning. Un
seed de demostracion en produccion inserta usuarios con contrasenas conocidas, y
eso no se deshace con un `DELETE`.

### 6.4 Fixtures contra comandos

| | `loaddata` | Comando de gestion |
|---|---|---|
| Sintaxis | JSON, fácil de editar a mano | Cádigo Python |
| Validacián | No hay ninguna al cargar | Cada `full_clean()` se puede llamar |
| Formato de clave primaria | Serializado fijo y fragile | Calculado |
| Dependencias entre apps | Se resuelven en orden alfabetico de etiqueta | Control explicito |
| Reversibilidad | Manual | Se puede deshacer con `--flush` |

El problema de las fixtures es el orden alfabetico: con el nombre
`0002_properties.json` antes de `0001_users.json`, las claves foráneas no existen
todavía. El formato también serializa las claves primarias con una etiqueta fija,
lo que hace que un `dumpdata` de una base de desarrollo no se pueda cargar en otra
base con datos distintos.

Para este proyecto, los comandos de gestion son la opcion correcta y las fixtures
se reservan para las pruebas.

---

## 7. Evolución del esquema

### 7.1 Agregar una columna `NOT NULL` a una tabla con datos

Es la operacián que más falla, y falla de forma destructiva. La forma segura en
cuatro pasos:

```sql
-- 1. Agregar la columna como nullable, sin default.
ALTER TABLE property ADD COLUMN rating numeric(3,2);

-- 2. Backfill.
UPDATE property SET rating = 0 WHERE rating IS NULL;

-- 3. Aplicar el NOT NULL.
ALTER TABLE property ALTER COLUMN rating SET NOT NULL;

-- 4. Aplicar el DEFAULT, para las proximas escrituras.
ALTER TABLE property ALTER COLUMN rating SET DEFAULT 0;
```

El orden importa. Un `ALTER TABLE ... ADD COLUMN x NOT NULL DEFAULT 0` en una
tabla grande reescribe la tabla entera y bloquea escrituras. En Postgres 11 y
posteriores el valor por defecto no se materializa en la tabla, pero el `NOT NULL`
si obliga a validar cada fila existente.

En Django, los pasos 2 y 3 son una migración de datos y el 4 es un
`AlterField`. La migración de datos usa `apps.get_model` y actualiza por lotes:

```python
def backfill_rating(apps, schema_editor):
    Property = apps.get_model("properties", "Property")
    Property.objects.filter(rating__isnull=True).update(rating=Decimal("0"))
```

Un `.update()` sobre toda la tabla sin `LIMIT` bloquea la tabla durante toda la
operacián. Con lotes de 1000 el costo es el mismo en total y el bloqueo se
reparte.

### 7.2 Renombrar columnas y tablas

Un renombrado directo rompe cualquier despliegue que tenga el código viejo
corriendo durante el despliegue. La secuencia segura es expandir y luego
contraer, con una ventana de compatibilidad entre ambos nombres:

1. Agregar la columna nueva, nullable, y llenarla.
2. Escribir en ambas columnas durante una versián.
3. Leer de la nueva columna, tolerando `NULL` en la vieja.
4. Dejar de escribir en la vieja.
5. Eliminarla, en una migración posterior.

Para una columna, Django no tiene soporte nativo de leer de dos columnas a la vez.
La transicián se hace en el código con un metodo que lee la nueva y cae a la
vieja si viene nula, y se retira en la siguiente versián.

Renombrar una tabla tiene el mismo problema con las claves foráneas de otras 19
tablas, y por eso no se renombra: se agrega la nueva y se migra.

### 7.3 Eliminar columnas

Django genera `DROP COLUMN`, que es instantaneo y destructivo. Con una columna
que se Whether datos personales, hay que decidir primero si se borran las filas o
solo la columna.

Ver `security-and-privacy.md` §12: la eliminacion lógica con `deleted_at` es una
decisión de negocio, no una estrategia de retencion de datos. Una columna
eliminada no borra los valores que ya estaban en los respaldos.

### 7.4 Cambiar un valor de un `CHECK`

Un enum se cambia en cuatro pasos, no en uno. Agregar un valor al `CHECK`
mientras el código viejo corre rompe las escrituras nuevas que usan el valor
nuevo, porque el código viejo no lo conoce.

```sql
-- 1. Ampliar el CHECK.
ALTER TABLE property DROP CONSTRAINT property_status_check;
ALTER TABLE property ADD CONSTRAINT property_status_check
  CHECK (status IN ('DISPONIBLE','RESERVADO','ALQUILADO','VENDIDO',
                    'SUSPENDIDO','EN_VENTA'));

-- 2. Desplegar el código que conoce 'EN_VENTA'.

-- 3. Migrar las filas que lo necesitan.

-- 4. Retirar el valor antiguo del CHECK, en una versián posterior.
```

Los pasos 1 y 4 están en migraciones distintas y en despliegues distintos. Si
estuvieran en la misma migración, el despliegue tendría que ser atomico con la
base de datos, y eso no es como se despliega un backend.

El mismo procedimiento aplica a los enums del spec y a las constantes del
frontend, como se detalla en `catalogs.md` §10.

---

## 8. Pruebas y datos de prueba

El backend no tiene factories ni fixtures de prueba. Cuando existan:

| Necesidad | Herramienta |
|---|---|
| Usuario con rol especáfico | Factory de `User` con `role` parametrizado |
| Propiedad valida mínima | Factory de `Property` con todos los campos opcionales en `None` |
| Propiedad completa | Factory de `Property` con todos los campos |
|Cita valida | Factory de `Appointment` que respeta el `EXCLUDE` de solapamiento |
| Catálogo de distritos | La migración de datos, no una fixture |

La última fila tiene una consecuencia util: las pruebas de integracion que
necesitan un distrito usan los mismos datos que produccion, porque el catálogo
viene de una migración y no de un archivo JSON que se puede desincronizar.

La factory de citas tiene que respetar el `EXCLUDE` de solapamiento. Crear dos
citas en el mismo horarioProperty en una prueba lanza `IntegrityError`, y un
`IntegrityError` en un test de servicio es una confusion: parece un fallo del
servicio cuando el fallo es del dato de prueba.

---

## 9. Lista de verificacion antes del primer despliegue

**Orden**

- [ ] `AUTH_USER_MODEL` definido en `settings.py` antes de `makemigrations`
- [ ] Migracián `0001` del usuario, con su manager
- [ ] Migracián `0002` de extensiones (`btree_gist`, `pg_trgm`)
- [ ] Cada `RunSQL` tiene su `reverse_sql`
- [ ] `sqlmigrate` revisado para cada migración con `RunSQL`

**Coherencia**

- [ ] Los `CHECK` coinciden con `catalogs.md`
- [ ] Los `DEFAULT` coinciden con `data-model.md`
- [ ] Los ándices nombrados de forma explicita, sin hash automático
- [ ] `CONCURRENTLY` solo en migraciones con `atomic = False`

**Datos**

- [ ] Catálogo de distritos verificado contra la fuente del INEI
- [ ] `seed_demo` rechaza ejecutar con `DEBUG=False`
- [ ] Ninguna migración inserta datos de demostracion

**Despliegue**

```bash
python manage.py migrate --check   # falla si hay migraciones sin aplicar
python manage.py migrate
python manage.py check --deploy    # valida la configuracián de produccion
```

`check --deploy` es el comando que detecta lo que `security-and-privacy.md` §9.3
lista: `DEBUG`, `ALLOWED_HOSTS` y las variables `SECURE_` que hoy no están
definidas en `settings.py`.

---

## 10. Nota sobre el alcance

Todo esto es plan. El backend no tiene `models.py`, ni `migrations/`, ni
`AUTH_USER_MODEL`, ni comandos de gestion. Este documento describe el estado
objetivo y el orden en que se alcanza.

Lo que si es accionable desde hoy: **definir `AUTH_USER_MODEL` antes de la
primera migración**. Es la única decisión de este documento que, si se toma
despuás, obliga a reescribir claves foráneas en 20 tablas.