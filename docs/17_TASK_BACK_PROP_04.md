# [TASK-BACK-PROP-04] Estado operativo, agenda de franjas y permisos de disponibilidad

**Issue:** #86 · **Assignee:** Anderson Villanes · **Est.:** 8 h
**Labels:** backend, api, database · **Sprint:** 3

Contrato: `docs/api/openapi_spec.yaml` v1.3.0 (`updatePropertyStatus`,
`getPropertySchedules`, `replacePropertySchedules`). Modelo:
`docs/database/data-model.md` §2.5-2.6 y `docs/database/catalogs.md` §4.

## 1. Objetivo

Dar al agente la capacidad de cambiar el estado operativo de un inmueble y de
declarar las franjas en las que admite visitas, cerrando la parte de servidor
de `RF-PROP-04`. La parte de cliente (`TASK-FRONT-PROP-04`, ya entregada)
monta el panel; esta tarea le da los tres endpoints que el panel consume.

El comportamiento que se implementa, en una frase: el estado gobierna la
visibilidad del catálogo, y el estado y la agenda se escriben solo cuando quien
los escribe tiene autoridad comercial sobre ese inmueble concreto.

## 2. Cambios implementados

| Archivo | Cambio |
| ------- | ------ |
| `models.py` | `Property.is_bookable`; `Weekday` (`smallint` 0=LUNES…6=DOMINGO); `PropertySchedule` (`property_schedule_slot`); `PropertyStatusChange` (`property_status_change`, append-only). |
| `migrations/0002_property_availability.py` | **Nuevo.** Crea las dos tablas y agrega el `EXCLUDE USING gist` con `RunPython`, solo en PostgreSQL. |
| `services.py` | **Nuevo.** `STATUS_TRANSITIONS`, `validate_transition`, `change_property_status`, `parse_hhmm`, `validate_day`, `validate_week`, `replace_schedules`, `list_weekly_slots`. |
| `problems.py` | **Nuevo.** `ProblemError` y `problem_exception_handler`: normaliza toda excepción de DRF al sobre RFC 7807 del contrato. |
| `permissions.py` | **Nuevo.** `IsPropertyAgentOrAdmin` y `_role_of`. |
| `serializers.py` | `status`/`is_bookable` en `PropertySerializer`; serializers de entrada y salida de estado y de agenda; `StrictFieldsSerializer`. |
| `views.py` | Acciones `status` (`PATCH`) y `schedules` (`GET`/`PUT`); `get_availability_object()`; `ProblemResponseMixin`. |
| `admin.py` | Admin de los dos modelos, con el historial en solo lectura. |
| `config/settings.py` | `REST_FRAMEWORK["EXCEPTION_HANDLER"]`. |
| `tests/helpers.py` | **Nuevo.** `make_district`, `make_user`, `make_property`, `make_week`. |
| `tests/test_availability.py` | **Nuevo.** 69 pruebas por HTTP: estado, cascada, agenda y permisos. |
| `tests/test_availability_rules.py` | **Nuevo.** 35 pruebas de reglas puras e invariantes de modelo. |

### 2.1 La matriz de transiciones vive en el backend

`STATUS_TRANSITIONS` es la autoridad y sale de `catalogs.md` §4.2, con los
bloqueos deliberados: `ALQUILADO → VENDIDO` y `VENDIDO → DISPONIBLE` no están,
porque deshacen un cierre comercial. El frontend replica la matriz para no
hacer un viaje de ida y vuelta por un error que el usuario puede corregir sin
salir del formulario, así que cualquier cambio en este diccionario tiene que
cambiar allá también.

El estado y la visibilidad se escriben juntos en una transacción
(`change_property_status`): `SUSPENDIDO` baja `is_active`, que es lo que retira
el inmueble del catálogo, y `DISPONIBLE` lo vuelve a subir. Los estados
`RESERVADO`, `ALQUILADO` y `VENDIDO` **no** tocan `is_active`: el inmueble sigue
visible, porque esconder inventario genera preguntas al call center. El
historial se escribe siempre en la misma transacción, así que no hay un estado
cambiado sin rastro.

### 2.2 Por qué `PropertyStatusChange` es append-only

`save()` lanza `ValueError` si la fila ya existe. Un `UPDATE` sobre el historial
sería un bug silencioso: nadie que consulte "por qué está suspendido" espera
encontrar la respuesta reescrita. La corrección se inserta como una fila nueva.
Los `CHECK` de la tabla (`new_status` del enum, `previous_status` distinto de
`new_status`) apuntan en la base, no solo en Python.

### 2.3 La agenda se reemplaza, no se borra

`replace_schedules` es idempotente: el cuerpo del `PUT` es la configuración
semanal **entera**. Dos decisiones:

* Las franjas que desaparecen del cuerpo se **desactivan** (`is_active=false`) en
  lugar de borrarse, para que las citas ya agendadas conserven la referencia.
