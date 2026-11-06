"""Pruebas unitarias de los servicios CRM (`apps.clients`).

Cubren la resolución de la cuenta cliente, la ficha agregada, el parseo de los
filtros del historial, la línea de tiempo de citas y transiciones, y las
observaciones de atención (HU-CRM-03 y HU-CRM-04). No pasan por HTTP: fijan la
regla en el servicio que la implementa.
"""

from datetime import timedelta

import pytest
from django.http import QueryDict
from django.utils import timezone

from apps.appointments.models import (
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.clients import services
from apps.clients.models import ClientNote
from apps.clients.tests.helpers import make_appointment, make_client_profile
from apps.properties.models import Currency, Favorite
from apps.properties.permissions import ROLE_AGENT, ROLE_CLIENT
from apps.properties.problems import ProblemError
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = [pytest.mark.django_db, pytest.mark.unit]


@pytest.fixture
def district():
    return make_district()


@pytest.fixture
def agent():
    return make_user("agente-crm", role=ROLE_AGENT)


@pytest.fixture
def client_user():
    return make_user("cliente-crm", role=ROLE_CLIENT)


@pytest.fixture
def prop(district, agent):
    return make_property(district, agent, index=1)


@pytest.fixture
def appointment(prop, client_user, agent):
    return make_appointment(
        prop, client_user, agent, timezone.now() + timedelta(days=2)
    )


# ------------------------------------------------------------------
# Resolución de la cuenta cliente
# ------------------------------------------------------------------


# Parametrización: cada caso varía raw expected y conserva el mismo resultado esperado.
@pytest.mark.parametrize(("raw", "expected"), [("12", 12), (12, 12)])
def test_parse_pk_reads_a_decimal_identifier(raw, expected):
    """UT-CRM-001 - Prueba Unitaria - _parse_pk.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._parse_pk.
    Propósito del Escenario: Un id numérico se convierte al pk entero.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services._parse_pk(raw) == expected


def test_parse_pk_rejects_a_malformed_identifier():
    """UT-CRM-002 - Prueba Unitaria - _parse_pk.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._parse_pk.
    Propósito del Escenario: Un texto que no es número ni UUID devuelve None.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services._parse_pk("no-es-un-id") is None


def test_resolve_client_returns_a_client_account(client_user):
    """UT-CRM-003 - Prueba Unitaria - resolve_client.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_client.
    Propósito del Escenario: Un cliente existente se resuelve por su id.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services.resolve_client(str(client_user.pk)) == client_user


# Parametrización: cada caso varía raw y conserva el mismo resultado esperado.
@pytest.mark.parametrize("raw", ["999999", "no-es-un-id"])
def test_resolve_client_hides_an_unknown_account(raw):
    """UT-CRM-004 - Prueba Unitaria - resolve_client.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_client.
    Propósito del Escenario: Un id inexistente o malformado responde 404.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.resolve_client(raw)

    assert exc.value.status_code == 404
    assert exc.value.code == "resource_not_found"


def test_resolve_client_rejects_an_agent_account(agent):
    """UT-CRM-005 - Prueba Unitaria - resolve_client.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_client.
    Propósito del Escenario: La ficha CRM no expone cuentas de agente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.resolve_client(str(agent.pk))

    assert exc.value.status_code == 404


def test_is_client_account_defaults_to_true_without_a_role():
    """UT-CRM-006 - Prueba Unitaria - _is_client_account.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._is_client_account.
    Propósito del Escenario: Un usuario sin rol ni evidencia es cliente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services._is_client_account(make_user("sin-rol")) is True


def test_is_client_account_excludes_an_agent_with_appointments(
    prop, client_user
):
    """UT-CRM-007 - Prueba Unitaria - _is_client_account.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._is_client_account.
    Propósito del Escenario: Figurar como agente de una cita descarta la ficha.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    reviewer = make_user("agente-sin-rol")
    make_appointment(
        prop, client_user, reviewer, timezone.now() + timedelta(days=2)
    )

    assert services._is_client_account(reviewer) is False


def test_is_client_account_excludes_an_agent_with_properties(district):
    """UT-CRM-008 - Prueba Unitaria - _is_client_account.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._is_client_account.
    Propósito del Escenario: Figurar como agente de un inmueble descarta la ficha.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    owner = make_user("agente-de-inmueble")
    make_property(district, owner, index=3)

    assert services._is_client_account(owner) is False


# ------------------------------------------------------------------
# Ficha del cliente
# ------------------------------------------------------------------


def test_account_fields_uses_the_profile_and_the_crm_data(client_user):
    """UT-CRM-009 - Prueba Unitaria - _account_fields.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._account_fields.
    Propósito del Escenario: Nombre, presupuesto y preferencias salen del perfil.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    make_client_profile(client_user)

    payload = services._account_fields(client_user)

    assert payload["full_name"] == "cliente-crm"
    assert payload["budget_currency"] == Currency.PEN
    assert payload["preferred_district"] == "Miraflores"
    assert payload["interest_level"] == 4


def test_account_fields_falls_back_to_the_username():
    """UT-CRM-010 - Prueba Unitaria - _account_fields.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._account_fields.
    Propósito del Escenario: Sin perfil usa el username y deja los extras vacíos.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    payload = services._account_fields(make_user("sin-perfil"))

    assert payload["full_name"] == "sin-perfil"
    assert payload["budget_currency"] == Currency.PEN
    assert payload["budget_min"] is None


def test_build_client_profile_summarizes_appointments_and_favorites(
    prop, client_user, agent
):
    """UT-CRM-011 - Prueba Unitaria - build_client_profile.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.build_client_profile.
    Propósito del Escenario: Resume citas, favoritos y el inmueble asociado.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    make_client_profile(client_user)
    make_appointment(
        prop, client_user, agent, timezone.now() + timedelta(days=2)
    )
    Favorite.objects.create(user=client_user, property=prop)

    payload = services.build_client_profile(client_user)

    assert payload["summary"]["appointments_total"] == 1
    assert payload["summary"]["appointments_upcoming"] == 1
    assert payload["summary"]["favorite_properties_total"] == 1
    assert payload["summary"]["properties_total"] == 1
    assert payload["associated_properties"][0]["id"] == prop.id


# ------------------------------------------------------------------
# Filtros del historial
# ------------------------------------------------------------------


def test_parse_history_filters_defaults_to_everything():
    """UT-CRM-012 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Sin parámetros no se filtra ni por tipo ni por fecha.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    filters = services.parse_history_filters({})

    assert filters == services.HistoryFilters(
        types=(), date_from=None, date_to=None
    )


def test_parse_history_filters_reads_and_deduplicates_the_types():
    """UT-CRM-013 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Acepta los tipos válidos y descarta repetidos.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    params = QueryDict("type=APPOINTMENT&type=STATUS_CHANGE&type=APPOINTMENT")

    filters = services.parse_history_filters(params)

    assert filters.types == ("APPOINTMENT", "STATUS_CHANGE")


def test_parse_history_filters_ignores_a_blank_type():
    """UT-CRM-014 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Un `type=` vacío equivale a no filtrar.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    filters = services.parse_history_filters(QueryDict("type="))

    assert filters.types == ()


def test_parse_history_filters_rejects_an_unknown_type():
    """UT-CRM-015 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Un tipo fuera del catálogo responde 400 sobre `type`.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_history_filters({"type": "PAGO"})

    assert exc.value.status_code == 400
    assert exc.value.errors[0]["parameter"] == "type"


def test_parse_history_filters_rejects_an_invalid_date():
    """UT-CRM-016 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Una fecha fuera de YYYY-MM-DD responde 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_history_filters({"dateFrom": "2026-13-01"})

    assert exc.value.errors[0]["parameter"] == "dateFrom"


def test_parse_history_filters_collects_multiple_errors():
    """UT-CRM-017 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: Dos parámetros inválidos se informan juntos.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_history_filters(
            {"type": "PAGO", "dateFrom": "2026-13-01"}
        )

    assert len(exc.value.errors) == 2
    assert "2" in exc.value.detail


def test_parse_history_filters_rejects_an_inverted_range():
    """UT-CRM-018 - Prueba Unitaria - parse_history_filters.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.parse_history_filters.
    Propósito del Escenario: `dateTo` anterior a `dateFrom` usa invalid_filter_range.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.parse_history_filters(
            {"dateFrom": "2026-10-10", "dateTo": "2026-10-01"}
        )

    assert exc.value.code == "invalid_filter_range"
    assert exc.value.errors[0]["parameter"] == "dateTo"


# ------------------------------------------------------------------
# Historial
# ------------------------------------------------------------------


def test_build_client_history_includes_the_appointment_creation(
    appointment, client_user
):
    """UT-CRM-019 - Prueba Unitaria - build_client_history.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.build_client_history.
    Propósito del Escenario: El alta de la cita aparece como entrada APPOINTMENT.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    entries = services.build_client_history(
        client_user,
        services.HistoryFilters(types=(), date_from=None, date_to=None),
    )

    assert entries.count() == 1
    assert entries[0]["type"] == "APPOINTMENT"
    assert entries[0]["scheduled_at"] == appointment.scheduled_at


def test_build_client_history_merges_and_sorts_both_event_types(
    appointment, client_user, agent
):
    """UT-CRM-020 - Prueba Unitaria - build_client_history.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.build_client_history.
    Propósito del Escenario: Citas y transiciones se ordenan de más nueva a más vieja.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    AppointmentStatusChange.objects.create(
        appointment=appointment,
        previous_status=AppointmentStatus.PENDING,
        new_status=AppointmentStatus.CONFIRMED,
        previous_scheduled_at=appointment.scheduled_at,
        new_scheduled_at=appointment.scheduled_at,
        reason="Confirmada por telefono.",
        changed_by=agent,
    )

    entries = services.build_client_history(
        client_user,
        services.HistoryFilters(types=(), date_from=None, date_to=None),
    )

    assert [entry["type"] for entry in entries] == [
        "STATUS_CHANGE",
        "APPOINTMENT",
    ]


def test_build_client_history_filters_by_type(
    appointment, client_user, agent
):
    """UT-CRM-021 - Prueba Unitaria - build_client_history.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.build_client_history.
    Propósito del Escenario: Pedir solo STATUS_CHANGE omite las altas de cita.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    AppointmentStatusChange.objects.create(
        appointment=appointment,
        previous_status=AppointmentStatus.PENDING,
        new_status=AppointmentStatus.CONFIRMED,
        previous_scheduled_at=appointment.scheduled_at,
        new_scheduled_at=appointment.scheduled_at,
        reason="Confirmada por telefono.",
        changed_by=agent,
    )

    entries = services.build_client_history(
        client_user,
        services.HistoryFilters(
            types=("STATUS_CHANGE",), date_from=None, date_to=None
        ),
    )

    assert [entry["type"] for entry in entries] == ["STATUS_CHANGE"]


def test_build_client_history_reports_the_original_schedule(
    appointment, client_user, agent
):
    """UT-CRM-022 - Prueba Unitaria - _original_scheduled_at.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._original_scheduled_at.
    Propósito del Escenario: Tras reprogramar, el alta conserva el horario inicial.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    original = appointment.scheduled_at
    moved = original + timedelta(hours=2)
    AppointmentStatusChange.objects.create(
        appointment=appointment,
        previous_status=AppointmentStatus.CONFIRMED,
        new_status=AppointmentStatus.RESCHEDULED,
        previous_scheduled_at=original,
        new_scheduled_at=moved,
        reason="Cambio de horario.",
        changed_by=agent,
    )
    appointment.scheduled_at = moved
    appointment.save(update_fields=["scheduled_at"])

    entries = services.build_client_history(
        client_user,
        services.HistoryFilters(types=("APPOINTMENT",), date_from=None, date_to=None),
    )

    assert entries[0]["scheduled_at"] == original


def test_build_client_history_applies_a_date_range(
    appointment, client_user
):
    """UT-CRM-023 - Prueba Unitaria - _apply_date_filter.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services._apply_date_filter.
    Propósito del Escenario: El rango se evalúa sobre la fecha del hecho.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    today = timezone.localdate()

    inside = services.build_client_history(
        client_user,
        services.HistoryFilters(
            types=(),
            date_from=today - timedelta(days=1),
            date_to=today + timedelta(days=1),
        ),
    )
    outside = services.build_client_history(
        client_user,
        services.HistoryFilters(
            types=(),
            date_from=today + timedelta(days=1),
            date_to=None,
        ),
    )

    assert inside.count() == 1
    assert outside.count() == 0


# ------------------------------------------------------------------
# Observaciones de atención
# ------------------------------------------------------------------


def test_list_client_notes_returns_only_live_notes_in_order(
    client_user, agent
):
    """UT-CRM-024 - Prueba Unitaria - list_client_notes.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.list_client_notes.
    Propósito del Escenario: Excluye las eliminadas y ordena por fecha descendente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    old = ClientNote.objects.create(client=client_user, author=agent, body="Antigua.")
    ClientNote.objects.filter(pk=old.pk).update(
        created_at=timezone.now() - timedelta(days=1)
    )
    new = ClientNote.objects.create(client=client_user, author=agent, body="Nueva.")
    ClientNote.objects.create(
        client=client_user,
        author=agent,
        body="Eliminada.",
        deleted_at=timezone.now(),
    )

    notes = list(services.list_client_notes(client_user))

    assert [note.id for note in notes] == [new.id, old.id]


def test_resolve_note_accepts_a_deleted_note(client_user, agent):
    """UT-CRM-025 - Prueba Unitaria - resolve_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_note.
    Propósito del Escenario: Un segundo DELETE debe poder resolver la nota borrada.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    note = ClientNote.objects.create(
        client=client_user,
        author=agent,
        body="Eliminada.",
        deleted_at=timezone.now(),
    )

    assert services.resolve_note(client_user, note.id) == note


def test_resolve_note_hides_a_note_from_another_client(client_user, agent):
    """UT-CRM-026 - Prueba Unitaria - resolve_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_note.
    Propósito del Escenario: La nota de otro cliente responde 404.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    other = make_user("otro-cliente", role=ROLE_CLIENT)
    foreign = ClientNote.objects.create(
        client=other, author=agent, body="De otro cliente."
    )

    with pytest.raises(ProblemError) as exc:
        services.resolve_note(client_user, foreign.id)

    assert exc.value.status_code == 404


def test_resolve_note_rejects_a_malformed_identifier(client_user):
    """UT-CRM-027 - Prueba Unitaria - resolve_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.resolve_note.
    Propósito del Escenario: Un id que no es UUID responde 404, no 500.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.resolve_note(client_user, "no-es-un-uuid")

    assert exc.value.status_code == 404


def test_create_client_note_sets_client_and_author(client_user, agent):
    """UT-CRM-028 - Prueba Unitaria - create_client_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.create_client_note.
    Propósito del Escenario: Cliente y autor salen del contexto, no del cuerpo.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    note = services.create_client_note(
        client_user, agent, {"body": "Seguimiento telefonico."}
    )

    assert note.client == client_user
    assert note.author == agent
    assert note.body == "Seguimiento telefonico."


def test_create_client_note_rejects_a_foreign_appointment(
    district, client_user, agent
):
    """UT-CRM-029 - Prueba Unitaria - create_client_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.create_client_note.
    Propósito del Escenario: Adjuntar la cita de otro cliente es 400.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    other_client = make_user("otro-cliente-cita", role=ROLE_CLIENT)
    other_agent = make_user("otro-agente-cita", role=ROLE_AGENT)
    other_prop = make_property(district, other_agent, index=2)
    foreign = make_appointment(
        other_prop,
        other_client,
        other_agent,
        timezone.now() + timedelta(days=2),
    )

    with pytest.raises(ProblemError) as exc:
        services.create_client_note(
            client_user,
            agent,
            {"body": "Nota.", "appointment_id": foreign.id},
        )

    assert exc.value.status_code == 400
    assert exc.value.code == "invalid_appointment_reference"


def test_soft_delete_client_note_is_idempotent(client_user, agent):
    """UT-CRM-030 - Prueba Unitaria - soft_delete_client_note.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.clients.services.soft_delete_client_note.
    Propósito del Escenario: El segundo borrado conserva la misma marca.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-CRM-03
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    note = ClientNote.objects.create(
        client=client_user, author=agent, body="Seguimiento."
    )

    first = services.soft_delete_client_note(note)
    deleted_at = first.deleted_at
    second = services.soft_delete_client_note(first)

    assert deleted_at is not None
    assert second.deleted_at == deleted_at
