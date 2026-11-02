"""Reglas de agendamiento de visitas (RF-CRM-01, TASK-BACK-CRM-01).

El contrato separa tres cosas que aquí viven juntas:

1. **Materializar la agenda semanal.** `property_schedule_slot` guarda
   intervalos recurrentes sin fecha; convertirlos en instantes concretos de una
   fecha dada es el trabajo de `available-slots` y de este módulo.
2. **Decidir qué está libre.** Una franja deja de estar disponible cuando ya
   tiene una cita que ocupa su intervalo, comparando `[start_at, end_at)` y no
   solo el instante de inicio.
3. **Crear la cita.** `POST /appointments` exige coincidencia exacta con un
   `start_at` y responde `409` si el horario se tomó entre la consulta y el
   envío.

La autoridad es del backend: el frontend replica la comprobación para evitar
un viaje de ida y vuelta, pero el bloqueo real ocurre aquí y, en PostgreSQL,
en el `EXCLUDE` de la migración de la app.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q, UUIDField
from django.utils import timezone

from apps.properties.models import Property, PropertySchedule, Weekday
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, _role_of
from apps.properties.problems import ProblemError
from apps.properties.services import schedule_timezone

from .models import (
    ACTIVE_STATUSES,
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    AppointmentStatusChange,
)

User = get_user_model()

# `openapi_spec.yaml`: la fecha va de hoy a 60 días vista adelante.
BOOKING_HORIZON_DAYS = 60
DATE_INPUT_FORMAT = "%Y-%m-%d"

# Máquina de estados de `AppointmentStatus` (RF-CRM-02). La matriz sigue la
# tabla de `docs/api/openapi_spec.yaml` (`PATCH /appointments/{id}/status`), que
# es el contrato que consume el frontend. `PENDING` nunca es destino: una cita
# nace ahí y ninguna transición válida la devuelve.
STATUS_TRANSITIONS: dict[str, frozenset[str]] = {
    AppointmentStatus.PENDING: frozenset(
        {
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.RESCHEDULED,
            AppointmentStatus.CANCELLED,
        }
    ),
    AppointmentStatus.CONFIRMED: frozenset(
        {
            AppointmentStatus.RESCHEDULED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
        }
    ),
    AppointmentStatus.RESCHEDULED: frozenset(
        {AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED}
    ),
    AppointmentStatus.COMPLETED: frozenset(),
    AppointmentStatus.CANCELLED: frozenset(),
    AppointmentStatus.NO_SHOW: frozenset(),
}

TERMINAL_STATUSES = frozenset(
    {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    }
)

# Estados que el `PATCH` admite como destino: el schema excluye `PENDING`.
STATUS_INPUT_VALUES = tuple(
    status
    for status in (
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    )
)

# `CANCELLED` y `RESCHEDULED` se comunican al cliente por correo: el motivo es
# parte del mensaje, no un campo opcional de auditoría.
REASON_REQUIRED_STATUSES = frozenset(
    {AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED}
)

STATUS_LABELS = dict(AppointmentStatus.choices)


# -------------------------------------------------------------
# Fechas e instantes
# -------------------------------------------------------------


def schedule_tz() -> ZoneInfo:
    """Zona en la que se configuraron las franjas (siempre `America/Lima`)."""
    return ZoneInfo(schedule_timezone())


def format_in_schedule_tz(value: datetime) -> str:
    return value.astimezone(schedule_tz()).strftime("%H:%M")


def format_iso_utc(value: datetime) -> str:
    """Instante en el formato `2026-10-08T16:00:00Z` del contrato."""
    return (
        value.astimezone(dt_timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def parse_date(raw, *, parameter: str = "date") -> date:
    """`'2026-10-08'` -> `date`, o `400 invalid_query_parameter`.

    El formato es estrictamente `YYYY-MM-DD`: `strptime` rechaza `08-10-2026`
    y también `20261008`, que `date.fromisoformat` llegaría a aceptar.
    """
    if raw in (None, ""):
        raise ProblemError(
            code="invalid_query_parameter",
            detail=f"El parámetro '{parameter}' es obligatorio.",
            errors=[
                {"parameter": parameter, "message": "Este parámetro es obligatorio."}
            ],
        )
    try:
        return datetime.strptime(str(raw), DATE_INPUT_FORMAT).date()
    except ValueError:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=f"El parámetro '{parameter}' debe tener formato ISO 8601 (YYYY-MM-DD).",
            errors=[
                {
                    "parameter": parameter,
                    "message": f"El valor '{raw}' no cumple el formato YYYY-MM-DD.",
                }
            ],
        )


def validate_horizon(day: date, *, parameter: str, past_detail: str, today=None) -> None:
    """Aplica el rango hoy..hoy+60 de `America/Lima`."""
    today = today or timezone.localdate()
    horizon = today + timedelta(days=BOOKING_HORIZON_DAYS)
    if day < today:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=past_detail,
            errors=[
                {
                    "parameter": parameter,
                    "message": f"El valor '{day.isoformat()}' es anterior a la fecha de hoy ({today.isoformat()}).",
                }
            ],
        )
    if day > horizon:
        raise ProblemError(
            code="invalid_query_parameter",
            detail="La fecha pedida supera el horizonte de 60 dias para agendar visitas.",
            errors=[
                {
                    "parameter": parameter,
                    "message": f"La fecha maxima admitida es {horizon.isoformat()}.",
                }
            ],
        )


# -------------------------------------------------------------
# Materialización de la agenda
# -------------------------------------------------------------


@dataclass(frozen=True)
class MaterializedSlot:
    """Franja de `property_schedule_slot` materializada en una fecha concreta."""

    start_at: datetime
    end_at: datetime
    duration_minutes: int
    schedule_slot: PropertySchedule

    def overlaps(self, other_start: datetime, other_end: datetime) -> bool:
        """Intersección no vacía de dos intervalos semiabiertos.

        `09:00-12:00` y `12:00-15:00` son contiguos, no solapados, por eso la
        comparación es estricta en los dos lados.
        """
        return self.start_at < other_end and other_start < self.end_at


def materialize_day(property_obj: Property, day: date) -> list[MaterializedSlot]:
    """Franjas activas de `day` como instantes UTC, en orden ascendente.

    `Weekday` y `date.weekday()` coinciden a propósito (lunes = 0): la
    conversión no necesita tabla de traducción. Lima no aplica horario de
    verano, así que localizar con `ZoneInfo` no admite ambigüedad.
    """
    rows = PropertySchedule.objects.filter(
        property=property_obj,
        weekday=Weekday(day.weekday()).value,
        is_active=True,
    ).order_by("start_time")

    tz = schedule_tz()
    slots = []
    for row in rows:
        start_local = datetime.combine(day, row.start_time, tzinfo=tz)
        end_local = datetime.combine(day, row.end_time, tzinfo=tz)
        slots.append(
            MaterializedSlot(
                start_at=start_local.astimezone(dt_timezone.utc),
                end_at=end_local.astimezone(dt_timezone.utc),
                duration_minutes=int(row.duration.total_seconds() // 60),
                schedule_slot=row,
            )
        )
    return slots


def _day_window(day: date) -> tuple[datetime, datetime]:
    """Día de Lima como ventana UTC, para buscar citas que lo toquen."""
    tz = schedule_tz()
    start_local = datetime.combine(day, time.min, tzinfo=tz)
    return (
        start_local.astimezone(dt_timezone.utc),
        (start_local + timedelta(days=1)).astimezone(dt_timezone.utc),
    )


def _overlapping_appointments(
    property_obj: Property,
    start: datetime,
    end: datetime,
    *,
    agent=None,
    exclude_id=None,
) -> Appointment | None:
    """Primera cita activa que ocupa `[start, end)`, o `None`.

    La consulta es la misma que impone el `EXCLUDE` de PostgreSQL, en las dos
    claves que los documentos piden (propiedad y agente): en SQLite, que es
    donde corre la suite, esta comprobación es la única garantía.

    `exclude_id` deja fuera la propia cita al reprogramarla: si no, su horario
    viejo se vería como un conflicto consigo misma.
    """
    occupied = Appointment.objects.filter(
        status__in=ACTIVE_STATUSES,
        scheduled_at__lt=end,
        end_at__gt=start,
    )
    if agent is None:
        occupied = occupied.filter(property=property_obj)
    else:
        occupied = occupied.filter(agent=agent)
    if exclude_id is not None:
        occupied = occupied.exclude(pk=exclude_id)
    return occupied.order_by("scheduled_at").first()


def available_slots(
    property_obj: Property, day: date, *, now: datetime | None = None
) -> list[MaterializedSlot]:
    """Franjas libres de `day`: descarta vencidas y ocupadas.

    Un día sin atención, con todas las franjas desactivadas o ya agotadas
    devuelve `[]`, que para el contrato significa "no hay horario ese día" y no
    "no se pudo cargar".
    """
    now = now if now is not None else timezone.now()
    candidates = [slot for slot in materialize_day(property_obj, day) if slot.start_at > now]
    if not candidates:
        return []

    window_start, window_end = _day_window(day)
    taken = list(
        Appointment.objects.filter(
            property=property_obj,
            status__in=ACTIVE_STATUSES,
            scheduled_at__lt=window_end,
            end_at__gt=window_start,
        ).values_list("scheduled_at", "end_at")
    )
    return [
        slot
        for slot in candidates
        if not any(slot.overlaps(start, end) for start, end in taken)
    ]


def available_slots_payload(
    property_obj: Property, day: date, *, now: datetime | None = None
) -> dict:
    """Cuerpo del `200` de `GET .../available-slots` (schema `AvailableSlots`)."""
    slots = available_slots(property_obj, day, now=now)
    return {
        "property_id": property_obj.id,
        "date": day.isoformat(),
        "timezone": schedule_timezone(),
        "total_slots": len(slots),
        "slots": [
            {
                "start_at": format_iso_utc(slot.start_at),
                "end_at": format_iso_utc(slot.end_at),
                "duration_minutes": slot.duration_minutes,
            }
            for slot in slots
        ],
    }


# -------------------------------------------------------------
# Alta de la cita
# -------------------------------------------------------------


def property_or_404(property_id) -> Property:
    prop = Property.objects.select_related("agent").filter(pk=property_id).first()
    if prop is None:
        raise ProblemError(
            code="resource_not_found",
            status_code=404,
            detail="No existe una propiedad con el identificador indicado.",
        )
    return prop


def _validate_bookable(prop: Property) -> None:
    if prop.is_bookable:
        return
    detail = (
        f"La propiedad esta en estado '{prop.status}' y no admite nuevas visitas."
        if prop.is_active
        else "La propiedad no esta publicada y no admite nuevas visitas."
    )
    raise ProblemError(
        code="property_not_bookable",
        detail=detail,
        errors=[
            {
                "parameter": "property_id",
                "message": "Solo se pueden agendar visitas sobre propiedades en estado DISPONIBLE.",
            }
        ],
    )


def _client_pk(value):
    """Con qué pk se puede consultar `User`, o `None` si no encaja con ella.

    `client_id` entra como lo serializa la API (`uuid`, según el contrato) o
    como el `AutoField` de `django.contrib.auth.User`, y la consulta solo es
    válida cuando el tipo coincide con el del modelo activo: cruzarlos depende
    del backend (SQLite desborda enteros fuera de rango) cuando debería ser un
    `404`, que es lo que documenta el spec para un usuario que no existe.
    """
    if isinstance(value, uuid.UUID) != isinstance(User._meta.pk, UUIDField):
        return None
    return value


def _resolve_client(actor, client_id, *, may_book_for_others: bool):
    """Quién visita: siempre el token, salvo que un agente indique `client_id`."""
    if client_id is not None and not may_book_for_others:
        # El contrato lo fija como `403`: un `CLIENTE` no agenda para otro.
        raise ProblemError(
            code="forbidden",
            status_code=403,
            detail="Un cliente no puede registrar citas en nombre de otro usuario.",
        )
    if client_id is None and may_book_for_others:
        raise ProblemError(
            code="invalid_query_parameter",
            detail="Falta 'client_id' en una reserva registrada por un agente.",
            errors=[
                {
                    "parameter": "client_id",
                    "message": (
                        "Una reserva hecha desde el panel de un agente o "
                        "administrador debe indicar el cliente que agenda."
                    ),
                }
            ],
        )
    if client_id is None:
        return actor

    pk = _client_pk(client_id)
    client = User.objects.filter(pk=pk).first() if pk is not None else None
    if client is None:
        raise ProblemError(
            code="resource_not_found",
            status_code=404,
            detail="No existe un usuario con el identificador indicado.",
        )
    return client


def _resolve_agent(prop: Property, actor, *, may_book_for_others: bool):
    """Quién atiende la visita: el agente del inmueble.

    `data-model.md` §7 recuerda que `appointment.agent` y `property.agent` son
    cosas distintas: si el inmueble no tiene agente asignado, la visita solo
    puede quedar a nombre de quien la registra desde el panel.
    """
    if prop.agent_id is not None:
        return prop.agent
    if may_book_for_others:
        return actor
    raise ProblemError(
        code="agent_assignment_required",
        detail="La propiedad no tiene un agente asignado que pueda atender la visita.",
        errors=[
            {
                "parameter": "property_id",
                "message": "Asigna un agente al inmueble antes de agendar visitas.",
            }
        ],
    )


def _match_slot(candidates: list[MaterializedSlot], scheduled_at: datetime):
    return next((slot for slot in candidates if slot.start_at == scheduled_at), None)


def _hours_list(hours: list[str]) -> str:
    """Lista al estilo del español: `14:00`, `14:00 y 16:00`, `9:00, 10:00 y 11:00`."""
    if len(hours) == 1:
        return hours[0]
    return f"{', '.join(hours[:-1])} y {hours[-1]}"


def _unmatched_message(prop: Property, day: date, scheduled_at: datetime, now) -> ProblemError:
    free = available_slots(prop, day, now=now)
    if free:
        hours = _hours_list([format_in_schedule_tz(slot.start_at) for slot in free])
        message = f"Los horarios disponibles para el {day.isoformat()} son {hours}."
    else:
        message = f"No hay horarios disponibles para el {day.isoformat()}."
    return ProblemError(
        code="invalid_query_parameter",
        detail=(
            f"El horario '{format_iso_utc(scheduled_at)}' no coincide con "
            "ninguna franja habilitada de la propiedad."
        ),
        errors=[{"parameter": "scheduled_at", "message": message}],
    )


def _slot_conflict(slot: MaterializedSlot, scheduled_at: datetime, conflict: Appointment):
    return ProblemError(
        code="appointment_slot_conflict",
        status_code=409,
        detail=(
            f"El horario '{format_iso_utc(scheduled_at)}' ya esta ocupado "
            f"por la cita {conflict.id}."
        ),
    )


def _source_for(role) -> AppointmentSource:
    if role == ROLE_AGENT:
        return AppointmentSource.AGENT
    if role == ROLE_ADMIN:
        return AppointmentSource.ADMIN
    return AppointmentSource.CLIENT_WEB


@transaction.atomic
def create_appointment(
    *,
    property_id,
    scheduled_at: datetime,
    client_id=None,
    actor,
    now: datetime | None = None,
) -> Appointment:
    """Valida y crea la cita en `PENDING`.

    El orden de las validaciones no es arbitrario: primero lo que decide si la
    petición ni siquiera aplica (propiedad, rol), después el horario, y al
    final el conflicto, que es el único que puede aparecer por una carrera con
    otra petición. El `INSERT` va en un `atomic` anidado para que una
    `IntegrityError` del índice único o del `EXCLUDE` se revierta al
    savepoint y la vista pueda responder `409` con el cuerpo documentado.
    """
    now = now if now is not None else timezone.now()
    prop = property_or_404(property_id)
    _validate_bookable(prop)

    role = _role_of(actor)
    may_book_for_others = role in (ROLE_AGENT, ROLE_ADMIN)
    client = _resolve_client(actor, client_id, may_book_for_others=may_book_for_others)
    agent = _resolve_agent(prop, actor, may_book_for_others=may_book_for_others)

    tz = schedule_tz()
    day = scheduled_at.astimezone(tz).date()
    validate_horizon(
        day,
        parameter="scheduled_at",
        past_detail="No se puede agendar una visita en una fecha pasada.",
    )
    if scheduled_at <= now:
        raise ProblemError(
            code="invalid_query_parameter",
            detail="No se puede agendar una visita en un horario que ya paso.",
            errors=[
                {
                    "parameter": "scheduled_at",
                    "message": (
                        f"El valor '{format_iso_utc(scheduled_at)}' es anterior "
                        f"a la hora actual ({format_iso_utc(now)})."
                    ),
                }
            ],
        )

    # Se compara contra la agenda materializada y no contra la disponible: un
    # horario tomado responde `409`, no `400`, porque el hueco sí existía.
    match = _match_slot(materialize_day(prop, day), scheduled_at)
    if match is None:
        raise _unmatched_message(prop, day, scheduled_at, now)

    conflict = _overlapping_appointments(
        prop, match.start_at, match.end_at
    ) or _overlapping_appointments(prop, match.start_at, match.end_at, agent=agent)
    if conflict is not None:
        raise _slot_conflict(match, scheduled_at, conflict)

    try:
        with transaction.atomic():
            return Appointment.objects.create(
                property=prop,
                client=client,
                agent=agent,
                schedule_slot=match.schedule_slot,
                scheduled_at=match.start_at,
                duration_minutes=match.duration_minutes,
                status="PENDING",
                source=_source_for(role),
            )
    except IntegrityError:
        # Doble envío simultáneo: el índice único parcial (y en PostgreSQL el
        # `EXCLUDE`) gana la carrera que la consulta previa no pudo ver.
        occupied = _overlapping_appointments(prop, match.start_at, match.end_at) or (
            _overlapping_appointments(prop, match.start_at, match.end_at, agent=agent)
        )
        if occupied is None:
            raise
        raise _slot_conflict(match, scheduled_at, occupied) from None


# -------------------------------------------------------------
# Transiciones de estado (RF-CRM-02)
# -------------------------------------------------------------


@dataclass(frozen=True)
class StatusChange:
    """Resultado de `change_appointment_status`, tal como lo ve el cliente."""

    id: object
    status: str
    previous_status: str
    scheduled_at: datetime
    previous_scheduled_at: datetime
    reason: str | None
    changed_by: object
    changed_at: datetime
    # `False` en la repetición idempotente: la vista no reenvía correos ni la
    # API finge un cambio que no ocurrió.
    changed: bool = True


def allowed_transitions(status: str) -> frozenset[str]:
    return STATUS_TRANSITIONS.get(status, frozenset())


def validate_transition(current: str, target: str) -> None:
    """Rechaza una transición que la matriz no permite.

    El caso que el contrato destaca es una cita en estado terminal: una visita
    ya `COMPLETED` no se puede cancelar. El `400` usa
    `invalid_appointment_transition`, el mismo `code` que el `PATCH` documenta.
    """
    if target in allowed_transitions(current):
        return
    if current in TERMINAL_STATUSES:
        detail = (
            f"No se puede pasar de '{current}' a '{target}'. "
            "COMPLETED, CANCELLED y NO_SHOW son estados terminales."
        )
    else:
        detail = f"No se puede pasar de '{current}' a '{target}'."
    raise ProblemError(
        code="invalid_appointment_transition",
        detail=detail,
        errors=[
            {
                "parameter": "status",
                "message": f"La transición {current} -> {target} no está permitida.",
            }
        ],
    )


def _validate_status_payload(target: str, scheduled_at) -> None:
    """Aplica la regla `scheduled_at` del contrato.

    Obligatorio al reprogramar y prohibido en cualquier otra transición, para
    que "reprogramar" y "mover una cita sin cambiar su estado" no se confundan.
    """
    if target == AppointmentStatus.RESCHEDULED and scheduled_at is None:
        raise ProblemError(
            code="invalid_query_parameter",
            detail="El campo 'scheduled_at' es obligatorio para reprogramar una cita.",
            errors=[
                {
                    "parameter": "scheduled_at",
                    "message": (
                        "Este campo es obligatorio cuando 'status' es RESCHEDULED."
                    ),
                }
            ],
        )
    if target != AppointmentStatus.RESCHEDULED and scheduled_at is not None:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=(
                "El campo 'scheduled_at' solo se admite cuando 'status' es "
                "RESCHEDULED."
            ),
            errors=[
                {
                    "parameter": "scheduled_at",
                    "message": (
                        "Enviar 'scheduled_at' solo tiene sentido junto a "
                        "'status: RESCHEDULED'."
                    ),
                }
            ],
        )


def _validate_reason(target: str, reason: str | None) -> None:
    if target in REASON_REQUIRED_STATUSES and not reason:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=(
                "El campo 'reason' es obligatorio para cancelar o reprogramar "
                "una cita."
            ),
            errors=[
                {
                    "parameter": "reason",
                    "message": (
                        "Este campo es obligatorio cuando 'status' es CANCELLED "
                        "o RESCHEDULED."
                    ),
                }
            ],
        )


def _reschedule_target(appointment: Appointment, scheduled_at: datetime, now: datetime):
    """Valida el horario nuevo y devuelve la franja materializada que le toca."""
    tz = schedule_tz()
    day = scheduled_at.astimezone(tz).date()
    validate_horizon(
        day,
        parameter="scheduled_at",
        past_detail="No se puede reprogramar una visita a una fecha pasada.",
    )
    if scheduled_at <= now:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=(
                "No se puede reprogramar una visita a un horario que ya pasó."
            ),
            errors=[
                {
                    "parameter": "scheduled_at",
                    "message": (
                        f"El valor '{format_iso_utc(scheduled_at)}' es anterior "
                        f"a la hora actual ({format_iso_utc(now)})."
                    ),
                }
            ],
        )

    match = _match_slot(materialize_day(appointment.property, day), scheduled_at)
    if match is None:
        raise _unmatched_message(
            appointment.property, day, scheduled_at, now
        )

    conflict = _overlapping_appointments(
        appointment.property,
        match.start_at,
        match.end_at,
        exclude_id=appointment.pk,
    ) or _overlapping_appointments(
        appointment.property,
        match.start_at,
        match.end_at,
        agent=appointment.agent,
        exclude_id=appointment.pk,
    )
    if conflict is not None:
        raise _slot_conflict(match, scheduled_at, conflict)
    return match


def _apply_transition(
    appointment: Appointment,
    target: str,
    match: MaterializedSlot | None,
    now: datetime,
) -> list[str]:
    """Escribe el estado y los sellos de tiempo; devuelve los `update_fields`."""
    update_fields = ["status", "updated_at"]
    appointment.status = target

    if target == AppointmentStatus.CONFIRMED:
        appointment.confirmed_at = now
        update_fields.append("confirmed_at")
    elif target == AppointmentStatus.CANCELLED:
        appointment.cancelled_at = now
        update_fields.append("cancelled_at")
    elif target == AppointmentStatus.COMPLETED:
        appointment.completed_at = now
        update_fields.append("completed_at")
    elif target == AppointmentStatus.RESCHEDULED:
        # El bloque viejo queda libre en cuanto esta fila cambia de horario,
        # porque `available-slots` solo mira los estados de `ACTIVE_STATUSES`.
        appointment.schedule_slot = match.schedule_slot
        appointment.scheduled_at = match.start_at
        appointment.duration_minutes = match.duration_minutes
        appointment.end_at = match.start_at + timedelta(
            minutes=match.duration_minutes
        )
        # Vuelve a quedar pendiente de reconfirmar.
        appointment.confirmed_at = None
        appointment.reschedule_count = (appointment.reschedule_count or 0) + 1
        update_fields.extend(
            [
                "schedule_slot",
                "scheduled_at",
                "duration_minutes",
                "end_at",
                "confirmed_at",
                "reschedule_count",
            ]
        )
    return update_fields


@transaction.atomic
def change_appointment_status(
    appointment: Appointment,
    target: str,
    *,
    scheduled_at: datetime | None = None,
    reason: str | None = None,
    actor=None,
    now: datetime | None = None,
) -> StatusChange:
    """Aplica una transición válida y deja constancia en el historial.

    Orden deliberado: primero la forma del cuerpo (`scheduled_at` y `reason`),
    después la matriz de estados, y al final el horario nuevo, que es lo único
    que puede chocar con otra cita. La idempotencia se resuelve después de
    validar la matriz: repetir el mismo `status` devuelve `200` sin fila de
    historial, sin correo y sin tocar `updated_at`.
    """
    now = now if now is not None else timezone.now()
    target = str(target)
    current = appointment.status
    cleaned_reason = (reason or "").strip() or None

    _validate_status_payload(target, scheduled_at)
    _validate_reason(target, cleaned_reason)

    if target == current:
        if (
            target == AppointmentStatus.RESCHEDULED
            and scheduled_at != appointment.scheduled_at
        ):
            # Reprogramar de nuevo exige pasar antes por CONFIRMED: la matriz
            # no admite RESCHEDULED -> RESCHEDULED con otro horario.
            validate_transition(current, target)
        return StatusChange(
            id=appointment.id,
            status=current,
            previous_status=current,
            scheduled_at=appointment.scheduled_at,
            previous_scheduled_at=appointment.scheduled_at,
            reason=cleaned_reason,
            changed_by=getattr(actor, "pk", None),
            changed_at=now,
            changed=False,
        )

    validate_transition(current, target)

    match = None
    if target == AppointmentStatus.RESCHEDULED:
        match = _reschedule_target(appointment, scheduled_at, now)

    previous_status = current
    previous_scheduled_at = appointment.scheduled_at
    update_fields = _apply_transition(appointment, target, match, now)

    try:
        with transaction.atomic():
            appointment.save(update_fields=update_fields)
    except IntegrityError:
        # Carrera con otra reprogramación: el índice único parcial o el
        # `EXCLUDE` de PostgreSQL rechazan el horario que la consulta previa no
        # llegó a ver. La vista lo traduce al `409` documentado.
        conflict = _overlapping_appointments(
            appointment.property,
            appointment.scheduled_at,
            appointment.end_at,
            exclude_id=appointment.pk,
        ) or _overlapping_appointments(
            appointment.property,
            appointment.scheduled_at,
            appointment.end_at,
            agent=appointment.agent,
            exclude_id=appointment.pk,
        )
        if conflict is None:
            raise
        raise ProblemError(
            code="appointment_slot_conflict",
            status_code=409,
            detail=(
                f"El horario '{format_iso_utc(appointment.scheduled_at)}' ya "
                f"esta ocupado por la cita {conflict.id}."
            ),
        ) from None

    change = AppointmentStatusChange.objects.create(
        appointment=appointment,
        previous_status=previous_status,
        new_status=target,
        previous_scheduled_at=previous_scheduled_at,
        new_scheduled_at=appointment.scheduled_at,
        reason=cleaned_reason,
        changed_by=actor if getattr(actor, "is_authenticated", False) else None,
        changed_at=now,
    )

    return StatusChange(
        id=appointment.id,
        status=appointment.status,
        previous_status=previous_status,
        scheduled_at=appointment.scheduled_at,
        previous_scheduled_at=previous_scheduled_at,
        reason=cleaned_reason,
        changed_by=change.changed_by_id,
        changed_at=change.changed_at,
    )