* Una franja que vuelve a aparecer con las mismas horas recupera su `id`, que es
  lo que promete el contrato ("estable entre reemplazos"). La clave de
  emparejamiento es `(weekday, start_time, end_time)`.

El solapamiento se evalúa sobre intervalos **semiabiertos**: `09:00-12:00` y
`12:00-15:00` son contiguas y válidas, y solo se reporta intersección no vacía.
En PostgreSQL eso lo impone el `EXCLUDE USING gist` sobre
`tsrange(start_time, end_time, '[)')` de la migración 0002; en SQLite, que es
donde corre la suite, la misma regla la aplican `PropertySchedule.clean()` y
`services.validate_day()`, que es además la que produce el mensaje de error con
`parameter: days[0].slots[1]`.

El `GET` devuelve **siempre los siete días**, con `slots: []` en los que no
tienen, ordenados de lunes a domingo. Así el cliente no tiene que distinguir
"este día no tiene franjas" de "todavía no cargó".

### 2.4 El permiso decide `401` y `403` por separado

`IsPropertyAgentOrAdmin` sustituye a `IsAuthenticated` en estas acciones porque
necesita distinguir dos cosas que DRF separa mal: si no hay sesión responde
`401`, y si la hay pero no alcanza responde `403`. Con `IsAuthenticated` delante,
el `401` **nunca sale**: DRF degrada `NotAuthenticated` a `403` cuando el
autenticador no ofrece desafío, y `SessionAuthentication` no ofrece ninguno. El
cliente no puede distinguir "cerrá sesión" de "no tenés permiso", que son dos
pantallas distintas.

La decisión de fondo es "es el agente asignado o es administrador":

| Usuario | Resultado |
| ------- | --------- |
| Agente asignado al inmueble | `200` |
| Administrador (`role` o `is_staff`) | `200`, incluso sin agente asignado |
| Otro agente | `403` + `required_roles: [AGENTE, ADMINISTRADOR]` |
| `CLIENTE` | `403`, incluso si por error de datos fuera el `agent` de la fila |
| Sin rol declarado | Solo el inmueble que tiene asignado |
| Inmueble sin agente asignado | Nadie salvo un administrador |
| Anónimo | `401` |

El último caso es el que evita que el endpoint sea una escalada para cualquier
usuario autenticado. `has_object_permission` es donde se resuelve el agente
asignado: DRF ya trajo el inmueble con `get_object()`, así que el permiso no
repite el `SELECT` y un `403` nunca se confunde con el `404` de un inmueble que
no existe.

El `403` lleva `required_roles` porque el schema `ProblemForbidden` lo define
como extensión opcional, y permite que el frontend diga "solo administradores
pueden hacer esto" en vez de un error genérico.

### 2.5 Un permiso, dos verbos

`GET` y `PUT` de la agenda viven en **una sola acción** `schedules`. No es
estética: el router de DRF genera una ruta por acción, y dos rutas con el mismo
`url_path` se resuelven en orden, así que la primera en registrar se queda con la
URL y la segunda nunca recibe su método. Con dos acciones separadas, todos los
`PUT` respondían `405`.

## 3. Cascada al catálogo público

`Property.is_bookable` y los campos `status` / `is_bookable` de
`PropertySerializer` son la cascada. `is_bookable` es `is_active and status ==
DISPONIBLE`, y responde exactamente la pregunta del frontend: ¿puede este
inmueble recibir una visita? El botón de reserva se oculta cuando es `false`.

El endpoint de disponibilidad **no** filtra por `is_active`: un inmueble
suspendido tiene que seguir siendo editable, porque reactivarlo es justamente
una de las transiciones. El `404` del catálogo público y el `200` del panel del
agente son decisiones distintas sobre la misma fila, y por eso el action resuelve
el objeto a mano en vez de usar `get_queryset()`.

## 4. Pruebas

* `python manage.py test apps.properties` → **114 pruebas en verde** (10 previas
  del catálogo + 104 nuevas).
* `python manage.py makemigrations --check --dry-run` → `No changes detected`.
* `python manage.py check` → sin problemas.

Reparto:

| Suite | Pruebas | Qué fija |
| ----- | ------: | ------- |
| `test_availability.py` | 69 | Códigos, cuerpos, `Content-Type`, efectos observables en el catálogo y permisos de los tres endpoints. |
| `test_availability_rules.py` | 35 | Matriz de transiciones, `HH:MM`, límites de franja, traducción del enum, append-only y `is_bookable`. |

Casos que vale la pena nombrar porque fijan decisiones y no resultados:

1. `test_suspension_takes_the_property_out_of_the_catalog` — la suspensión sale
   del listado y el detalle pasa a `404`, en la misma prueba.
