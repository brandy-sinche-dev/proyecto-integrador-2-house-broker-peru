"""Pruebas unitarias de los servicios de dominio de `apps.properties`.

Cubren la lógica de negocio que no depende de HTTP: la generación del código
`PROP-*`, la resolución del distrito a partir de la dirección, la máquina de
estados operativos (HU-PROP-01) y el reemplazo idempotente de la agenda
semanal (RF-PROP-04). Se aíslan de la capa REST para fijar el error en el
servicio, que es donde vive la regla.
"""

from datetime import time

import pytest

from apps.properties import services
from apps.properties.models import (
    PropertySchedule,
    PropertyStatus,
    PropertyStatusChange,
)
from apps.properties.permissions import ROLE_AGENT
from apps.properties.problems import ProblemError
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = [pytest.mark.django_db, pytest.mark.unit]


@pytest.fixture
def district():
    return make_district()


@pytest.fixture
def prop(district):
    return make_property(district, None, index=1)


@pytest.fixture
def agent():
    return make_user("agente-propiedades", role=ROLE_AGENT)


# ------------------------------------------------------------------
# Código de propiedad
# ------------------------------------------------------------------


def test_next_property_code_starts_at_one():
    """UT-PROP-045 - Prueba Unitaria - next_property_code.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.next_property_code.
    Propósito del Escenario: Sin propiedades, el primer código es PROP-00001.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services.next_property_code() == "PROP-00001"


def test_next_property_code_uses_the_highest_suffix(district):
    """UT-PROP-046 - Prueba Unitaria - next_property_code.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.next_property_code.
    Propósito del Escenario: Continúa desde el mayor sufijo numérico existente.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    make_property(district, code="PROP-00041", index=1)
    make_property(district, code="PROP-00007", index=2)

    assert services.next_property_code() == "PROP-00042"


def test_next_property_code_ignores_codes_without_a_numeric_suffix(district):
    """UT-PROP-047 - Prueba Unitaria - next_property_code.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.next_property_code.
    Propósito del Escenario: Un código no numérico no altera la secuencia.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    make_property(district, code="PROP-CASA", index=1)

    assert services.next_property_code() == "PROP-00001"


# ------------------------------------------------------------------
# Resolución del distrito
# ------------------------------------------------------------------


def test_resolve_district_matches_a_district_name_in_the_address(district):
    """UT-PROP-048 - Prueba Unitaria - resolve_district.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.resolve_district.
    Propósito del Escenario: La dirección menciona el distrito activo y se resuelve.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    assert services.resolve_district("Av. Larco 123, Miraflores") == district


def test_resolve_district_ignores_inactive_districts():
    """UT-PROP-049 - Prueba Unitaria - resolve_district.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.resolve_district.
    Propósito del Escenario: Un distrito inactivo no cuenta como coincidencia.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    inactive = make_district(ubigeo="150101", name="Lima")
    inactive.is_active = False
    inactive.save(update_fields=["is_active"])

    with pytest.raises(ProblemError) as exc:
        services.resolve_district("Av. Lima 100")

    assert exc.value.status_code == 400
    assert exc.value.code == "invalid_query_parameter"
    assert exc.value.errors[0]["parameter"] == "address"


def test_resolve_district_prefers_the_longest_name():
    """UT-PROP-050 - Prueba Unitaria - resolve_district.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.resolve_district.
    Propósito del Escenario: Con dos coincidencias gana el nombre más específico.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    make_district(ubigeo="150131", name="San Isidro")
    longest = make_district(ubigeo="150132", name="San Isidro Labrador")

    assert services.resolve_district("Calle San Isidro Labrador 10") == longest


# ------------------------------------------------------------------
# Máquina de estados operativos
# ------------------------------------------------------------------


def test_change_property_status_moves_and_records_history(prop, agent):
    """UT-PROP-051 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: Aplica una transición válida y deja constancia.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    result = services.change_property_status(
        prop, PropertyStatus.RESERVADO, "Reserva en firme", actor=agent
    )

    prop.refresh_from_db()
    change = PropertyStatusChange.objects.get(property=prop)
    assert prop.status == PropertyStatus.RESERVADO
    assert result.previous_status == PropertyStatus.DISPONIBLE
    assert result.changed_by == agent.pk
    assert change.reason == "Reserva en firme"


def test_change_property_status_to_suspendido_deactivates_the_property(prop, agent):
    """UT-PROP-052 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: Pasar a SUSPENDIDO retira el inmueble del catálogo.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    services.change_property_status(
        prop, PropertyStatus.SUSPENDIDO, "Retiro temporal", actor=agent
    )

    prop.refresh_from_db()
    assert prop.is_active is False


