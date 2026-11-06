"""Pruebas Pytest de citas de visita (RF-CRM-01 / RF-CRM-02).

Cubren la agenda pública de horarios, el alta de la cita, el listado por rol y
la máquina de estados, incluyendo los `409` de conflicto y la liberación del
horario al cancelar.
"""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone
from rest_framework import status

from apps.appointments.models import (
    Appointment,
    AppointmentSource,
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.properties.models import PropertySchedule, PropertyStatus
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = pytest.mark.django_db

APPOINTMENTS = "/api/v1/appointments"
LIMA = ZoneInfo("America/Lima")
UTC = ZoneInfo("UTC")


def iso_at(day, hour, minute=0):
    instant = datetime.combine(day, time(hour, minute), tzinfo=LIMA)
    return instant.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def slots_url(prop):
    return f"/api/v1/properties/{prop.id}/available-slots"


def add_slots(prop, day, *ranges):
    for start, end in ranges:
        PropertySchedule.objects.create(
            property=prop,
            weekday=day.weekday(),
            start_time=time.fromisoformat(start),
            end_time=time.fromisoformat(end),
        )


def make_appointment(prop, client, agent, scheduled_at, **overrides):
    return Appointment.objects.create(
        property=prop,
        client=client,
        agent=agent,
        scheduled_at=scheduled_at,
        duration_minutes=overrides.pop("duration_minutes", 60),
        status=overrides.pop("status", AppointmentStatus.PENDING),
        **overrides,
    )


@pytest.fixture
def day():
    return timezone.localdate() + timedelta(days=1)


@pytest.fixture
def next_day(day):
    return day + timedelta(days=1)


@pytest.fixture
def district(db):
    return make_district()


@pytest.fixture
def agent(db):
    return make_user("agente", role=ROLE_AGENT)


@pytest.fixture
def other_agent(db):
    return make_user("otro-agente", role=ROLE_AGENT)


@pytest.fixture
def admin(db):
    return make_user("admin", role=ROLE_ADMIN)


@pytest.fixture
def client_user(db):
    return make_user("cliente", role=ROLE_CLIENT)


@pytest.fixture
def other_client(db):
    return make_user("otro-cliente", role=ROLE_CLIENT)


@pytest.fixture
def prop(district, agent, day, next_day):
    property_obj = make_property(district, agent, index=1)
    add_slots(
        property_obj,
        day,
        ("14:00", "15:00"),
        ("16:00", "17:00"),
    )
    add_slots(property_obj, next_day, ("14:00", "15:00"))
    return property_obj


# ===== TestAvailableSlots: grupo de pruebas de available slots =====
class TestAvailableSlots:
    @pytest.mark.integration
    def test_public_endpoint_returns_free_slots(self, api, prop, day):
        """IT-CIT-083 - Prueba de Integración — AvailableSlotsView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsView.
        Propósito del Escenario: Camino feliz: publica los horarios libres del día con zona America/Lima.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(slots_url(prop), {"date": day.isoformat()})

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["property_id"] == str(prop.id)
        assert body["date"] == day.isoformat()
        assert body["timezone"] == "America/Lima"
        assert body["total_slots"] == 2
        assert [slot["start_at"] for slot in body["slots"]] == [
            iso_at(day, 14),
            iso_at(day, 16),
        ]

    @pytest.mark.integration
    def test_day_without_schedule_returns_an_empty_list(self, api, prop, day):
        """IT-CIT-084 - Prueba de Integración — AvailableSlotsView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsView.
        Propósito del Escenario: Borde: un día sin agenda responde con total_slots=0 y lista vacía.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        body = api.get(
            slots_url(prop), {"date": (day + timedelta(days=2)).isoformat()}
        ).json()

        assert body["total_slots"] == 0
        assert body["slots"] == []

    # Parametrización: cada caso varía params y conserva el mismo resultado esperado.
    @pytest.mark.parametrize(
        "params",
        [
            {},
            {"date": "08-10-2026"},
            {"date": (timezone.localdate() - timedelta(days=1)).isoformat()},
            {"date": (timezone.localdate() + timedelta(days=61)).isoformat()},
        ],
    )
    @pytest.mark.integration
    def test_invalid_dates_return_400(self, api, prop, assert_problem, params):
        """IT-CIT-085 - Prueba de Integración — AvailableSlotsView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsView.
        Propósito del Escenario: Error 400: rechaza fecha ausente, formato inválido, fecha pasada o fuera de la ventana de 60 días.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(slots_url(prop), params)

        assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_unknown_property_returns_404(self, api, day, assert_problem):
        """IT-CIT-086 - Prueba de Integración — AvailableSlotsView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsView.
        Propósito del Escenario: Error 404: responde 404 cuando la propiedad no existe.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(
            "/api/v1/properties/00000000-0000-4000-8000-000000000000/available-slots",
            {"date": day.isoformat()},
        )

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)


