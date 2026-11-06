"""Pruebas unitarias de los servicios de agendamiento (`apps.appointments`).

Fijan la lógica de negocio sin pasar por HTTP: parseo de fechas, horizonte de
reserva, materialización de la agenda semanal, disponibilidad, alta de citas
(RF-CRM-01) y las transiciones con historial (RF-CRM-02). Se aíslan de la capa
REST para que un fallo apunte al servicio y no al serializador.
"""

from datetime import date, datetime, time, timedelta
from types import SimpleNamespace
from unittest import mock
from zoneinfo import ZoneInfo

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.appointments import services
from apps.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.properties.models import PropertySchedule
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.problems import ProblemError
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = [pytest.mark.django_db, pytest.mark.unit]

LIMA = ZoneInfo("America/Lima")
UTC = ZoneInfo("UTC")


def at(day, hour, minute=0):
    """Instante UTC de una hora local de Lima."""
    return datetime.combine(day, time(hour, minute), tzinfo=LIMA).astimezone(UTC)


def add_slot(prop, day, start, end, *, is_active=True):
    return PropertySchedule.objects.create(
        property=prop,
        weekday=day.weekday(),
        start_time=time.fromisoformat(start),
        end_time=time.fromisoformat(end),
        is_active=is_active,
    )


@pytest.fixture
def day():
    return timezone.localdate() + timedelta(days=2)


@pytest.fixture
def district():
    return make_district()


@pytest.fixture
def agent():
    return make_user("agente-citas", role=ROLE_AGENT)


@pytest.fixture
def client_user():
    return make_user("cliente-citas", role=ROLE_CLIENT)


@pytest.fixture
def admin():
    return make_user("admin-citas", role=ROLE_ADMIN)


@pytest.fixture
def prop(district, agent):
    return make_property(district, agent, index=1)


# ------------------------------------------------------------------
# Fechas e instantes
# ------------------------------------------------------------------


def test_parse_date_reads_an_iso_date():
    """UT-CIT-001 - Prueba Unitaria - parse_date.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.parse_date.
    Propósito del Escenario: Convierte YYYY-MM-DD estricto a `date`.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services.parse_date("2026-10-08") == date(2026, 10, 8)


# Parametrización: cada caso varía raw y conserva el mismo resultado esperado.
@pytest.mark.parametrize("raw", [None, ""])
def test_parse_date_requires_a_value(raw):
    """UT-CIT-002 - Prueba Unitaria - parse_date.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.parse_date.
    Propósito del Escenario: Sin valor responde 400 sobre el parámetro.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_date(raw, parameter="date")

    assert exc.value.status_code == 400
    assert exc.value.errors[0]["parameter"] == "date"


# Parametrización: cada caso varía raw y conserva el mismo resultado esperado.
@pytest.mark.parametrize("raw", ["08-10-2026", "20261008", "2026-13-01"])
def test_parse_date_rejects_a_non_iso_format(raw):
    """UT-CIT-003 - Prueba Unitaria - parse_date.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.parse_date.
    Propósito del Escenario: Rechaza formatos distintos de YYYY-MM-DD.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_date(raw, parameter="date")

    assert exc.value.code == "invalid_query_parameter"
    assert exc.value.errors[0]["parameter"] == "date"


def test_validate_horizon_accepts_today_and_the_last_day():
    """UT-CIT-004 - Prueba Unitaria - validate_horizon.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.validate_horizon.
    Propósito del Escenario: Acepta los extremos hoy..hoy+60.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    today = date(2026, 10, 8)

    services.validate_horizon(
        today, parameter="date", past_detail="pasado", today=today
    )
    services.validate_horizon(
        today + timedelta(days=60),
        parameter="date",
        past_detail="pasado",
        today=today,
    )


def test_validate_horizon_rejects_a_past_date():
    """UT-CIT-005 - Prueba Unitaria - validate_horizon.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.validate_horizon.
    Propósito del Escenario: Una fecha anterior a hoy es 400 sobre el parámetro.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    today = date(2026, 10, 8)

    with pytest.raises(ProblemError) as exc:
        services.validate_horizon(
            today - timedelta(days=1),
            parameter="date",
            past_detail="No se puede agendar en el pasado.",
            today=today,
        )

    assert exc.value.errors[0]["parameter"] == "date"
    assert "pasado" in exc.value.detail


def test_validate_horizon_rejects_a_date_beyond_sixty_days():
    """UT-CIT-006 - Prueba Unitaria - validate_horizon.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.validate_horizon.
    Propósito del Escenario: Una fecha fuera del horizonte de 60 días es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    today = date(2026, 10, 8)

    with pytest.raises(ProblemError) as exc:
        services.validate_horizon(
            today + timedelta(days=61),
            parameter="date",
            past_detail="pasado",
            today=today,
        )

    assert "60" in exc.value.detail