2. `test_reserving_keeps_the_property_visible_in_the_catalog` — lo contrario:
   `RESERVADO` sigue en el catálogo. Es la diferencia entre las dos filas de la
   tabla del contrato.
3. `test_repeated_put_keeps_the_slot_id_stable` — el `id` de una franja sobrevive
   a dos `PUT` con el mismo cuerpo.
4. `test_removed_slots_are_deactivated_not_deleted` — la franja que sale del
   cuerpo queda en la base con `is_active=false`, no desaparece.
5. `test_contiguous_slots_are_valid` frente a `test_overlapping_slots_are_rejected`
   — la frontera exacta de `tsrange(..., '[)')`.
6. `test_permission_is_checked_before_the_payload` — un `403` no filtra si el
   cuerpo era válido, y una petición prohibida no deja rastro en el historial.
7. `test_another_agent_receives_forbidden_with_the_roles_the_contract_lists` —
   el `403` trae `code: forbidden` y `required_roles`.
8. `test_anonymous_is_asked_to_authenticate_on_every_endpoint` — `401` en los
   tres, que es el comportamiento que motivó §2.4.
9. `test_catalog_exposes_status_and_is_bookable` — la cascada viaja al cliente.
10. `test_no_status_can_transition_to_itself` — invariante de la matriz completa,
    no de un par de estados.

## 5. Criterios de aceptación

| Criterio | Resultado |
| -------- | --------- |
| `PATCH /properties/{id}/status` valida la transición y devuelve `previous_status` | ✅ `update_status` + `change_property_status` |
| `reason` obligatorio (5-500) en los estados auditables | ✅ `AUDITABLE_STATUSES` + `PropertyStatusInputSerializer` |
| `SUSPENDIDO` desactiva y `DISPONIBLE` reactiva | ✅ en la misma transacción que el cambio de estado |
| Historial de cambios de estado | ✅ `property_status_change`, append-only |
| `GET`/`PUT` de la agenda con franjas `HH:MM` | ✅ 7 días siempre, `HH:MM` estricto |
| Validación de solapamiento, duración, topes por día y por semana | ✅ `validate_day` / `validate_week` + `EXCLUDE USING gist` |
| Solo agente asignado o administrador | ✅ `IsPropertyAgentOrAdmin` |
| Cascada al catálogo público | ✅ `is_bookable` en la respuesta del catálogo |
| Pruebas en verde | ✅ 114 pruebas |

## 6. Desviaciones del contrato y pendientes

Tres desviaciones, todas deliberadas y con la ubicación del razonamiento:

1. **Campos aditivos en `Property`.** `status` e `is_bookable` se añadieron al
   schema `Property` del spec, que no los declara. Sin ellos la cascada no tiene
   por dónde viajar al cliente, y el frontend de `TASK-FRONT-PROP-04` ya los
   consume. El cambio es aditivo: no altera ningún campo existente.

2. **Transición no permitida: `400`, no `409`.** La prosa del endpoint dice
   `409` y el ejemplo del mismo endpoint dice `400 invalid_property_transition`.
   Se sigue el ejemplo, que es lo que el frontend consume. Los dos `409`
   pendientes (`property_state_conflict` y `schedule_has_bookings`) son otro
   hecho —visitas confirmadas en la franja afectada— y dependen de las tablas de
   CRM, así que quedan para `TASK-BACK-CRM-01` (#93).

3. **`property_id` del payload de agenda.** El ejemplo del contrato lo muestra
   como uuid y así se devuelve.

Pendientes conocidos:

* **Rol del usuario.** `_role_of()` lee `user.role` cuando exista y, hasta que
  llegue el usuario propio de `docs/database/migrations-and-seeding.md` §3, cae
  a `is_staff`/`is_superuser` para la rama de administrador. Las pruebas fijan el
  rol en la instancia porque es lo que lee el permiso.
* **`select_for_update` ausente en `replace_schedules`.** SQLite no lo soporta y
  la suite corre ahí. En PostgreSQL la integridad la garantizan el
  `EXCLUDE USING gist` y las claves únicas de la tabla.
* **`required_roles` como lista fija.** Cuando exista el JWT, el `403` podrá
  distinguir "rol insuficiente" de "no eres el agente asignado", que son los dos
  ejemplos del contrato.

## 7. Notas y trazabilidad

* Historia: `docs/scrum/sprint-3/planning.md` (`TASK-BACK-PROP-04`).
* Contrato: `docs/api/openapi_spec.yaml` v1.3.0.
* Modelo de datos: `docs/database/data-model.md` §2.5-2.6.
* Estados y transiciones: `docs/database/catalogs.md` §4.1-4.2.
* Índices: `docs/database/indexes-and-queries.md`.
* Estrategia de migraciones: `docs/database/migrations-and-seeding.md`.
* Precedente documental: `docs/16_TASK_WPO_PROP_03.md`.