# ===== TestCreateAppointment: grupo de pruebas de create appointment =====
class TestCreateAppointment:
    @pytest.mark.integration
    def test_anonymous_returns_401(self, api, prop, day, assert_problem):
        """IT-CIT-087 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Permisos 401: exige autenticación para crear una cita.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert_problem(response, "unauthorized", status.HTTP_401_UNAUTHORIZED)
        assert Appointment.objects.count() == 0

    @pytest.mark.integration
    def test_client_books_for_themselves(
        self, api, prop, client_user, day, mailoutbox
    ):
        """IT-CIT-088 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Camino feliz: el cliente agenda para sí y se notifica a ambas partes.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        body = response.json()
        appointment = Appointment.objects.get()
        assert body["id"] == str(appointment.id)
        assert body["status"] == AppointmentStatus.PENDING
        assert body["duration_minutes"] == 60
        assert response["Location"].endswith(f"{APPOINTMENTS}/{appointment.id}")
        assert appointment.client == client_user
        assert appointment.agent == prop.agent
        assert appointment.source == AppointmentSource.CLIENT_WEB
        assert len(mailoutbox) == 2

    @pytest.mark.integration
    def test_agent_books_on_behalf_of_a_client(
        self, api, prop, agent, client_user, day
    ):
        """IT-CIT-089 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Camino feliz: el agente agenda para un cliente y registra el origen AGENT.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(agent)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, 16),
                "client_id": str(client_user.id),
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        appointment = Appointment.objects.get()
        assert appointment.client == client_user
        assert appointment.source == AppointmentSource.AGENT

    @pytest.mark.integration
    def test_admin_books_on_behalf_of_a_client(
        self, api, prop, admin, client_user, day
    ):
        """IT-CIT-090 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Camino feliz: el administrador agenda para un cliente y registra el origen ADMIN.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(admin)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, 16),
                "client_id": str(client_user.id),
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Appointment.objects.get().source == AppointmentSource.ADMIN

    @pytest.mark.integration
    def test_agent_must_indicate_client_id(
        self, api, prop, agent, day, assert_problem
    ):
        """IT-CIT-091 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 400: exige client_id cuando agenda un AGENTE.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(agent)

        response = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "client_id"

    @pytest.mark.integration
    def test_client_cannot_book_for_someone_else(
        self, api, prop, client_user, other_client, day, assert_problem
    ):
        """IT-CIT-092 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Permisos 403: impide que un CLIENTE agende para otro cliente.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, 14),
                "client_id": str(other_client.id),
            },
            format="json",
        )

        assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)

    @pytest.mark.integration
    def test_unknown_client_id_returns_404(
        self, api, prop, agent, day, assert_problem
    ):
        """IT-CIT-093 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 404: rechaza un client_id inexistente.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(agent)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, 14),
                "client_id": "00000000-0000-4000-8000-000000000000",
            },
            format="json",
        )

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)

    @pytest.mark.integration
    def test_non_bookable_property_returns_400(
        self, api, district, agent, client_user, day, assert_problem
    ):
        """IT-CIT-094 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Regla de negocio 400: rechaza agendar una propiedad no reservable.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        sold = make_property(
            district, agent, index=2, status=PropertyStatus.VENDIDO
        )
        add_slots(sold, day, ("14:00", "15:00"))
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {"property_id": str(sold.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert_problem(
            response, "property_not_bookable", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_unknown_property_returns_404(
        self, api, client_user, day, assert_problem
    ):
        """IT-CIT-095 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 404: rechaza un property_id inexistente.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": "00000000-0000-4000-8000-000000000000",
                "scheduled_at": iso_at(day, 14),
            },
            format="json",
        )

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)

    # Parametrización: cada caso varía hour y conserva el mismo resultado esperado.
    @pytest.mark.parametrize("hour, minute", [(20, 0), (14, 30)])
    @pytest.mark.integration
    def test_time_not_matching_a_slot_start_returns_400(
        self, api, prop, client_user, day, assert_problem, hour, minute
    ):
        """IT-CIT-096 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 400: exige que scheduled_at coincida con el inicio de un slot.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, hour, minute),
            },
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "scheduled_at"

    @pytest.mark.integration
    def test_past_and_far_dates_return_400(
        self, api, prop, client_user, day, assert_problem
    ):
        """IT-CIT-097 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 400: rechaza fechas pasadas o fuera de la ventana de reserva.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)
        cases = [
            iso_at(timezone.localdate() - timedelta(days=1), 14),
            iso_at(day + timedelta(days=61), 14),
        ]

        for instant in cases:
            response = api.post(
                APPOINTMENTS,
                {"property_id": str(prop.id), "scheduled_at": instant},
                format="json",
            )
            assert_problem(
                response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
            )

    @pytest.mark.integration
    def test_unknown_field_returns_400(
        self, api, prop, client_user, day, assert_problem
    ):
        """IT-CIT-098 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Error 400: rechaza campos fuera del contrato de cita.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            APPOINTMENTS,
            {
                "property_id": str(prop.id),
                "scheduled_at": iso_at(day, 14),
                "motivo": "Prefiero la tarde",
            },
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "motivo"

    @pytest.mark.integration
    def test_second_reservation_of_the_same_slot_returns_409(
        self, api, prop, client_user, other_client, day, assert_problem
    ):
        """IT-CIT-099 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Conflicto 409: impide reservar dos veces el mismo slot.
        Código HTTP Esperado: 409 Conflict.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 409 Conflict y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)
        first = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )
        assert first.status_code == status.HTTP_201_CREATED

        api.force_authenticate(other_client)
        response = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert_problem(
            response, "appointment_slot_conflict", status.HTTP_409_CONFLICT
        )
        assert Appointment.objects.count() == 1

    @pytest.mark.integration
    def test_cancelled_appointment_frees_the_slot(
        self, api, prop, client_user, other_client, day
    ):
        """IT-CIT-100 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Regla de negocio: una cita cancelada libera el slot para otra reserva.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)
        assert (
            api.post(
                APPOINTMENTS,
                {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
                format="json",
            ).status_code
            == status.HTTP_201_CREATED
        )
        appointment = Appointment.objects.get()
        appointment.status = AppointmentStatus.CANCELLED
        appointment.save(update_fields=["status"])

        api.force_authenticate(other_client)
        response = api.post(
            APPOINTMENTS,
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        assert Appointment.objects.count() == 2

    @pytest.mark.integration
    def test_trailing_slash_variant_redirects(self, api, prop, client_user, day):
        """IT-CIT-101 - Prueba de Integración — AppointmentViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.create.
        Propósito del Escenario: Compatibilidad: la variante con barra final redirige a la ruta canónica.
        Código HTTP Esperado: 301 Moved Permanently.
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 301 Moved Permanently y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.post(
            f"{APPOINTMENTS}/",
            {"property_id": str(prop.id), "scheduled_at": iso_at(day, 14)},
            format="json",
        )

        assert response.status_code == status.HTTP_301_MOVED_PERMANENTLY
        assert response["Location"] == APPOINTMENTS


# ===== TestAppointmentList: grupo de pruebas de appointment list =====
class TestAppointmentList:
    @pytest.mark.integration
    def test_client_only_sees_their_own_appointments(
        self, api, prop, client_user, other_client, agent, day
    ):
        """IT-CIT-102 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Regla de negocio: el CLIENTE solo ve sus propias citas.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        own = make_appointment(prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA))
        make_appointment(prop, other_client, agent, datetime.combine(day, time(16), tzinfo=LIMA))

        api.force_authenticate(client_user)
        body = api.get(APPOINTMENTS).json()

        assert body["count"] == 1
        assert body["results"][0]["id"] == str(own.id)

    @pytest.mark.integration
    def test_agent_only_sees_assigned_appointments(
        self, api, district, prop, agent, other_agent, client_user, day
    ):
        """IT-CIT-103 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Regla de negocio: el AGENTE solo ve las citas de sus propiedades.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        own = make_appointment(prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA))
        foreign_property = make_property(district, other_agent, index=2)
        make_appointment(
            foreign_property,
            client_user,
            other_agent,
            datetime.combine(day, time(14), tzinfo=LIMA),
        )

        api.force_authenticate(agent)
        body = api.get(APPOINTMENTS).json()

        assert body["count"] == 1
        assert body["results"][0]["id"] == str(own.id)

    @pytest.mark.integration
    def test_admin_sees_every_appointment(
        self, api, district, prop, agent, admin, client_user, day
    ):
        """IT-CIT-104 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Camino feliz: el ADMINISTRADOR ve todas las citas.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_appointment(prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA))
        foreign_property = make_property(district, agent, index=2)
        make_appointment(
            foreign_property,
            client_user,
            agent,
            datetime.combine(day, time(14), tzinfo=LIMA),
        )

        api.force_authenticate(admin)
        body = api.get(APPOINTMENTS).json()

        assert body["count"] == 2

    @pytest.mark.integration
    def test_client_cannot_read_another_role_scope(
        self, api, client_user, assert_problem
    ):
        """IT-CIT-105 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Permisos 403: impide al CLIENTE consultar el alcance de AGENTE o ADMINISTRADOR.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        for role in (ROLE_AGENT, ROLE_ADMIN):
            response = api.get(APPOINTMENTS, {"role": role})
            assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)

    @pytest.mark.integration
    def test_invalid_filters_return_400(
        self, api, client_user, day, assert_problem
    ):
        """IT-CIT-106 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Error 400: rechaza role, status o fecha con valores inválidos.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)
        cases = [
            {"role": "GERENTE"},
            {"status": "VOLANDO"},
            {"dateFrom": "2026-13-01"},
        ]

        for params in cases:
            response = api.get(APPOINTMENTS, params)
            assert_problem(
                response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
            )

    @pytest.mark.integration
    def test_inverted_date_range_returns_its_own_code(
        self, api, client_user, day, assert_problem
    ):
        """IT-CIT-107 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Error 400: distingue el rango de fechas invertido con un código propio.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(client_user)

        response = api.get(
            APPOINTMENTS,
            {"dateFrom": (day + timedelta(days=1)).isoformat(), "dateTo": day.isoformat()},
        )

        assert_problem(
            response, "invalid_filter_range", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_date_filter_limits_the_listing(
        self, api, district, prop, agent, client_user, day, next_day
    ):
        """IT-CIT-108 - Prueba de Integración — AppointmentViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.list.
        Propósito del Escenario: Camino feliz: filtra el listado por el rango de fechas solicitado.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_appointment(prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA))
        make_appointment(
            prop, client_user, agent, datetime.combine(next_day, time(14), tzinfo=LIMA)
        )

        api.force_authenticate(client_user)
        body = api.get(
            APPOINTMENTS,
            {"dateFrom": day.isoformat(), "dateTo": day.isoformat()},
        ).json()

        assert body["count"] == 1
        assert body["results"][0]["scheduled_at"] == iso_at(day, 14)


