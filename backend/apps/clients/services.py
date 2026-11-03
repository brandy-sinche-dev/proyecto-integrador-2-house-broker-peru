"""Consolidación de la ficha y el historial del cliente (HU-CRM-03).

La ficha reúne tres fuentes que viven en apps distintas: la cuenta y su perfil
comercial (`apps.users`, `apps.clients`), las citas (`apps.appointments`) y los
favoritos (`apps.properties`). El historial es la unión temporal de dos hechos
distintos: la creación de una cita y cada transición de estado aceptada.

El servicio concentra las consultas para que las vistas no repitan filtros ni
armen la respuesta a mano, y para que el número de `SELECT` no dependa de la
cantidad de citas del cliente:

- La ficha lee las citas con un único `values()` (sin instanciar modelos) y
  resuelve los favoritos con un `count()`.
- El historial usa `select_related` sobre los participantes y el inmueble, de
  modo que serializar cada entrada no dispara una consulta por fila.

La paginación del historial se hace sobre una lista: la unión de dos tablas no
se puede ordenar y paginar en SQL sin renunciar a `select_related`, y el
volumen por cliente es acotado. La lista es un `list` con `count()` para que
`PropertyPagination` la trate como un queryset.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.appointments.models import (
    ACTIVE_STATUSES,
    Appointment,
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.appointments.services import _client_pk
from apps.properties.models import Currency, Favorite, Property
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT, _role_of
from apps.properties.problems import ProblemError
from apps.properties.services import schedule_timezone

from .models import ClientNote

User = get_user_model()

HISTORY_TYPES = ("APPOINTMENT", "STATUS_CHANGE")
DATE_INPUT_FORMAT = "%Y-%m-%d"

ACTIVE_STATUS_VALUES = frozenset(status.value for status in ACTIVE_STATUSES)
COMPLETED_STATUS_VALUE = AppointmentStatus.COMPLETED.value


def _tz() -> ZoneInfo:
    return ZoneInfo(schedule_timezone())


def _local_day_boundary(day: date, *, next_day: bool = False) -> datetime:
    """Medianoche de `day` (o del día siguiente) en Lima, como instante UTC."""
    target = day + (timedelta(days=1) if next_day else timedelta(days=0))
    local = datetime.combine(target, time.min, tzinfo=_tz())
    return local.astimezone(dt_timezone.utc)


def _not_found() -> ProblemError:
    return ProblemError(
        code="resource_not_found",
        status_code=404,
        detail="El cliente no existe o no tiene citas asignadas a tu cuenta.",
    )


def _parse_pk(raw):
    """Convierte el `{id}` de la ruta al tipo de pk del usuario activo."""
    text = str(raw).strip()
    if text.isdecimal():
        return int(text)
    try:
        return uuid.UUID(text)
    except (AttributeError, TypeError, ValueError):
        return None


def _is_client_account(user) -> bool:
    """Distingue una cuenta `CLIENTE` de un agente o administrador.

    `_role_of` resuelve el rol desde `user.role`, el perfil de usuario o las
    banderas de staff. Un usuario sin rol declarado es un cliente por defecto
    (el registro público solo crea `CLIENTE`), salvo que aparezca como agente
    de alguna cita o inmueble: esa evidencia lo excluye de la ficha CRM.
    """
    role = _role_of(user)
    if role == ROLE_CLIENT:
        return True
    if role in (ROLE_AGENT, ROLE_ADMIN):
        return False
    if Appointment.objects.filter(agent=user).exists():
        return False
    if Property.objects.filter(agent=user).exists():
        return False
    return True


def resolve_client(raw_id):
    """La cuenta cliente del `{id}`, o `404 resource_not_found`.

    Un identificador mal formado, inexistente o que no corresponde a un cliente
    responden igual: distinguirlos permitiría enumerar cuentas.
    """
    pk = _client_pk(_parse_pk(raw_id))
    if pk is None:
        raise _not_found()
    client = (
        User.objects.select_related("profile", "client_profile")
        .filter(pk=pk)
        .first()
    )
    if client is None or not _is_client_account(client):
        raise _not_found()
    return client


def _account_fields(client) -> dict:
    profile = getattr(client, "profile", None)
    crm = getattr(client, "client_profile", None)
    full_name = (
        getattr(profile, "full_name", "") if profile is not None else ""
    ) or client.get_full_name() or client.get_username()
    return {
        "id": str(client.pk),
        "full_name": full_name,
        "email": client.email or None,
        "phone": (
            (getattr(profile, "phone", None) or None)
            if profile is not None
            else None
        ),
        "is_active": client.is_active,
        "created_at": client.date_joined,
        "updated_at": (
            crm.updated_at
            if crm is not None
            else (client.last_login or client.date_joined)
        ),
        "budget_min": crm.budget_min if crm is not None else None,
        "budget_max": crm.budget_max if crm is not None else None,
        "budget_currency": (
            crm.budget_currency if crm is not None else Currency.PEN
        ),
        "preferred_district": crm.preferred_district if crm is not None else None,
        "preferences": (crm.preferences or None) if crm is not None else None,
        "interest_level": crm.interest_level if crm is not None else None,
    }


def _appointment_rows(client):
    """Citas del cliente con los campos que la ficha necesita, en una consulta."""
    return list(
        Appointment.objects.filter(client=client).values(
            "status",
            "scheduled_at",
            "property_id",
            "property__title",
            "property__district__name",
            "property__address",
            "property__price",
            "property__currency",
            "property__property_type",
            "property__status",
            "property__is_active",
        )
    )


def _summary(rows, *, now: datetime, favorite_total: int) -> dict:
    upcoming = [
        row
        for row in rows
        if row["status"] in ACTIVE_STATUS_VALUES and row["scheduled_at"] > now
    ]
    completed = [
        row["scheduled_at"]
        for row in rows
        if row["status"] == COMPLETED_STATUS_VALUE
    ]
    return {
        "appointments_total": len(rows),
        "appointments_upcoming": len(upcoming),
        "appointments_completed": len(completed),
        "appointments_cancelled": sum(
            1 for row in rows if row["status"] == AppointmentStatus.CANCELLED.value
        ),
        "appointments_no_show": sum(
            1 for row in rows if row["status"] == AppointmentStatus.NO_SHOW.value
        ),
        "properties_total": len({row["property_id"] for row in rows}),
        "favorite_properties_total": favorite_total,
        "last_appointment_at": max(completed, default=None),
        "next_appointment_at": min(
            (row["scheduled_at"] for row in upcoming), default=None
        ),
    }


def _associated_properties(rows, *, now: datetime) -> list[dict]:
    grouped: dict = {}
    for row in rows:
        property_id = row["property_id"]
        group = grouped.get(property_id)
        if group is None:
            group = {
                "id": property_id,
                "title": row["property__title"],
                "district": row["property__district__name"],
                "address": row["property__address"],
                "price": row["property__price"],
                "currency": row["property__currency"],
                "property_type": row["property__property_type"],
                "status": row["property__status"],
                "is_active": row["property__is_active"],
                "appointments_count": 0,
                "latest": row["scheduled_at"],
                "completed": [],
                "upcoming": [],
            }
            grouped[property_id] = group
        group["appointments_count"] += 1
        if row["scheduled_at"] > group["latest"]:
            group["latest"] = row["scheduled_at"]
        if row["status"] == COMPLETED_STATUS_VALUE:
            group["completed"].append(row["scheduled_at"])
        if row["status"] in ACTIVE_STATUS_VALUES and row["scheduled_at"] > now:
            group["upcoming"].append(row["scheduled_at"])

    ordered = sorted(
        grouped.values(), key=lambda group: group["latest"], reverse=True
    )
    return [
        {
            "id": group["id"],
            "title": group["title"],
            "district": group["district"],
            "address": group["address"],
            "price": group["price"],
            "currency": group["currency"],
            "property_type": group["property_type"],
            "status": group["status"],
            "is_active": group["is_active"],
            "appointments_count": group["appointments_count"],
            "last_appointment_at": max(group["completed"], default=None),
            "next_appointment_at": min(group["upcoming"], default=None),
        }
        for group in ordered
    ]


def build_client_profile(client) -> dict:
    """Arma la respuesta completa de `GET /api/v1/clients/{id}/profile`."""
    now = timezone.now()
    rows = _appointment_rows(client)
    favorite_total = Favorite.objects.filter(user=client).count()
    payload = _account_fields(client)
    payload["summary"] = _summary(
        rows, now=now, favorite_total=favorite_total
    )
    payload["associated_properties"] = _associated_properties(rows, now=now)
    return payload


# -------------------------------------------------------------
# Historial
# -------------------------------------------------------------


@dataclass(frozen=True)
class HistoryFilters:
    types: tuple[str, ...]
    date_from: date | None
    date_to: date | None


def _raw_values(params, name: str) -> list[str]:
    values = params.getlist(name) if hasattr(params, "getlist") else None
    if values is not None:
        return values
    raw = params.get(name)
    return [] if raw is None else [raw]


def _first_value(params, name: str) -> str | None:
    for raw in _raw_values(params, name):
        return str(raw).strip()
    return None


def _collect(errors: list[dict], name: str, message: str) -> None:
    errors.append({"parameter": name, "message": message})


def _parse_types(params, errors: list[dict]) -> tuple[str, ...]:
    picked: list[str] = []
    for raw in _raw_values(params, "type"):
        value = str(raw).strip()
        if value == "":
            continue
        if value not in HISTORY_TYPES:
            _collect(
                errors,
                "type",
                f"El valor '{value}' no pertenece al conjunto permitido "
                "(APPOINTMENT, STATUS_CHANGE).",
            )
            continue
        if value not in picked:
            picked.append(value)
    return tuple(picked)


def _parse_date_param(params, name: str, errors: list[dict]) -> date | None:
    raw = _first_value(params, name)
    if raw in (None, ""):
        return None
    try:
        return datetime.strptime(raw, DATE_INPUT_FORMAT).date()
    except ValueError:
        _collect(
            errors,
            name,
            f"El valor '{raw}' no cumple el formato YYYY-MM-DD.",
        )
        return None


def _inverted_range_error(date_to: date, date_from: date) -> ProblemError:
    return ProblemError(
        code="invalid_filter_range",
        detail="El parámetro 'dateTo' no puede ser anterior a 'dateFrom'.",
        errors=[
            {
                "parameter": "dateTo",
                "message": (
                    f"El valor '{date_to.isoformat()}' es anterior a "
                    f"'dateFrom' ({date_from.isoformat()})."
                ),
            }
        ],
        title="Rango de fechas inválido",
    )


def parse_history_filters(params) -> HistoryFilters:
    """Valida `type`, `dateFrom` y `dateTo` con el sobre del contrato."""
    errors: list[dict] = []
    types = _parse_types(params, errors)
    date_from = _parse_date_param(params, "dateFrom", errors)
    date_to = _parse_date_param(params, "dateTo", errors)

    if (
        date_from is not None
        and date_to is not None
        and date_to < date_from
        and not errors
    ):
        raise _inverted_range_error(date_to, date_from)

    if errors:
        if len(errors) == 1:
            parameter = errors[0]["parameter"]
            if parameter == "type":
                detail = (
                    "El parámetro 'type' admite los valores "
                    "APPOINTMENT y STATUS_CHANGE."
                )
            else:
                detail = (
                    f"El parámetro '{parameter}' debe tener formato ISO 8601 "
                    "(YYYY-MM-DD)."
                )
        else:
            detail = (
                f"Se detectaron {len(errors)} parámetros de consulta inválidos."
            )
        raise ProblemError(
            code="invalid_query_parameter", detail=detail, errors=errors
        )

    return HistoryFilters(types=types, date_from=date_from, date_to=date_to)


def _apply_date_filter(queryset, field: str, filters: HistoryFilters):
    if filters.date_from is not None:
        queryset = queryset.filter(
            **{f"{field}__gte": _local_day_boundary(filters.date_from)}
        )
    if filters.date_to is not None:
        queryset = queryset.filter(
            **{f"{field}__lt": _local_day_boundary(filters.date_to, next_day=True)}
        )
    return queryset


class _EntryList(list):
    """Lista de entradas con `count()` para el paginador de la API."""

    def count(self) -> int:  # noqa: A003 - imita la firma de un queryset
        return len(self)


def _original_scheduled_at(appointment) -> datetime:
    """Horario que tenía la cita al crearse, antes de cualquier reprogramación.

    El alta guarda el estado en `PENDING` y el primer cambio registra en
    `previous_scheduled_at` el horario original aunque no se haya movido. Sin
    esa fila, el horario vigente es el original.
    """
    changes = list(appointment.status_changes.all())
    if not changes:
        return appointment.scheduled_at
    first = min(changes, key=lambda change: (change.changed_at, str(change.id)))
    return (
        first.previous_scheduled_at
        or first.new_scheduled_at
        or appointment.scheduled_at
    )


def build_client_history(client, filters: HistoryFilters) -> _EntryList:
    """Une creaciones de cita y transiciones de estado en una línea de tiempo.

    Cada entrada conserva el hecho tal como ocurrió (`occurred_at`, `status`,
    `scheduled_at`), mientras que `appointment` es el estado vigente de la cita
    al consultar, que es lo que el frontend enlaza al detalle.
    """
    entries: list[dict] = []

    if not filters.types or "APPOINTMENT" in filters.types:
        appointments = _apply_date_filter(
            Appointment.objects.filter(client=client)
            .select_related(
                "property__district", "client__profile", "agent__profile"
            )
            .prefetch_related("status_changes"),
            "created_at",
            filters,
        )
        for appointment in appointments:
            entries.append(
                {
                    "id": appointment.id,
                    "type": "APPOINTMENT",
                    "occurred_at": appointment.created_at,
                    "appointment": appointment,
                    "previous_status": None,
                    "status": AppointmentStatus.PENDING,
                    "scheduled_at": _original_scheduled_at(appointment),
                    "previous_scheduled_at": None,
                    "reason": None,
                    "changed_by": None,
                }
            )

    if not filters.types or "STATUS_CHANGE" in filters.types:
        changes = _apply_date_filter(
            AppointmentStatusChange.objects.filter(
                appointment__client=client
            ).select_related(
                "appointment__property__district",
                "appointment__client__profile",
                "appointment__agent__profile",
                "changed_by__profile",
            ),
            "changed_at",
            filters,
        )
        for change in changes:
            entries.append(
                {
                    "id": change.id,
                    "type": "STATUS_CHANGE",
                    "occurred_at": change.changed_at,
                    "appointment": change.appointment,
                    "previous_status": change.previous_status,
                    "status": change.new_status,
                    "scheduled_at": (
                        change.new_scheduled_at
                        or change.appointment.scheduled_at
                    ),
                    "previous_scheduled_at": change.previous_scheduled_at,
                    "reason": change.reason,
                    "changed_by": change.changed_by,
                }
            )

    entries.sort(
        key=lambda entry: (entry["occurred_at"], str(entry["id"])),
        reverse=True,
    )
    return _EntryList(entries)


# -------------------------------------------------------------
# Observaciones de atención (HU-CRM-04)
# -------------------------------------------------------------

NOTE_NOT_FOUND_DETAIL = (
    "La observación no existe o no pertenece al cliente indicado."
)


def _note_not_found() -> ProblemError:
    return ProblemError(
        code="resource_not_found",
        status_code=404,
        detail=NOTE_NOT_FOUND_DETAIL,
    )


def _parse_note_pk(raw):
    """Convierte `{note_id}` a UUID; un valor malformado es un `404`."""
    try:
        return uuid.UUID(str(raw).strip())
    except (AttributeError, TypeError, ValueError):
        return None


def list_client_notes(client):
    """Notas vivas del cliente, de la más reciente a la más antigua.

    `select_related` evita una consulta por nota al serializar el autor y la
    cita. El orden coincide con el índice `(client, -created_at)` del modelo y
    desempata por `id` para que la paginación sea estable.
    """
    return (
        ClientNote.objects.filter(client=client, deleted_at__isnull=True)
        .select_related("author__profile", "appointment")
        .order_by("-created_at", "-id")
    )


def resolve_note(client, raw_note_id):
    """La nota del cliente, incluida la ya eliminada lógicamente.

    Incluir `deleted_at` es lo que permite que un segundo `DELETE` devuelva
    `204` en vez de `404`. La nota de otro cliente no se distingue de una
    inexistente.
    """
    pk = _parse_note_pk(raw_note_id)
    if pk is None:
        raise _note_not_found()
    note = (
        ClientNote.objects.select_related("author__profile", "appointment")
        .filter(pk=pk, client=client)
        .first()
    )
    if note is None:
        raise _note_not_found()
    return note


def create_client_note(client, author, data):
    """Crea la nota fijando cliente y autor desde fuera del cuerpo."""
    appointment_id = data.get("appointment_id")
    if appointment_id is not None:
        belongs = Appointment.objects.filter(
            pk=appointment_id, client=client
        ).exists()
        if not belongs:
            raise ProblemError(
                code="invalid_appointment_reference",
                detail=(
                    "La cita indicada no existe o no está asociada al cliente."
                ),
                errors=[
                    {
                        "parameter": "appointment_id",
                        "message": "La cita indicada no pertenece a este cliente.",
                    }
                ],
            )
    return ClientNote.objects.create(client=client, author=author, **data)


def soft_delete_client_note(note):
    """Marca la nota como eliminada sin borrarla de la base."""
    if note.deleted_at is not None:
        return note
    note.deleted_at = timezone.now()
    note.save(update_fields=["deleted_at"])
    return note