def test_change_property_status_to_disponible_reactivates_the_property(prop, agent):
    """UT-PROP-053 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: Volver a DISPONIBLE reactiva el inmueble.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    services.change_property_status(
        prop, PropertyStatus.SUSPENDIDO, "Retiro temporal", actor=agent
    )
    services.change_property_status(
        prop, PropertyStatus.DISPONIBLE, None, actor=agent
    )

    prop.refresh_from_db()
    assert prop.status == PropertyStatus.DISPONIBLE
    assert prop.is_active is True


def test_change_property_status_requires_a_reason_for_auditable_states(prop, agent):
    """UT-PROP-054 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: RESERVADO es auditable y exige un motivo real.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    with pytest.raises(ProblemError) as exc:
        services.change_property_status(
            prop, PropertyStatus.RESERVADO, "   ", actor=agent
        )

    assert exc.value.errors[0]["parameter"] == "reason"


def test_change_property_status_rejects_a_terminal_transition(district, agent):
    """UT-PROP-055 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: VENDIDO es terminal y no vuelve a DISPONIBLE.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    sold = make_property(district, None, index=2, status=PropertyStatus.VENDIDO)

    with pytest.raises(ProblemError) as exc:
        services.change_property_status(
            sold, PropertyStatus.DISPONIBLE, "Reabrir venta", actor=agent
        )

    assert exc.value.code == "invalid_property_transition"


def test_change_property_status_without_actor_leaves_changed_by_empty(prop):
    """UT-PROP-056 - Prueba Unitaria - change_property_status.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.change_property_status.
    Propósito del Escenario: Un cambio sin actor autenticado no inventa autor.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    result = services.change_property_status(
        prop, PropertyStatus.RESERVADO, "Reserva en firme", actor=None
    )

    assert result.changed_by is None


# ------------------------------------------------------------------
# Reemplazo de la agenda semanal
# ------------------------------------------------------------------


def test_replace_schedules_creates_the_week(prop):
    """UT-PROP-057 - Prueba Unitaria - replace_schedules.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.replace_schedules.
    Propósito del Escenario: Un día con una franja crea el bloque esperado.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    result = services.replace_schedules(
        prop, [("LUNES", [services.SlotInput(time(9, 0), time(10, 0))])]
    )

    assert len(result) == 1
    assert result[0].weekday == 0
    assert result[0].start_time == time(9, 0)


def test_replace_schedules_is_idempotent_and_keeps_ids(prop):
    """UT-PROP-058 - Prueba Unitaria - replace_schedules.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.replace_schedules.
    Propósito del Escenario: Reemplazar con la misma agenda conserva los `id`.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    days = [("LUNES", [services.SlotInput(time(9, 0), time(10, 0))])]

    first = services.replace_schedules(prop, days)
    second = services.replace_schedules(prop, days)

    assert [slot.id for slot in first] == [slot.id for slot in second]


def test_replace_schedules_deactivates_missing_slots(prop):
    """UT-PROP-059 - Prueba Unitaria - replace_schedules.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.replace_schedules.
    Propósito del Escenario: Una franja ausente se desactiva, no se borra.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    services.replace_schedules(
        prop, [("LUNES", [services.SlotInput(time(9, 0), time(10, 0))])]
    )

    result = services.replace_schedules(
        prop, [("MARTES", [services.SlotInput(time(11, 0), time(12, 0))])]
    )

    assert len(result) == 1
    assert result[0].weekday == 1
    assert PropertySchedule.objects.filter(property=prop, is_active=False).count() == 1


def test_replace_schedules_reactivates_a_slot_with_the_same_hours(prop):
    """UT-PROP-060 - Prueba Unitaria - replace_schedules.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.replace_schedules.
    Propósito del Escenario: Una franja que vuelve recupera su `id` estable.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    days = [("LUNES", [services.SlotInput(time(9, 0), time(10, 0))])]

    first = services.replace_schedules(prop, days)
    services.replace_schedules(prop, [])
    again = services.replace_schedules(prop, days)

    assert again[0].id == first[0].id


def test_list_weekly_slots_returns_only_active_slots(prop):
    """UT-PROP-061 - Prueba Unitaria - list_weekly_slots.

    Tipo de Prueba: [Prueba Unitaria] Servicio de dominio, sin HTTP.
    Módulo y Entidad: apps.properties.services.list_weekly_slots.
    Propósito del Escenario: La agenda vigente excluye los bloques desactivados.
    Código HTTP Esperado: N/A (no hay endpoint HTTP).
    Requisito: RF-PROP-04
    Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
    """
    services.replace_schedules(
        prop, [("LUNES", [services.SlotInput(time(9, 0), time(10, 0))])]
    )
    services.replace_schedules(prop, [])

    assert services.list_weekly_slots(prop) == []