# ------------------------------------------------------------------
# Materialización y disponibilidad
# ------------------------------------------------------------------


def test_materialize_day_returns_active_slots_in_order(prop, day):
    """UT-CIT-007 - Prueba Unitaria - materialize_day.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.materialize_day.
    Propósito del Escenario: Convierte las franjas activas y las ordena.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "09:00", "10:00")
    add_slot(prop, day, "16:00", "17:00", is_active=False)

    slots = services.materialize_day(prop, day)

    assert [slot.start_at for slot in slots] == [at(day, 9), at(day, 14)]
    assert [slot.duration_minutes for slot in slots] == [60, 60]


def test_available_slots_excludes_occupied_slots(prop, day, client_user, agent):
    """UT-CIT-008 - Prueba Unitaria - available_slots.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.available_slots.
    Propósito del Escenario: Una cita activa ocupa su franja y la descarta.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "16:00", "17:00")
    Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    slots = services.available_slots(prop, day)

    assert [slot.start_at for slot in slots] == [at(day, 16)]


def test_available_slots_excludes_slots_that_already_started(prop, day):
    """UT-CIT-009 - Prueba Unitaria - available_slots.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.available_slots.
    Propósito del Escenario: Las franjas vencidas no se ofrecen.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "10:00", "11:00")
    add_slot(prop, day, "14:00", "15:00")

    slots = services.available_slots(prop, day, now=at(day, 12))

    assert [slot.start_at for slot in slots] == [at(day, 14)]


def test_available_slots_is_empty_without_a_schedule(prop, day):
    """UT-CIT-010 - Prueba Unitaria - available_slots.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.available_slots.
    Propósito del Escenario: Un día sin agenda devuelve lista vacía.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services.available_slots(prop, day) == []


def test_available_slots_payload_has_the_contract_shape(prop, day):
    """UT-CIT-011 - Prueba Unitaria - available_slots_payload.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.available_slots_payload.
    Propósito del Escenario: El cuerpo expone propiedad, fecha, zona y franjas.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    payload = services.available_slots_payload(prop, day)

    assert payload["property_id"] == prop.id
    assert payload["date"] == day.isoformat()
    assert payload["timezone"] == "America/Lima"
    assert payload["total_slots"] == 1
    assert payload["slots"][0]["duration_minutes"] == 60


# ------------------------------------------------------------------
# Alta de la cita
# ------------------------------------------------------------------


def test_create_appointment_books_the_matching_slot(prop, day, client_user):
    """UT-CIT-012 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Una reserva válida nace PENDING y con su agente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    appointment = services.create_appointment(
        property_id=prop.id, scheduled_at=at(day, 14), actor=client_user
    )

    assert appointment.status == AppointmentStatus.PENDING
    assert appointment.client == client_user
    assert appointment.agent == prop.agent
    assert appointment.source == AppointmentSource.CLIENT_WEB
    assert appointment.duration_minutes == 60
    assert appointment.end_at == at(day, 15)


def test_create_appointment_uses_the_agent_source(prop, day, agent, client_user):
    """UT-CIT-013 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un agente reserva para un cliente y deja su fuente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    appointment = services.create_appointment(
        property_id=prop.id,
        scheduled_at=at(day, 14),
        client_id=str(client_user.pk),
        actor=agent,
    )

    assert appointment.client == client_user
    assert appointment.source == AppointmentSource.AGENT


def test_create_appointment_uses_the_admin_source(prop, day, admin, client_user):
    """UT-CIT-014 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un administrador reserva y su fuente es ADMIN.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    appointment = services.create_appointment(
        property_id=prop.id,
        scheduled_at=at(day, 14),
        client_id=str(client_user.pk),
        actor=admin,
    )

    assert appointment.source == AppointmentSource.ADMIN


