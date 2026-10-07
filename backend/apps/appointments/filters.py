"""Filtros del listado `GET /api/v1/appointments` (RF-CRM-02, TASK-BACK-CRM-02).

La colección replica el contrato del catálogo en lo que comparten: validación
acumulativa (`errors` con todas las entradas inválidas de una petición), un
parámetro vacío = omitido, y el rango de fechas invertido respondiendo
`invalid_filter_range` en vez de `invalid_query_parameter`.

Lo que el listado agrega es la **perspectiva**: el alcance depende del rol del
token y del parámetro `role`, y el filtrado por `scheduled_at` usa la ventana
del día en `America/Lima`, no el instante del parámetro.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.db.models import QuerySet

from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.problems import ProblemError
from apps.properties.services import schedule_timezone
from apps.users.models import Role

from .models import STATUS_VALUES

ROLE_VALUES = [choice[0] for choice in Role.choices]

DATE_INPUT_FORMAT = "%Y-%m-%d"


def _tz() -> ZoneInfo:
    return ZoneInfo(schedule_timezone())


def _local_day_boundary(day: date, *, next_day: bool = False) -> datetime:
    """Medianoche de `day` (o del día siguiente) en Lima, como instante UTC."""
    target = day + (timedelta(days=1) if next_day else timedelta(days=0))
    local = datetime.combine(target, time.min, tzinfo=_tz())
    return local.astimezone(dt_timezone.utc)


@dataclass(frozen=True)
class AppointmentFilters:
    role: str | None
    statuses: tuple[str, ...]
    date_from: date | None
    date_to: date | None


def _collect(errors, name: str, message: str) -> None:
    errors.append({"parameter": name, "message": message})


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


def _parse_role(params, errors: list[dict]) -> str | None:
    raw = _first_value(params, "role")
    if raw in (None, ""):
        return None
    if raw not in ROLE_VALUES:
        _collect(errors, "role", _role_message(raw))
        return None
    return raw


def _role_message(value: str) -> str:
    return (
        f"El valor '{value}' no pertenece al conjunto permitido "
        f"({', '.join(ROLE_VALUES)})."
    )


def _parse_statuses(params, errors: list[dict]) -> tuple[str, ...]:
    picked = []
    for raw in _raw_values(params, "status"):
        value = str(raw).strip()
        if value == "":
            continue
        if value not in STATUS_VALUES:
            _collect(errors, "status", _status_message(value))
            continue
        if value not in picked:
            picked.append(value)
    return tuple(picked)


def _status_message(value: str) -> str:
    return (
        f"El valor '{value}' no pertenece al conjunto permitido "
        f"({', '.join(STATUS_VALUES)})."
    )


def _parse_date_param(params, name: str, errors: list[dict]) -> date | None:
    raw = _first_value(params, name)
    if raw in (None, ""):
        return None
    try:
        return datetime.strptime(raw, DATE_INPUT_FORMAT).date()
    except ValueError:
        _collect(errors, name, _date_message(raw))
        return None


def _date_message(value: str) -> str:
    return f"El valor '{value}' no cumple el formato YYYY-MM-DD."


def _inverted_range_error(date_to: date, date_from: date) -> ProblemError:
    """`dateTo` anterior a `dateFrom`: `invalid_filter_range`, no query param."""
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


def parse_appointment_filters(params) -> AppointmentFilters:
    errors: list[dict] = []
    role = _parse_role(params, errors)
    statuses = _parse_statuses(params, errors)
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
            if parameter == "status":
                detail = (
                    "El parámetro 'status' admite los valores "
                    f"{', '.join(STATUS_VALUES)}."
                )
            elif parameter == "role":
                detail = (
                    "El parámetro 'role' admite los valores "
                    f"{', '.join(ROLE_VALUES)}."
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
        raise ProblemError(code="invalid_query_parameter", detail=detail, errors=errors)

    return AppointmentFilters(role=role, statuses=statuses, date_from=date_from, date_to=date_to)


def default_role(user) -> str:
    """Perspectiva de un usuario sin `role` explícito.

    Todo usuario autenticado existe como cliente en sus propias citas, y
    `ADMINISTRADOR`/`AGENTE` vienen del perfil o de `is_staff`; si ambos fallan,
    el alcance más chico sigue siendo válido y no bloquea el listado.
    """
    from apps.properties.permissions import _role_of

    return _role_of(user) or ROLE_CLIENT


def check_role_scope(user_role: str | None, requested_role: str | None) -> None:
    """Un rol no puede leer la perspectiva de otro (salvo el administrador)."""
    if requested_role == ROLE_ADMIN and user_role != ROLE_ADMIN:
        raise ProblemError(
            code="forbidden",
            status_code=403,
            detail=_scope_detail(user_role),
            extras={"required_roles": [ROLE_ADMIN]},
        )
    if requested_role == ROLE_AGENT and user_role not in (ROLE_AGENT, ROLE_ADMIN):
        raise ProblemError(
            code="forbidden",
            status_code=403,
            detail=_scope_detail(user_role),
            extras={"required_roles": [ROLE_AGENT]},
        )


def _scope_detail(user_role: str | None) -> str:
    if user_role == ROLE_AGENT:
        return "El rol AGENTE solo puede consultar las citas que tiene asignadas."
    return "El rol CLIENTE solo puede consultar sus propias citas."


def apply_appointment_filters(
    queryset: QuerySet, *, role: str, user, filters: AppointmentFilters
) -> QuerySet:
    if role == ROLE_AGENT:
        queryset = queryset.filter(agent=user)
    elif role != ROLE_ADMIN:
        queryset = queryset.filter(client=user)

    if filters.statuses:
        queryset = queryset.filter(status__in=filters.statuses)
    if filters.date_from is not None:
        queryset = queryset.filter(scheduled_at__gte=_local_day_boundary(filters.date_from))
    if filters.date_to is not None:
        queryset = queryset.filter(scheduled_at__lt=_local_day_boundary(filters.date_to, next_day=True))
    return queryset