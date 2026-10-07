"""Reglas de negocio de la disponibilidad (RF-PROP-04).

El contrato separa tres cosas que aquí viven juntas porque se necesitan
juntas: *qué transiciones existen*, *qué se puede pedir* y *cómo queda la
agenda*. Las dos primeras son reglas puras y se prueban sin base de datos; la
tercera es la que escribe.

La autoridad sigue siendo el backend. El frontend replica la matriz de
transiciones y las reglas de franja para no hacer un viaje de ida y vuelta por
un error que el usuario puede corregir sin salir del formulario, así que
cualquier cambio aquí tiene que cambiar allá también.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import time, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import (
    SLOT_MAX_DURATION,
    SLOT_MIN_DURATION,
    Property,
    PropertySchedule,
    PropertyStatus,
    PropertyStatusChange,
    Weekday,
)
from .problems import ProblemError

# `docs/database/catalogs.md` §4.2. Las diagonales vacías no son olvidos:
# `ALQUILADO -> VENDIDO` está bloqueado a propósito y `VENDIDO -> DISPONIBLE`
# también, porque deshace un cierre comercial.
STATUS_TRANSITIONS: dict[str, frozenset[str]] = {
    PropertyStatus.DISPONIBLE: frozenset({PropertyStatus.RESERVADO, PropertyStatus.SUSPENDIDO}),
    PropertyStatus.RESERVADO: frozenset(
        {PropertyStatus.DISPONIBLE, PropertyStatus.ALQUILADO, PropertyStatus.VENDIDO, PropertyStatus.SUSPENDIDO}
    ),
    PropertyStatus.ALQUILADO: frozenset({PropertyStatus.SUSPENDIDO}),
    PropertyStatus.VENDIDO: frozenset({PropertyStatus.SUSPENDIDO}),
    PropertyStatus.SUSPENDIDO: frozenset({PropertyStatus.DISPONIBLE}),
}

TERMINAL_STATUSES = frozenset({PropertyStatus.ALQUILADO, PropertyStatus.VENDIDO})

# Estados que son decisiones comerciales auditables: exigen motivo.
AUDITABLE_STATUSES = frozenset(
    {
        PropertyStatus.RESERVADO,
        PropertyStatus.ALQUILADO,
        PropertyStatus.VENDIDO,
        PropertyStatus.SUSPENDIDO,
    }
)

REASON_MIN_LENGTH = 5
REASON_MAX_LENGTH = 500

MAX_SLOTS_PER_DAY = 6
MAX_SLOTS_PER_WEEK = 28

WEEKDAY_FROM_ENUM = {choice.name: choice.value for choice in Weekday}
ENUM_FROM_WEEKDAY = {choice.value: choice.name for choice in Weekday}

SCHEDULES_TIMEZONE = "America/Lima"


def schedule_timezone() -> str:
    """Zona en la que se interpretan todas las horas de la agenda.

    El contrato la fija en `America/Lima` y le dice al frontend que no aplique
    su propia conversión sobre los valores `HH:MM`. Sale de `TIME_ZONE` para
    que el dato y el comportamiento no puedan separarse.
    """
    return getattr(settings, "TIME_ZONE", SCHEDULES_TIMEZONE) or SCHEDULES_TIMEZONE


# -------------------------------------------------------------
# Estado operativo
# -------------------------------------------------------------


@dataclass(frozen=True)
class StatusChange:
    """Resultado de `change_property_status`, tal como lo ve el cliente."""

    id: object
    status: str
    previous_status: str
    is_active: bool
    reason: str | None
    changed_by: object
    changed_at: object


def allowed_transitions(status: str) -> frozenset[str]:
    return STATUS_TRANSITIONS.get(status, frozenset())


def validate_transition(current: str, target: str) -> None:
    """Rechaza una transición que la matriz no permite.

    El ejemplo del contrato es un `400 invalid_property_transition` (la prosa
    del endpoint menciona `409` para el mismo caso, pero el ejemplo con
    `detail` y `code` es el que el frontend consume, así que se sigue el
    ejemplo). El `409` queda para el conflicto con visitas confirmadas, que es
    otro hecho y otro código (`property_state_conflict`).
    """
    if target in allowed_transitions(current):
        return
    if current in TERMINAL_STATUSES:
        detail = (
            f"No se puede pasar de '{current}' a '{target}'. "
            "Los estados VENDIDO y ALQUILADO son terminales."
        )
    else:
        detail = f"No se puede pasar de '{current}' a '{target}'."
    raise ProblemError(
        code="invalid_property_transition",
        detail=detail,
        errors=[{"parameter": "status", "message": detail}],
    )


@transaction.atomic
def change_property_status(
    property_obj: Property,
    target: str,
    reason: str | None,
    actor=None,
) -> StatusChange:
    """Aplica una transición de estado y deja constancia de ella.

    Efectos colaterales deliberados:

    - `SUSPENDIDO` baja `is_active`, que es lo que retira el inmueble del
      catálogo. `DISPONIBLE` lo vuelve a subir. Los otros estados no tocan
      `is_active`: un inmueble reservado, alquilado o vendido sigue visible,
      porque esconder el inventario genera preguntas al call center.
    - Se escribe siempre una fila en `property_status_change`. Un `409` por
      visitas confirmadas queda pendiente de TASK-BACK-CRM-01 (#93), que es
      quien sabrá cuántas hay; el resto del cambio no depende de eso.
    """
    validate_transition(property_obj.status, target)

    cleaned_reason = (reason or "").strip() or None
    if target in AUDITABLE_STATUSES and not cleaned_reason:
        raise ProblemError(
            code="invalid_query_parameter",
            detail=f"El campo 'reason' es obligatorio para pasar a '{target}'.",
            errors=[
                {
                    "parameter": "reason",
                    "message": (
                        "Este campo es obligatorio porque el cambio a "
                        f"'{target}' es una decisión comercial auditable."
                    ),
                }
            ],
        )

    previous = property_obj.status
    now = timezone.now()
    property_obj.status = target
    property_obj.is_active = target != PropertyStatus.SUSPENDIDO
    property_obj.save(update_fields=["status", "is_active", "updated_at"])

    change = PropertyStatusChange.objects.create(
        property=property_obj,
        previous_status=previous,
        new_status=target,
        reason=cleaned_reason,
        changed_by=actor if getattr(actor, "is_authenticated", False) else None,
        changed_at=now,
    )

    return StatusChange(
        id=property_obj.id,
        status=property_obj.status,
        previous_status=previous,
        is_active=property_obj.is_active,
        reason=cleaned_reason,
        changed_by=change.changed_by_id,
        changed_at=change.changed_at,
    )


# -------------------------------------------------------------
# Agenda semanal
# -------------------------------------------------------------


@dataclass(frozen=True)
class SlotInput:
    """Franja pedida, ya normalizada a `time`."""

    start_time: time
    end_time: time


# El contrato fija el patrón en `^([01]\d|2[0-3]):[0-5]\d$`, así que se valida
# la forma y no solo el rango: `9:00` no es una hora válida aunque sus partes sí
# lo sean, y aceptarla haría que el cliente aceptara algo que la base no.
HHMM_PATTERN = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def parse_hhmm(raw: str, parameter: str) -> time:
    """`'09:00'` -> `time(9, 0)`. Cualquier otra cosa es `400`."""
    match = HHMM_PATTERN.match(raw) if isinstance(raw, str) else None
    hours, minutes = (int(part) for part in match.groups()) if match else (None, None)
    if hours is None:
        raise ProblemError(
            code="invalid_time_range",
            detail=(
                f"El campo '{parameter}' debe usar el formato HH:MM en 24 horas "
                "(patrón ^([01]\\d|2[0-3]):[0-5]\\d$)."
            ),
            errors=[
                {
                    "parameter": parameter,
                    "message": (
                        f"El valor '{raw}' no cumple el formato HH:MM "
                        "(patrón ^([01]\\d|2[0-3]):[0-5]\\d$)."
                    ),
                }
            ],
        )
    return time(hours, minutes)


def slot_duration(slot: SlotInput) -> timedelta:
    start = timedelta(hours=slot.start_time.hour, minutes=slot.start_time.minute)
    end = timedelta(hours=slot.end_time.hour, minutes=slot.end_time.minute)
    return end - start


def format_hhmm(value: time) -> str:
    return f"{value.hour:02d}:{value.minute:02d}"


def validate_day(weekday: str, slots: list[SlotInput], path: str) -> None:
    """Reglas de un día: cantidad y solapamiento.

    El solapamiento se evalúa sobre intervalos semiabiertos, así que dos
    franjas que se tocan (`09:00-12:00` y `12:00-15:00`) son contiguas y
    válidas; solo se reporta intersección no vacía.
    """
    if len(slots) > MAX_SLOTS_PER_DAY:
        raise ProblemError(
            code="invalid_time_range",
            detail=(
                f"El día '{weekday}' tiene {len(slots)} franjas y el máximo "
                f"es {MAX_SLOTS_PER_DAY}."
            ),
            errors=[
                {
                    "parameter": path,
                    "message": (
                        f"{weekday} declara {len(slots)} franjas y el máximo "
                        f"por día es {MAX_SLOTS_PER_DAY}."
                    ),
                }
            ],
        )

    ordered = sorted(slots, key=lambda slot: slot.start_time)
    for index, slot in enumerate(ordered):
        duration = slot_duration(slot)
        if duration <= timedelta(0):
            raise ProblemError(
                code="invalid_time_range",
                detail=(
                    f"La franja de {weekday} tiene 'start_time' "
                    f"{format_hhmm(slot.start_time)} posterior a 'end_time' "
                    f"{format_hhmm(slot.end_time)}."
                ),
                errors=[
                    {
                        "parameter": f"{path}.slots[{index}]",
                        "message": (
                            f"'start_time' ({format_hhmm(slot.start_time)}) debe "
                            f"ser anterior a 'end_time' ({format_hhmm(slot.end_time)})."
                        ),
                    }
                ],
            )
        if duration < SLOT_MIN_DURATION:
            raise ProblemError(
                code="invalid_time_range",
                detail=(
                    f"La franja de {weekday} dura "
                    f"{int(duration.total_seconds() // 60)} minutos y el mínimo "
                    f"es {int(SLOT_MIN_DURATION.total_seconds() // 60)}."
                ),
                errors=[
                    {
                        "parameter": f"{path}.slots[{index}]",
                        "message": (
                            f"La duración de la franja "
                            f"({int(duration.total_seconds() // 60)} min) es menor "
                            f"que el mínimo "
                            f"({int(SLOT_MIN_DURATION.total_seconds() // 60)} min)."
                        ),
                    }
                ],
            )
        if duration > SLOT_MAX_DURATION:
            raise ProblemError(
                code="invalid_time_range",
                detail=(
                    f"La franja de {weekday} dura "
                    f"{int(duration.total_seconds() // 60)} minutos y el máximo "
                    f"es {int(SLOT_MAX_DURATION.total_seconds() // 60)}."
                ),
                errors=[
                    {
                        "parameter": f"{path}.slots[{index}]",
                        "message": (
                            f"La duración de la franja "
                            f"({int(duration.total_seconds() // 60)} min) excede "
                            f"el máximo "
                            f"({int(SLOT_MAX_DURATION.total_seconds() // 60)} min)."
                        ),
                    }
                ],
            )

    for index in range(1, len(ordered)):
        previous, current = ordered[index - 1], ordered[index]
        if current.start_time < previous.end_time:
            raise ProblemError(
                code="schedule_overlap",
                detail=(
                    f"Las franjas {format_hhmm(previous.start_time)}-"
                    f"{format_hhmm(previous.end_time)} y "
                    f"{format_hhmm(current.start_time)}-"
                    f"{format_hhmm(current.end_time)} de {weekday} se solapan."
                ),
                errors=[
                    {
                        "parameter": f"{path}.slots[{index}]",
                        "message": (
                            f"Se solapa con la franja "
                            f"{format_hhmm(previous.start_time)}-"
                            f"{format_hhmm(previous.end_time)}."
                        ),
                    }
                ],
            )


def validate_week(days: list[tuple[str, list[SlotInput]]]) -> None:
    """Días sin repetir y topes de la semana completa."""
    seen: set[str] = set()
    total = 0

    for index, (weekday, slots) in enumerate(days):
        if weekday in seen:
            raise ProblemError(
                code="invalid_time_range",
                detail=(
                    f"El día '{weekday}' aparece más de una vez en la "
                    "configuración semanal."
                ),
                errors=[
                    {
                        "parameter": f"days[{index}]",
                        "message": (
                            f"El día '{weekday}' está duplicado; agrupe ambas "
                            "listas de franjas en una sola entrada."
                        ),
                    }
                ],
            )
        seen.add(weekday)
        total += len(slots)
        validate_day(weekday, slots, f"days[{index}]")

    if total > MAX_SLOTS_PER_WEEK:
        raise ProblemError(
            code="invalid_time_range",
            detail=(
                f"La semana tiene {total} franjas y el máximo es "
                f"{MAX_SLOTS_PER_WEEK}."
            ),
            errors=[
                {
                    "parameter": "days",
                    "message": (
                        f"La semana declara {total} franjas y el máximo es "
                        f"{MAX_SLOTS_PER_WEEK}."
                    ),
                }
            ],
        )


@transaction.atomic
def replace_schedules(
    property_obj: Property,
    days: list[tuple[str, list[SlotInput]]],
) -> list[PropertySchedule]:
    """Reemplaza la agenda semanal completa.

    Es idempotente por diseño: el cuerpo es la nueva configuración entera. Las
    franjas que no aparecen se desactivan en vez de borrarse, para que las
    citas ya agendadas conserven su referencia; y una franja que vuelve a
    aparecer con las mismas horas recupera su `id`, que el contrato promete
    "estable entre reemplazos".

    El `409 schedule_has_bookings` del contrato necesita saber cuántas visitas
    confirmadas hay en cada franja que se desactiva, y esa tabla es de
    TASK-BACK-CRM-01 (#93). Hasta entonces el reemplazo desactiva de todos
    modos y el cliente recibe la agenda resulting, que es la información que
    puede usar para reconciliar.
    """
    validate_week(days)

    # Sin `select_for_update`: SQLite no lo soporta y la suite corre ahí. El
    # reemplazo completo va dentro de `atomic`, y en PostgreSQL la integridad la
    # garantizan el `EXCLUDE USING gist` y las claves únicas de la tabla.
    existing = list(PropertySchedule.objects.filter(property=property_obj))
    by_key = {
        (slot.weekday, format_hhmm(slot.start_time), format_hhmm(slot.end_time)): slot
        for slot in existing
    }

    kept_ids: set[object] = set()
    for weekday, slots in days:
        for slot in sorted(slots, key=lambda item: item.start_time):
            key = (
                WEEKDAY_FROM_ENUM[weekday],
                format_hhmm(slot.start_time),
                format_hhmm(slot.end_time),
            )
            stored = by_key.get(key) or PropertySchedule(property=property_obj)
            stored.weekday, stored.start_time, stored.end_time = key
            stored.is_active = True
            stored.save()
            kept_ids.add(stored.pk)

    stale = PropertySchedule.objects.filter(property=property_obj)
    if kept_ids:
        stale = stale.exclude(pk__in=kept_ids)
    stale.update(is_active=False, updated_at=timezone.now())

    return list_weekly_slots(property_obj)


def list_weekly_slots(property_obj: Property) -> list[PropertySchedule]:
    return list(
        PropertySchedule.objects.filter(property=property_obj, is_active=True).order_by(
            "weekday", "start_time"
        )
    )