def test_create_appointment_rejects_an_unknown_property(day, client_user):
    """UT-CIT-015 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un id inexistente responde 404.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=999999, scheduled_at=at(day, 14), actor=client_user
        )

    assert exc.value.status_code == 404
    assert exc.value.code == "resource_not_found"


def test_create_appointment_rejects_a_non_bookable_property(
    district, agent, day, client_user
):
    """UT-CIT-016 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un inmueble no reservable devuelve 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    reserved = make_property(district, agent, index=2, status="RESERVADO")

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=reserved.id, scheduled_at=at(day, 14), actor=client_user
        )

    assert exc.value.code == "property_not_bookable"


def test_create_appointment_requires_a_client_for_an_agent(prop, day, agent):
    """UT-CIT-017 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un agente debe indicar a qué cliente agenda.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id, scheduled_at=at(day, 14), actor=agent
        )

    assert exc.value.errors[0]["parameter"] == "client_id"


def test_create_appointment_forbids_a_client_booking_for_another(
    prop, day, client_user
):
    """UT-CIT-018 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un cliente no puede agendar para otro usuario.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    other = make_user("otro-cliente", role=ROLE_CLIENT)

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id,
            scheduled_at=at(day, 14),
            client_id=str(other.pk),
            actor=client_user,
        )

    assert exc.value.status_code == 403
    assert exc.value.code == "forbidden"


def test_create_appointment_requires_an_assigned_agent(
    district, day, client_user
):
    """UT-CIT-019 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Sin agente en el inmueble no se puede agendar.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    orphan = make_property(district, None, index=2)
    add_slot(orphan, day, "14:00", "15:00")

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=orphan.id, scheduled_at=at(day, 14), actor=client_user
        )

    assert exc.value.code == "agent_assignment_required"


def test_create_appointment_rejects_a_time_that_already_passed(prop, day, client_user):
    """UT-CIT-020 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un horario anterior a `now` es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "10:00", "11:00")

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id,
            scheduled_at=at(day, 10),
            actor=client_user,
            now=at(day, 12),
        )

    assert exc.value.errors[0]["parameter"] == "scheduled_at"


def test_create_appointment_rejects_a_time_outside_the_schedule(prop, day, client_user):
    """UT-CIT-021 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un horario que no inicia una franja es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id, scheduled_at=at(day, 15), actor=client_user
        )

    assert exc.value.errors[0]["parameter"] == "scheduled_at"


def test_unmatched_message_lists_the_free_hours(prop, day, client_user):
    """UT-CIT-022 - Prueba Unitaria - _unmatched_message.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services._unmatched_message.
    Propósito del Escenario: Con varias franjas libres las enumera en español.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "16:00", "17:00")

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id, scheduled_at=at(day, 15), actor=client_user
        )

    assert "14:00 y 16:00" in exc.value.errors[0]["message"]


def test_create_appointment_rejects_an_occupied_slot_with_409(
    prop, day, client_user, agent
):
    """UT-CIT-023 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Una franja ya tomada responde 409, no 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id, scheduled_at=at(day, 14), actor=client_user
        )

    assert exc.value.status_code == 409
    assert exc.value.code == "appointment_slot_conflict"


def test_create_appointment_maps_an_integrity_error_to_409(prop, day, client_user):
    """UT-CIT-024 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: La carrera del INSERT se traduce al 409 documentado.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    conflict = SimpleNamespace(id="conflicto")

    with mock.patch.object(
        services, "_overlapping_appointments", side_effect=[None, None, conflict]
    ), mock.patch.object(
        Appointment.objects, "create", side_effect=IntegrityError
    ):
        with pytest.raises(ProblemError) as exc:
            services.create_appointment(
                property_id=prop.id, scheduled_at=at(day, 14), actor=client_user
            )

    assert exc.value.status_code == 409
    assert "conflicto" in exc.value.detail


# ------------------------------------------------------------------
# Transiciones de estado
# ------------------------------------------------------------------


# Parametrización: cada caso varía ("origin y conserva el mismo resultado esperado.
@pytest.mark.parametrize(
    ("origin", "target"),
    [
        (origin, target)
        for origin, targets in services.STATUS_TRANSITIONS.items()
        for target in targets
    ],
)
def test_validate_transition_accepts_every_documented_edge(origin, target):
    """UT-CIT-025 - Prueba Unitaria - validate_transition.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.validate_transition.
    Propósito del Escenario: Acepta cada arista de la matriz RF-CRM-02.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    services.validate_transition(origin, target)


def test_validate_transition_rejects_a_transition_from_a_terminal_state():
    """UT-CIT-026 - Prueba Unitaria - validate_transition.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.validate_transition.
    Propósito del Escenario: Una cita COMPLETED no se puede cancelar.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.validate_transition(
            AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED
        )

    assert exc.value.code == "invalid_appointment_transition"


