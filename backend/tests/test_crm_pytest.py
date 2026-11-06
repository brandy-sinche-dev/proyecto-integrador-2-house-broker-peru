"""Pruebas Pytest de la ficha, el historial y las notas del cliente (HU-CRM-03/04)."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status

from apps.appointments.models import AppointmentStatus, AppointmentStatusChange
from apps.clients.models import ClientNote
from apps.clients.tests.helpers import make_appointment, make_client_profile
from apps.properties.models import Favorite
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = pytest.mark.django_db


def profile_url(client):
    return f"/api/v1/clients/{client.pk}/profile"


def history_url(client):
    return f"/api/v1/clients/{client.pk}/history"


def notes_url(client, note_id=None):
    base = f"/api/v1/clients/{client.pk}/notes"
    return base if note_id is None else f"{base}/{note_id}"


@pytest.fixture
def district(db):
    return make_district()


@pytest.fixture
def agent(db):
    return make_user("agente", role=ROLE_AGENT)


@pytest.fixture
def second_agent(db):
    return make_user("segundo-agente", role=ROLE_AGENT)


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
def prop(district, agent):
    return make_property(district, agent, index=1)


@pytest.fixture
def appointment(prop, client_user, agent):
    return make_appointment(
        prop,
        client_user,
        agent,
        timezone.now() + timedelta(days=2),
        AppointmentStatus.PENDING,
    )


# ===== TestClientProfile: grupo de pruebas de client profile =====
class TestClientProfile:
    @pytest.mark.integration
    def test_profile_requires_authentication(self, api, client_user, assert_problem):
        """IT-CRM-066 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Permisos 401: exige autenticación para consultar la ficha.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(profile_url(client_user))

        assert_problem(response, "unauthorized", status.HTTP_401_UNAUTHORIZED)

    @pytest.mark.integration
    def test_client_role_is_forbidden(
        self, api, authenticate, client_user, assert_problem
    ):
        """IT-CRM-067 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Permisos 403: restringe la ficha a AGENTE y ADMINISTRADOR.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)

        response = api.get(profile_url(client_user))

        problem = assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)
        assert problem["required_roles"] == [ROLE_AGENT, ROLE_ADMIN]

    @pytest.mark.integration
    def test_unassigned_agent_gets_404(
        self, api, authenticate, other_agent, client_user, assert_problem
    ):
        """IT-CRM-068 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Alcance 404: un agente sin citas con el cliente no puede ver su ficha.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(other_agent)

        response = api.get(profile_url(client_user))

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)

    @pytest.mark.integration
    def test_assigned_agent_sees_the_full_profile(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-069 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Camino feliz: el agente asignado recibe ficha, resumen y propiedades asociadas.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_client_profile(client_user)
        Favorite.objects.create(user=client_user, property=appointment.property)
        authenticate(agent)

        response = api.get(profile_url(client_user))

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["id"] == str(client_user.pk)
        assert body["email"] == client_user.email
        assert body["budget_min"] == 1800.0
        assert body["interest_level"] == 4
        assert body["summary"]["appointments_total"] == 1
        assert body["summary"]["appointments_upcoming"] == 1
        assert body["summary"]["favorite_properties_total"] == 1
        assert len(body["associated_properties"]) == 1
        assert body["associated_properties"][0]["id"] == str(appointment.property_id)

    @pytest.mark.integration
    def test_profile_without_crm_data_is_not_an_error(
        self, api, authenticate, admin
    ):
        """IT-CRM-070 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Borde: un cliente sin datos CRM devuelve nulls y resumen en cero.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        bare_client = make_user("sin-perfil")
        authenticate(admin)

        response = api.get(profile_url(bare_client))

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["budget_min"] is None
        assert body["budget_max"] is None
        assert body["preferences"] is None
        assert body["budget_currency"] == "PEN"
        assert body["summary"]["appointments_total"] == 0

    # Parametrización: cada caso varía raw_id y conserva el mismo resultado esperado.
    @pytest.mark.parametrize("raw_id", ["no-existe", "999999"])
    @pytest.mark.integration
    def test_unknown_or_malformed_client_returns_404(
        self, api, authenticate, admin, assert_problem, raw_id
    ):
        """IT-CRM-071 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Error 404: un id inexistente o no numérico no revela la existencia del recurso.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(admin)

        response = api.get(f"/api/v1/clients/{raw_id}/profile")

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)

    @pytest.mark.integration
    def test_an_agent_account_is_not_a_client(
        self, api, authenticate, admin, agent, assert_problem
    ):
        """IT-CRM-072 - Prueba de Integración — ClientProfileView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileView.
        Propósito del Escenario: Regla de negocio 404: una cuenta de AGENTE no se trata como cliente.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(admin)

        response = api.get(profile_url(agent))

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)


# ===== TestClientHistory: grupo de pruebas de client history =====
class TestClientHistory:
    @pytest.mark.integration
    def test_history_joins_creation_and_status_changes(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-073 - Prueba de Integración — ClientHistoryView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryView.
        Propósito del Escenario: Camino feliz: el historial une la creación de la cita y sus cambios de estado.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        AppointmentStatusChange.objects.create(
            appointment=appointment,
            previous_status=AppointmentStatus.PENDING,
            new_status=AppointmentStatus.CONFIRMED,
            previous_scheduled_at=appointment.scheduled_at,
            new_scheduled_at=appointment.scheduled_at,
            reason="Confirmada por teléfono.",
            changed_by=agent,
        )
        authenticate(agent)

        response = api.get(history_url(client_user))

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["count"] == 2
        assert {entry["type"] for entry in body["results"]} == {
            "APPOINTMENT",
            "STATUS_CHANGE",
        }

    @pytest.mark.integration
    def test_type_filter_returns_only_the_requested_entries(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-074 - Prueba de Integración — ClientHistoryView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryView.
        Propósito del Escenario: Camino feliz: filtra el historial por tipo de evento.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        AppointmentStatusChange.objects.create(
            appointment=appointment,
            previous_status=AppointmentStatus.PENDING,
            new_status=AppointmentStatus.CONFIRMED,
            previous_scheduled_at=appointment.scheduled_at,
            new_scheduled_at=appointment.scheduled_at,
            changed_by=agent,
        )
        authenticate(agent)

        body = api.get(history_url(client_user), {"type": "STATUS_CHANGE"}).json()

        assert body["count"] == 1
        assert body["results"][0]["type"] == "STATUS_CHANGE"
        assert body["results"][0]["status"] == AppointmentStatus.CONFIRMED

    @pytest.mark.integration
    def test_invalid_filters_return_400(
        self, api, authenticate, agent, client_user, appointment, assert_problem
    ):
        """IT-CRM-075 - Prueba de Integración — ClientHistoryView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryView.
        Propósito del Escenario: Error 400: rechaza type o fecha con valores inválidos.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)
        cases = [
            {"type": "PAGO"},
            {"dateFrom": "2026-13-01"},
        ]

        for params in cases:
            response = api.get(history_url(client_user), params)
            assert_problem(
                response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
            )

    @pytest.mark.integration
    def test_inverted_date_range_returns_its_own_code(
        self, api, authenticate, agent, client_user, appointment, assert_problem
    ):
        """IT-CRM-076 - Prueba de Integración — ClientHistoryView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryView.
        Propósito del Escenario: Error 400: distingue el rango de fechas invertido con un código propio.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)
        today = timezone.localdate()

        response = api.get(
            history_url(client_user),
            {
                "dateFrom": (today + timedelta(days=1)).isoformat(),
                "dateTo": today.isoformat(),
            },
        )

        assert_problem(
            response, "invalid_filter_range", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_scope_matches_the_profile(
        self, api, authenticate, client_user, other_agent, assert_problem
    ):
        """IT-CRM-077 - Prueba de Integración — ClientHistoryView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryView.
        Propósito del Escenario: Permisos 403/404: replica el alcance de la ficha (CLIENTE 403, agente ajeno 404).
        Código HTTP Esperado: 403 Forbidden y 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)
        assert_problem(
            api.get(history_url(client_user)),
            "forbidden",
            status.HTTP_403_FORBIDDEN,
        )

        authenticate(other_agent)
        assert_problem(
            api.get(history_url(client_user)),
            "resource_not_found",
            status.HTTP_404_NOT_FOUND,
        )