# ===== TestAppointmentStatus: grupo de pruebas de appointment status =====
class TestAppointmentStatus:
    @pytest.mark.integration
    def test_confirm_returns_traceability(
        self, api, prop, agent, client_user, day, mailoutbox
    ):
        """IT-CIT-109 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Camino feliz: confirma la cita y devuelve la trazabilidad del cambio.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {"status": AppointmentStatus.CONFIRMED},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["status"] == AppointmentStatus.CONFIRMED
        assert body["previous_status"] == AppointmentStatus.PENDING
        assert body["scheduled_at"] == iso_at(day, 14)
        assert body["changed_by"] == str(agent.pk)
        assert AppointmentStatusChange.objects.count() == 1
        assert len(mailoutbox) == 2

    @pytest.mark.integration
    def test_repeating_the_same_status_is_idempotent(
        self, api, prop, agent, client_user, day, mailoutbox
    ):
        """IT-CIT-110 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Camino feliz: repetir el mismo estado no duplica el historial ni las notificaciones.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)
        payload = {"status": AppointmentStatus.CONFIRMED}

        first = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status", payload, format="json"
        )
        second = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status", payload, format="json"
        )

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        assert second.json()["previous_status"] == AppointmentStatus.CONFIRMED
        assert AppointmentStatusChange.objects.count() == 1
        assert len(mailoutbox) == 2

    @pytest.mark.integration
    def test_invalid_transition_returns_400(
        self, api, prop, agent, client_user, day, assert_problem
    ):
        """IT-CIT-111 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 400: rechaza una transición no permitida por la máquina de estados.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {"status": AppointmentStatus.COMPLETED},
            format="json",
        )

        assert_problem(
            response,
            "invalid_appointment_transition",
            status.HTTP_400_BAD_REQUEST,
        )

    @pytest.mark.integration
    def test_pending_is_not_a_destination(
        self, api, prop, agent, client_user, day, assert_problem
    ):
        """IT-CIT-112 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 400: impide volver a PENDING porque no es un estado destino.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {"status": AppointmentStatus.PENDING},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "status"

    @pytest.mark.integration
    def test_cancel_requires_a_reason(
        self, api, prop, agent, client_user, day, assert_problem
    ):
        """IT-CIT-113 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 400: exige un motivo para cancelar la cita.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {"status": AppointmentStatus.CANCELLED},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "reason"

    @pytest.mark.integration
    def test_reschedule_requires_scheduled_at(
        self, api, prop, agent, client_user, day, assert_problem
    ):
        """IT-CIT-114 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 400: exige scheduled_at al reprogramar.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA),
            status=AppointmentStatus.CONFIRMED,
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {
                "status": AppointmentStatus.RESCHEDULED,
                "reason": "Cambio solicitado por el cliente.",
            },
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "scheduled_at"

    @pytest.mark.integration
    def test_scheduled_at_is_only_valid_when_rescheduling(
        self, api, prop, agent, client_user, day, next_day, assert_problem
    ):
        """IT-CIT-115 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 400: rechaza scheduled_at cuando el estado destino no es RESCHEDULED.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {
                "status": AppointmentStatus.CONFIRMED,
                "scheduled_at": iso_at(next_day, 14),
            },
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "scheduled_at"

    @pytest.mark.integration
    def test_reschedule_moves_the_appointment(
        self, api, prop, agent, client_user, day, next_day
    ):
        """IT-CIT-116 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Camino feliz: mueve la cita, incrementa reschedule_count y limpia confirmed_at.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA),
            status=AppointmentStatus.CONFIRMED,
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": iso_at(next_day, 14),
                "reason": "El propietario no está disponible ese día.",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["status"] == AppointmentStatus.RESCHEDULED
        assert body["previous_status"] == AppointmentStatus.CONFIRMED
        assert body["scheduled_at"] == iso_at(next_day, 14)
        appointment.refresh_from_db()
        assert appointment.reschedule_count == 1
        assert appointment.confirmed_at is None

    @pytest.mark.integration
    def test_reschedule_conflict_returns_409(
        self, api, prop, agent, client_user, other_client, day, next_day, assert_problem
    ):
        """IT-CIT-117 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Conflicto 409: impide reprogramar hacia un slot ya ocupado y conserva el estado original.
        Código HTTP Esperado: 409 Conflict.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 409 Conflict y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA),
            status=AppointmentStatus.CONFIRMED,
        )
        make_appointment(
            prop, other_client, agent, datetime.combine(next_day, time(14), tzinfo=LIMA),
            status=AppointmentStatus.CONFIRMED,
        )
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/{appointment.id}/status",
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": iso_at(next_day, 14),
                "reason": "Se intentó mover a un horario ocupado.",
            },
            format="json",
        )

        assert_problem(
            response, "appointment_slot_conflict", status.HTTP_409_CONFLICT
        )
        appointment.refresh_from_db()
        assert appointment.scheduled_at == datetime.combine(day, time(14), tzinfo=LIMA)
        assert appointment.status == AppointmentStatus.CONFIRMED

    @pytest.mark.integration
    def test_only_the_assigned_agent_or_admin_can_change_the_status(
        self, api, prop, agent, other_agent, admin, client_user, day, assert_problem
    ):
        """IT-CIT-118 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Permisos 403/200: bloquea al CLIENTE y a un agente ajeno; el ADMINISTRADOR sí puede.
        Código HTTP Esperado: 403 Forbidden y 200 OK.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 403 Forbidden y 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        appointment = make_appointment(
            prop, client_user, agent, datetime.combine(day, time(14), tzinfo=LIMA)
        )
        url = f"{APPOINTMENTS}/{appointment.id}/status"

        api.force_authenticate(client_user)
        assert_problem(
            api.patch(url, {"status": AppointmentStatus.CONFIRMED}, format="json"),
            "forbidden",
            status.HTTP_403_FORBIDDEN,
        )

        api.force_authenticate(other_agent)
        assert_problem(
            api.patch(url, {"status": AppointmentStatus.CONFIRMED}, format="json"),
            "forbidden",
            status.HTTP_403_FORBIDDEN,
        )

        api.force_authenticate(admin)
        response = api.patch(
            url, {"status": AppointmentStatus.CONFIRMED}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.integration
    def test_unknown_appointment_returns_404(
        self, api, agent, assert_problem
    ):
        """IT-CIT-119 - Prueba de Integración — AppointmentViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentViewSet.status.
        Propósito del Escenario: Error 404: responde 404 cuando la cita no existe.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        api.force_authenticate(agent)

        response = api.patch(
            f"{APPOINTMENTS}/00000000-0000-4000-8000-000000000000/status",
            {"status": AppointmentStatus.CONFIRMED},
            format="json",
        )

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)