def test_change_appointment_status_confirms_and_records_history(
    prop, day, client_user, agent
):
    """UT-CIT-027 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Confirmar sella `confirmed_at` y deja historial.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    result = services.change_appointment_status(
        appointment, AppointmentStatus.CONFIRMED, actor=agent
    )

    appointment.refresh_from_db()
    change = AppointmentStatusChange.objects.get(appointment=appointment)
    assert result.changed is True
    assert appointment.status == AppointmentStatus.CONFIRMED
    assert appointment.confirmed_at is not None
    assert change.previous_status == AppointmentStatus.PENDING
    assert change.new_status == AppointmentStatus.CONFIRMED


def test_change_appointment_status_is_idempotent(prop, day, client_user, agent):
    """UT-CIT-028 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Repetir el mismo estado no duplica historial.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    services.change_appointment_status(
        appointment, AppointmentStatus.CONFIRMED, actor=agent
    )
    again = services.change_appointment_status(
        appointment, AppointmentStatus.CONFIRMED, actor=agent
    )

    assert again.changed is False
    assert AppointmentStatusChange.objects.filter(appointment=appointment).count() == 1


def test_change_appointment_status_requires_a_reason_to_cancel(
    prop, day, client_user, agent
):
    """UT-CIT-029 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Cancelar exige un motivo comunicable al cliente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    with pytest.raises(ProblemError) as exc:
        services.change_appointment_status(
            appointment, AppointmentStatus.CANCELLED, reason="   ", actor=agent
        )

    assert exc.value.errors[0]["parameter"] == "reason"


def test_change_appointment_status_reschedules_to_a_free_slot(
    prop, day, client_user, agent
):
    """UT-CIT-030 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Reprogramar mueve la cita, suma el contador y audita.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "16:00", "17:00")
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.CONFIRMED,
        confirmed_at=timezone.now(),
    )

    result = services.change_appointment_status(
        appointment,
        AppointmentStatus.RESCHEDULED,
        scheduled_at=at(day, 16),
        reason="El cliente pidio otro horario.",
        actor=agent,
    )

    appointment.refresh_from_db()
    change = AppointmentStatusChange.objects.get(appointment=appointment)
    assert result.status == AppointmentStatus.RESCHEDULED
    assert appointment.scheduled_at == at(day, 16)
    assert appointment.reschedule_count == 1
    assert appointment.confirmed_at is None
    assert change.previous_scheduled_at == at(day, 14)
    assert change.new_scheduled_at == at(day, 16)


def test_change_appointment_status_requires_a_new_time_to_reschedule(
    prop, day, client_user, agent
):
    """UT-CIT-031 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: RESCHEDULED sin `scheduled_at` es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.CONFIRMED,
    )

    with pytest.raises(ProblemError) as exc:
        services.change_appointment_status(
            appointment,
            AppointmentStatus.RESCHEDULED,
            reason="Cambio de horario.",
            actor=agent,
        )

    assert exc.value.errors[0]["parameter"] == "scheduled_at"


def test_change_appointment_status_rejects_a_time_on_another_transition(
    prop, day, client_user, agent
):
    """UT-CIT-032 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: `scheduled_at` solo se admite al reprogramar.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    with pytest.raises(ProblemError) as exc:
        services.change_appointment_status(
            appointment,
            AppointmentStatus.CONFIRMED,
            scheduled_at=at(day, 16),
            actor=agent,
        )

    assert exc.value.errors[0]["parameter"] == "scheduled_at"


def test_change_appointment_status_rejects_a_repeated_reschedule(
    prop, day, client_user, agent
):
    """UT-CIT-033 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: RESCHEDULED -> RESCHEDULED con otro horario es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.RESCHEDULED,
    )

    with pytest.raises(ProblemError) as exc:
        services.change_appointment_status(
            appointment,
            AppointmentStatus.RESCHEDULED,
            scheduled_at=at(day, 16),
            reason="Segundo cambio.",
            actor=agent,
        )

    assert exc.value.code == "invalid_appointment_transition"


def test_change_appointment_status_rejects_rescheduling_to_the_past(
    prop, day, client_user, agent
):
    """UT-CIT-034 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Reprogramar a un horario ya pasado es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "10:00", "11:00")
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.CONFIRMED,
    )

    with pytest.raises(ProblemError) as exc:
        services.change_appointment_status(
            appointment,
            AppointmentStatus.RESCHEDULED,
            scheduled_at=at(day, 10),
            reason="Cambio de horario.",
            actor=agent,
            now=at(day, 12),
        )

    assert exc.value.errors[0]["parameter"] == "scheduled_at"