# ===== TestClientNotes: grupo de pruebas de client notes =====
class TestClientNotes:
    @pytest.mark.integration
    def test_notes_list_permissions(
        self, api, authenticate, client_user, other_agent, assert_problem
    ):
        """IT-CRM-078 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Permisos 401/403/404: anónimo 401, CLIENTE 403 y agente no asignado 404.
        Código HTTP Esperado: 401 Unauthorized, 403 Forbidden y 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 401 Unauthorized, 403 Forbidden y 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        assert_problem(
            api.get(notes_url(client_user)),
            "unauthorized",
            status.HTTP_401_UNAUTHORIZED,
        )

        authenticate(client_user)
        assert_problem(
            api.get(notes_url(client_user)),
            "forbidden",
            status.HTTP_403_FORBIDDEN,
        )

        authenticate(other_agent)
        assert_problem(
            api.get(notes_url(client_user)),
            "resource_not_found",
            status.HTTP_404_NOT_FOUND,
        )

    @pytest.mark.integration
    def test_agent_can_create_a_minimal_note(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-079 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Camino feliz: crea una nota mínima, recorta espacios y expone Location.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            notes_url(client_user),
            {"body": "  Llamada de seguimiento.  "},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        body = response.json()
        assert body["client_id"] == str(client_user.pk)
        assert body["author"]["id"] == str(agent.pk)
        assert body["body"] == "Llamada de seguimiento."
        assert body["appointment_id"] is None
        assert response["Location"].endswith(
            f"/api/v1/clients/{client_user.pk}/notes/{body['id']}"
        )

    @pytest.mark.integration
    def test_agent_can_create_a_full_note(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-080 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Camino feliz: persiste nota completa con cita, interés y contraoferta decimal.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            notes_url(client_user),
            {
                "body": "El cliente pidió evaluar una contraoferta.",
                "appointment_id": str(appointment.pk),
                "interest_level": 4,
                "client_showed_up": True,
                "counteroffer_amount": "2350.00",
                "counteroffer_currency": "PEN",
                "followup_at": "2026-10-12T15:00:00Z",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        body = response.json()
        assert body["appointment_id"] == str(appointment.pk)
        assert body["interest_level"] == 4
        assert body["client_showed_up"] is True
        assert float(body["counteroffer_amount"]) == 2350.0
        assert body["counteroffer_currency"] == "PEN"
        assert body["followup_at"].endswith("Z")

        note = ClientNote.objects.get(pk=body["id"])
        assert note.counteroffer_amount == Decimal("2350.00")

    # Parametrización: cada caso varía payload y conserva el mismo resultado esperado.
    @pytest.mark.parametrize(
        "payload, parameter",
        [
            ({}, "body"),
            ({"body": "   "}, "body"),
            ({"body": "x" * 2001}, "body"),
            ({"body": "Nota.", "interest_level": 6}, "interest_level"),
        ],
    )
    @pytest.mark.integration
    def test_invalid_bodies_return_400(
        self,
        api,
        authenticate,
        agent,
        client_user,
        appointment,
        assert_problem,
        payload,
        parameter,
    ):
        """IT-CRM-081 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Error 400: rechaza body vacío, excesivo o interest_level fuera de rango.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(notes_url(client_user), payload, format="json")

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == parameter
        assert ClientNote.objects.count() == 0

    @pytest.mark.integration
    def test_counteroffer_needs_amount_and_currency_together(
        self, api, authenticate, agent, client_user, appointment, assert_problem
    ):
        """IT-CRM-082 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Error 400: exige monto y moneda juntos en una contraoferta.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        missing_currency = api.post(
            notes_url(client_user),
            {"body": "Nota.", "counteroffer_amount": "2000.00"},
            format="json",
        )
        problem = assert_problem(
            missing_currency, "invalid_counteroffer", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "counteroffer_currency"

        missing_amount = api.post(
            notes_url(client_user),
            {"body": "Nota.", "counteroffer_currency": "PEN"},
            format="json",
        )
        problem = assert_problem(
            missing_amount, "invalid_counteroffer", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "counteroffer_amount"

    @pytest.mark.integration
    def test_appointment_of_another_client_is_rejected(
        self,
        api,
        authenticate,
        district,
        agent,
        other_agent,
        other_client,
        client_user,
        appointment,
        assert_problem,
    ):
        """IT-CRM-083 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Error 400: rechaza referenciar una cita de otro cliente.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        foreign_property = make_property(district, other_agent, index=2)
        foreign_appointment = make_appointment(
            foreign_property,
            other_client,
            other_agent,
            timezone.now() + timedelta(days=3),
        )
        authenticate(agent)

        response = api.post(
            notes_url(client_user),
            {"body": "Nota.", "appointment_id": str(foreign_appointment.pk)},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_appointment_reference", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "appointment_id"

    @pytest.mark.integration
    def test_unknown_field_is_rejected(
        self, api, authenticate, agent, client_user, appointment, assert_problem
    ):
        """IT-CRM-084 - Prueba de Integración — ClientNoteListCreateView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListCreateView.
        Propósito del Escenario: Error 400: rechaza campos fuera del contrato de nota.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            notes_url(client_user),
            {"body": "Nota.", "author": str(agent.pk)},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "author"

    @pytest.mark.integration
    def test_author_can_delete_and_the_note_is_soft_deleted(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-085 - Prueba de Integración — ClientNoteDetailView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDetailView.
        Propósito del Escenario: Camino feliz: el autor elimina su nota con baja lógica.
        Código HTTP Esperado: 204 No Content.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = ClientNote.objects.create(
            client=client_user, author=agent, body="Seguimiento."
        )
        authenticate(agent)

        response = api.delete(notes_url(client_user, note.pk))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        note.refresh_from_db()
        assert note.deleted_at is not None
        assert api.get(notes_url(client_user)).json()["count"] == 0

    @pytest.mark.integration
    def test_repeated_delete_is_idempotent(
        self, api, authenticate, agent, client_user, appointment
    ):
        """IT-CRM-086 - Prueba de Integración — ClientNoteDetailView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDetailView.
        Propósito del Escenario: Camino feliz: repetir el borrado conserva deleted_at y responde 204.
        Código HTTP Esperado: 204 No Content.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = ClientNote.objects.create(
            client=client_user, author=agent, body="Seguimiento."
        )
        authenticate(agent)

        assert api.delete(notes_url(client_user, note.pk)).status_code == 204
        note.refresh_from_db()
        first_deleted_at = note.deleted_at

        assert api.delete(notes_url(client_user, note.pk)).status_code == 204
        note.refresh_from_db()
        assert note.deleted_at == first_deleted_at

    @pytest.mark.integration
    def test_admin_can_delete_another_agents_note(
        self, api, authenticate, admin, agent, client_user, appointment
    ):
        """IT-CRM-087 - Prueba de Integración — ClientNoteDetailView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDetailView.
        Propósito del Escenario: Camino feliz: el ADMINISTRADOR elimina la nota de otro agente.
        Código HTTP Esperado: 204 No Content.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = ClientNote.objects.create(
            client=client_user, author=agent, body="Seguimiento."
        )
        authenticate(admin)

        response = api.delete(notes_url(client_user, note.pk))

        assert response.status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.integration
    def test_assigned_agent_cannot_delete_another_agents_note(
        self,
        api,
        authenticate,
        district,
        agent,
        second_agent,
        client_user,
        appointment,
        assert_problem,
    ):
        """IT-CRM-088 - Prueba de Integración — ClientNoteDetailView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDetailView.
        Propósito del Escenario: Permisos 403: un agente asignado no puede borrar la nota de otro autor.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        second_property = make_property(district, second_agent, index=2)
        make_appointment(
            second_property,
            client_user,
            second_agent,
            timezone.now() + timedelta(days=3),
            AppointmentStatus.CONFIRMED,
        )
        note = ClientNote.objects.create(
            client=client_user, author=agent, body="Seguimiento."
        )
        authenticate(second_agent)

        response = api.delete(notes_url(client_user, note.pk))

        problem = assert_problem(
            response, "forbidden", status.HTTP_403_FORBIDDEN
        )
        assert "autor" in problem["detail"]

    # Parametrización: cada caso varía note_id y conserva el mismo resultado esperado.
    @pytest.mark.parametrize("note_id", ["no-es-un-uuid"])
    @pytest.mark.integration
    def test_malformed_note_id_returns_404(
        self, api, authenticate, agent, client_user, assert_problem, note_id
    ):
        """IT-CRM-089 - Prueba de Integración — ClientNoteDetailView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDetailView.
        Propósito del Escenario: Error 404: un id no UUID se resuelve como recurso inexistente.
        Código HTTP Esperado: 404 Not Found.
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.delete(notes_url(client_user, note_id))

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)
