"""Pruebas de `GET /api/v1/appointments` (RF-CRM-02, TASK-BACK-CRM-02).

El listado fija tres cosas además de la paginación: el **alcance por rol** (un
`CLIENTE` ve sus citas, un `AGENTE` las suyas, un `ADMINISTRADOR` el mundo),
el parámetro `role` que selecciona una de esas perspectivas y sus `403`, y el
**filtrado** (status OR, ventana `dateFrom`/`dateTo` en `America/Lima` con
extremos inclusivos) con el sobre `invalid_filter_range` cuando `dateTo` queda
antes de `dateFrom`.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.appointments.models import Appointment, AppointmentStatus
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

LIMA = ZoneInfo("America/Lima")
UTC = ZoneInfo("UTC")


class AppointmentListApiTestCase(APITestCase):
    """Cliente, agente y administrador sobre tres citas en dos días."""

    URL = "/api/v1/appointments"

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.property = make_property(self.district, self.agent, index=1)

        self.day = date(2026, 10, 8)
        self.next_day = date(2026, 10, 9)

        # `appointment_property_slot_unique` (property + scheduled_at con
        # estado activo) obliga a separar las horas del mismo día.
        self.carlos = self.make_appointment(
            "carlos", make_user("carlos", role=ROLE_CLIENT),
            self.day, 10, AppointmentStatus.PENDING,
        )
        self.alicia = self.make_appointment(
            "alicia", self.client_user, self.day, 15, AppointmentStatus.PENDING
        )
        self.bruno = self.make_appointment(
            "bruno", self.client_user, self.next_day, 15, AppointmentStatus.CONFIRMED
        )

    def local_at(self, day, hour=15, minute=0):
        """Instante UTC de una hora local de Lima."""
        return datetime.combine(day, time(hour, minute), tzinfo=LIMA).astimezone(
            UTC
        )

    def make_appointment(self, username, client, day, hour, status):
        return Appointment.objects.create(
            property=self.property,
            client=client,
            agent=self.agent,
            scheduled_at=self.local_at(day, hour=hour),
            duration_minutes=60,
            status=status,
        )

    def get(self, user, **params):
        self.client.force_authenticate(user)
        pieces = []
        for key, value in params.items():
            if isinstance(value, (list, tuple)):
                pieces.extend(f"{key}={item}" for item in value)
            else:
                pieces.append(f"{key}={value}")
        query = "&".join(pieces)
        return self.client.get(f"{self.URL}?{query}" if query else self.URL)

    def ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        return response.json()


class AppointmentListScopeTests(AppointmentListApiTestCase):
    def test_client_sees_only_their_appointments(self):
        response = self.get(self.client_user)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertIn(str(self.alicia.id), self.ids(response))
        self.assertIn(str(self.bruno.id), self.ids(response))
        self.assertNotIn(str(self.carlos.id), self.ids(response))
        self.assertEqual(response["X-Total-Count"], "2")

    def test_agent_sees_every_assigned_appointment(self):
        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_admin_sees_every_appointment(self):
        response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_explicit_client_selector_is_allowed_for_a_client(self):
        response = self.get(self.client_user, role="CLIENTE")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_admin_selector_from_agent_is_forbidden(self):
        problem = self.assertProblem(
            self.get(self.agent, role="ADMINISTRADOR"),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "El rol AGENTE solo puede consultar las citas que tiene asignadas.",
        )
        self.assertEqual(problem["required_roles"], [ROLE_ADMIN])

    def test_admin_selector_from_client_is_forbidden(self):
        problem = self.assertProblem(
            self.get(self.client_user, role="ADMINISTRADOR"),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "El rol CLIENTE solo puede consultar sus propias citas.",
        )

    def test_agent_selector_from_client_is_forbidden(self):
        problem = self.assertProblem(
            self.get(self.client_user, role="AGENTE"),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "El rol CLIENTE solo puede consultar sus propias citas.",
        )
        self.assertEqual(problem["required_roles"], [ROLE_AGENT])

    def test_invalid_role_param_is_rejected(self):
        problem = self.assertProblem(
            self.get(self.client_user, role="DUENO"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "El parámetro 'role' admite los valores CLIENTE, AGENTE, ADMINISTRADOR.",
        )
        self.assertEqual(problem["errors"][0]["parameter"], "role")

    def test_anonymous_is_rejected_with_401(self):
        response = self.client.get(self.URL)
        problem = self.assertProblem(
            response, "unauthorized", http_status.HTTP_401_UNAUTHORIZED
        )
        self.assertEqual(problem["type"], "https://housebroker.pe/errors/unauthorized")


class AppointmentListFiltersTests(AppointmentListApiTestCase):
    def test_status_filter_with_multiple_values_is_or(self):
        response = self.get(self.admin, status=("PENDING", "CONFIRMED"))

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_status_filter_single_value(self):
        response = self.get(self.admin, status="CONFIRMED")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.bruno.id))
        self.assertEqual(response.data["results"][0]["status"], "CONFIRMED")

    def test_invalid_status_is_rejected(self):
        problem = self.assertProblem(
            self.get(self.admin, status="CONFIRMADA"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "El parámetro 'status' admite los valores PENDING, CONFIRMED, "
            "RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW.",
        )
        self.assertEqual(
            problem["errors"],
            [
                {
                    "parameter": "status",
                    "message": "El valor 'CONFIRMADA' no pertenece al conjunto "
                    "permitido (PENDING, CONFIRMED, RESCHEDULED, COMPLETED, "
                    "CANCELLED, NO_SHOW).",
                }
            ],
        )

    def test_date_from_is_inclusive(self):
        response = self.get(self.admin, dateFrom="2026-10-09")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        ids = self.ids(response)
        self.assertNotIn(str(self.alicia.id), ids)
        self.assertIn(str(self.bruno.id), ids)

    def test_date_to_is_inclusive(self):
        response = self.get(self.admin, dateTo="2026-10-08")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        ids = self.ids(response)
        self.assertIn(str(self.alicia.id), ids)
        self.assertIn(str(self.carlos.id), ids)
        self.assertNotIn(str(self.bruno.id), ids)

    def test_date_window_both_ends(self):
        response = self.get(
            self.admin, dateFrom="2026-10-08", dateTo="2026-10-08"
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        ids = self.ids(response)
        self.assertNotIn(str(self.bruno.id), ids)
        self.assertEqual(len(ids), 2)

    def test_inverted_range_is_invalid_filter_range(self):
        problem = self.assertProblem(
            self.get(self.admin, dateFrom="2026-10-09", dateTo="2026-10-08"),
            "invalid_filter_range",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["title"], "Rango de fechas inválido")
        self.assertEqual(
            problem["detail"],
            "El parámetro 'dateTo' no puede ser anterior a 'dateFrom'.",
        )
        self.assertEqual(
            problem["errors"],
            [
                {
                    "parameter": "dateTo",
                    "message": "El valor '2026-10-08' es anterior a 'dateFrom' "
                    "(2026-10-09).",
                }
            ],
        )

    def test_malformed_date_is_rejected(self):
        problem = self.assertProblem(
            self.get(self.admin, dateFrom="08-10-2026"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "El parámetro 'dateFrom' debe tener formato ISO 8601 (YYYY-MM-DD).",
        )
        self.assertEqual(
            problem["errors"],
            [
                {
                    "parameter": "dateFrom",
                    "message": "El valor '08-10-2026' no cumple el formato YYYY-MM-DD.",
                }
            ],
        )

    def test_multiple_invalid_params_are_reported_together(self):
        problem = self.assertProblem(
            self.get(self.admin, status="X", dateFrom="mal"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"], "Se detectaron 2 parámetros de consulta inválidos."
        )
        self.assertEqual(
            [error["parameter"] for error in problem["errors"]],
            ["status", "dateFrom"],
        )

    def test_empty_param_values_are_treated_as_omitted(self):
        response = self.get(self.admin, status="", dateFrom="", limit="")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)


class AppointmentListPaginationTests(AppointmentListApiTestCase):
    def test_results_are_ordered_by_scheduled_at_ascending(self):
        response = self.get(self.admin)

        self.assertEqual(
            self.ids(response),
            [str(self.carlos.id), str(self.alicia.id), str(self.bruno.id)],
        )

    def test_limit_and_page_are_respected(self):
        response = self.get(self.admin, limit="2", page="1")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertIn("limit=2", response.data["next"])

    def test_out_of_range_page_returns_empty_results(self):
        response = self.get(self.admin, page="99")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(response.data["results"], [])

    def test_invalid_page_is_rejected(self):
        problem = self.assertProblem(
            self.get(self.admin, page="cero"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "page")