def test_change_appointment_status_maps_an_integrity_error_to_409(
    prop, day, client_user, agent
):
    """UT-CIT-035 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: La carrera al reprogramar se traduce al 409.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "16:00", "17:00")
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.CONFIRMED,
    )
    conflict = SimpleNamespace(id="conflicto-nuevo")

    with mock.patch.object(
        services, "_overlapping_appointments", side_effect=[None, None, conflict]
    ), mock.patch.object(appointment, "save", side_effect=IntegrityError):
        with pytest.raises(ProblemError) as exc:
            services.change_appointment_status(
                appointment,
                AppointmentStatus.RESCHEDULED,
                scheduled_at=at(day, 16),
                reason="Cambio de horario.",
                actor=agent,
            )

    assert exc.value.status_code == 409
    assert "conflicto-nuevo" in exc.value.detail


def test_change_appointment_status_without_actor_leaves_changed_by_empty(
    prop, day, client_user, agent
):
    """UT-CIT-036 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Un cambio sin actor no inventa autor en el historial.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    result = services.change_appointment_status(
        appointment, AppointmentStatus.CONFIRMED, actor=None
    )

    assert result.changed_by is None


def test_create_appointment_lets_an_agent_book_on_an_unassigned_property(
    district, day, agent, client_user
):
    """UT-CIT-037 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Sin agente en el inmueble, el agente que agenda atiende.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    orphan = make_property(district, None, index=2)
    add_slot(orphan, day, "14:00", "15:00")

    appointment = services.create_appointment(
        property_id=orphan.id,
        scheduled_at=at(day, 14),
        client_id=str(client_user.pk),
        actor=agent,
    )

    assert appointment.agent == agent


def test_unmatched_message_without_free_hours_is_explicit(
    prop, day, client_user, agent
):
    """UT-CIT-038 - Prueba Unitaria - _unmatched_message.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services._unmatched_message.
    Propósito del Escenario: Sin franjas libres el mensaje lo dice sin horas.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
    )

    with pytest.raises(ProblemError) as exc:
        services.create_appointment(
            property_id=prop.id, scheduled_at=at(day, 15), actor=client_user
        )

    assert "No hay horarios disponibles" in exc.value.errors[0]["message"]


def test_create_appointment_reraises_an_unexplained_integrity_error(
    prop, day, client_user
):
    """UT-CIT-039 - Prueba Unitaria - create_appointment.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.create_appointment.
    Propósito del Escenario: Un IntegrityError sin conflicto visible no se enmascara.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-01
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")

    with mock.patch.object(
        services, "_overlapping_appointments", side_effect=[None, None, None, None]
    ), mock.patch.object(
        Appointment.objects, "create", side_effect=IntegrityError
    ):
        with pytest.raises(IntegrityError):
            services.create_appointment(
                property_id=prop.id, scheduled_at=at(day, 14), actor=client_user
            )


def test_change_appointment_status_reraises_an_unexplained_integrity_error(
    prop, day, client_user, agent
):
    """UT-CIT-040 - Prueba Unitaria - change_appointment_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.appointments.services.change_appointment_status.
    Propósito del Escenario: Un IntegrityError sin conflicto visible no se enmascara.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-02
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    add_slot(prop, day, "14:00", "15:00")
    add_slot(prop, day, "16:00", "17:00")
    appointment = Appointment.objects.create(
        property=prop,
        client=client_user,
        agent=agent,
        scheduled_at=at(day, 14),
        duration_minutes=60,
        status=AppointmentStatus.CONFIRMED,
    )

    with mock.patch.object(
        services, "_overlapping_appointments", side_effect=[None, None, None, None]
    ), mock.patch.object(appointment, "save", side_effect=IntegrityError):
        with pytest.raises(IntegrityError):
            services.change_appointment_status(
                appointment,
                AppointmentStatus.RESCHEDULED,
                scheduled_at=at(day, 16),
                reason="Cambio de horario.",
                actor=agent,
            )
