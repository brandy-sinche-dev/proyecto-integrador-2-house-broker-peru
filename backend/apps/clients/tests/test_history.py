"""Pruebas de `GET /api/v1/clients/{id}/history` (HU-CRM-03)."""

import pytest

from datetime import timezone as dt_timezone

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.appointments.models import (
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

from .helpers import make_appointment, utc

pytestmark = pytest.mark.integration

SCHEDULED_ORIGINAL = utc(2026, 10, 8, 15)
SCHEDULED_NEW = utc(2026, 10, 10, 15)
CREATED_AT = utc(2026, 10, 5, 14)
CONFIRMED_AT = utc(2026, 10, 6, 14)
RESCHEDULED_AT = utc(2026, 10, 7, 2)


# ===== ClientHistoryApiTestCase: grupo de pruebas de client history =====
class ClientHistoryApiTestCase(APITestCase):
    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.other_agent = make_user("otro_agente", role=ROLE_AGENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.other_client = make_user("otro_cliente", role=ROLE_CLIENT)
        self.empty_client = make_user("sin_citas", role=ROLE_CLIENT)

        self.property = make_property(self.district, self.agent, index=1)
        self.other_property = make_property(
            self.district, self.other_agent, index=2
        )

        self.appointment = make_appointment(
            self.property,
            self.client_user,
            self.agent,
            SCHEDULED_NEW,
            AppointmentStatus.RESCHEDULED,
            created_at=CREATED_AT,
        )
        self.confirmation = AppointmentStatusChange.objects.create(
            appointment=self.appointment,
            previous_status=AppointmentStatus.PENDING,
            new_status=AppointmentStatus.CONFIRMED,
            previous_scheduled_at=SCHEDULED_ORIGINAL,
            new_scheduled_at=SCHEDULED_ORIGINAL,
            reason="El cliente confirmó la visita por teléfono.",
            changed_by=self.agent,
            changed_at=CONFIRMED_AT,
        )
        self.reschedule = AppointmentStatusChange.objects.create(
            appointment=self.appointment,
            previous_status=AppointmentStatus.CONFIRMED,
            new_status=AppointmentStatus.RESCHEDULED,
            previous_scheduled_at=SCHEDULED_ORIGINAL,
            new_scheduled_at=SCHEDULED_NEW,
            reason="El cliente pidió otra fecha.",
            changed_by=self.agent,
            changed_at=RESCHEDULED_AT,
        )

        self.foreign_appointment = make_appointment(
            self.other_property,
            self.other_client,
            self.other_agent,
            SCHEDULED_NEW,
            AppointmentStatus.PENDING,
            created_at=CREATED_AT,
        )

    def url(self, user):
        return f"/api/v1/clients/{user.pk}/history"

    def get(self, requestor, target=None, **params):
        self.client.force_authenticate(requestor)
        pieces = []
        for key, value in params.items():
            if isinstance(value, (list, tuple)):
                pieces.extend(f"{key}={item}" for item in value)
            else:
                pieces.append(f"{key}={value}")
        query = "&".join(pieces)
        base = self.url(target or self.client_user)
        return self.client.get(f"{base}?{query}" if query else base)

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        body = response.json()
        self.assertEqual(body["code"], code)
        return body

    def iso(self, value):
        return (
            value.astimezone(dt_timezone.utc)
            .isoformat(timespec="seconds")
            .replace("+00:00", "Z")
        )


# ===== ClientHistoryAccessTests: grupo de pruebas de client history access =====
class ClientHistoryAccessTests(ClientHistoryApiTestCase):
    def test_admin_can_read_history(self):
        """IT-CRM-001 - Prueba de Integración - admin can read history

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can read history.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response["X-Total-Count"], "3")

    def test_assigned_agent_can_read_history(self):
        """IT-CRM-002 - Prueba de Integración - assigned agent can read history

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: assigned agent can read history.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response["X-Total-Count"], "3")
        self.assertEqual(
            [entry["type"] for entry in response.data["results"]],
            ["STATUS_CHANGE", "STATUS_CHANGE", "APPOINTMENT"],
        )

    def test_agent_without_assigned_appointments_gets_404(self):
        """IT-CRM-003 - Prueba de Integración - agent without assigned appointments gets 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent without assigned appointments gets 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.assertProblem(
            self.get(self.agent, self.other_client),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )

    def test_client_role_is_forbidden(self):
        """IT-CRM-004 - Prueba de Integración - client role is forbidden

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client role is forbidden.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get(self.client_user),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "El historial CRM del cliente solo está disponible para agentes y "
            "administradores.",
        )
        self.assertEqual(problem["required_roles"], [ROLE_AGENT, ROLE_ADMIN])

    def test_anonymous_is_unauthorized(self):
        """IT-CRM-005 - Prueba de Integración - anonymous is unauthorized

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous is unauthorized.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get(self.url(self.client_user))

        self.assertProblem(
            response, "unauthorized", http_status.HTTP_401_UNAUTHORIZED
        )

    def test_nonexistent_client_gets_404(self):
        """IT-CRM-006 - Prueba de Integración - nonexistent client gets 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: nonexistent client gets 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.admin)
        self.assertProblem(
            self.client.get("/api/v1/clients/999999/history"),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )


# ===== ClientHistoryContentTests: grupo de pruebas de client history content =====
class ClientHistoryContentTests(ClientHistoryApiTestCase):
    def test_entries_are_ordered_newest_first(self):
        """IT-CRM-007 - Prueba de Integración - entries are ordered newest first

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: entries are ordered newest first.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        results = response.data["results"]

        self.assertEqual(
            [entry["id"] for entry in results],
            [
                str(self.reschedule.id),
                str(self.confirmation.id),
                str(self.appointment.id),
            ],
        )

    def test_history_does_not_query_per_entry(self):
        """IT-CRM-008 - Prueba de Integración - history does not query per entry

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: history does not query per entry.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        with CaptureQueriesContext(connection) as queries:
            response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertLessEqual(len(queries), 6)

    def test_status_change_entry_describes_the_event(self):
        """IT-CRM-009 - Prueba de Integración - status change entry describes the event

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: status change entry describes the event.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        entry = response.data["results"][0]

        self.assertEqual(entry["type"], "STATUS_CHANGE")
        self.assertEqual(entry["occurred_at"], self.iso(RESCHEDULED_AT))
        self.assertEqual(entry["previous_status"], "CONFIRMED")
        self.assertEqual(entry["status"], "RESCHEDULED")
        self.assertEqual(
            entry["scheduled_at"], self.iso(SCHEDULED_NEW)
        )
        self.assertEqual(
            entry["previous_scheduled_at"], self.iso(SCHEDULED_ORIGINAL)
        )
        self.assertEqual(entry["reason"], "El cliente pidió otra fecha.")
        self.assertEqual(entry["changed_by"]["id"], str(self.agent.pk))
        self.assertEqual(entry["changed_by"]["full_name"], "agente")
        self.assertEqual(entry["appointment"]["status"], "RESCHEDULED")
        self.assertEqual(
            entry["appointment"]["property"]["title"], self.property.title
        )

    def test_appointment_entry_is_the_creation_event(self):
        """IT-CRM-010 - Prueba de Integración - appointment entry is the creation event

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: appointment entry is the creation event.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        entry = response.data["results"][2]

        self.assertEqual(entry["type"], "APPOINTMENT")
        self.assertEqual(entry["occurred_at"], self.iso(CREATED_AT))
        self.assertIsNone(entry["previous_status"])
        self.assertEqual(entry["status"], "PENDING")
        self.assertEqual(
            entry["scheduled_at"], self.iso(SCHEDULED_ORIGINAL)
        )
        self.assertIsNone(entry["previous_scheduled_at"])
        self.assertIsNone(entry["reason"])
        self.assertIsNone(entry["changed_by"])
        self.assertEqual(entry["id"], str(self.appointment.id))


# ===== ClientHistoryFilterTests: grupo de pruebas de client history filter =====
class ClientHistoryFilterTests(ClientHistoryApiTestCase):
    def test_type_filter_accepts_one_value(self):
        """IT-CRM-011 - Prueba de Integración - type filter accepts one value

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: type filter accepts one value.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin, type="APPOINTMENT")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["type"], "APPOINTMENT")

    def test_type_filter_accepts_repeated_values_as_or(self):
        """IT-CRM-012 - Prueba de Integración - type filter accepts repeated values as or

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: type filter accepts repeated values as or.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(
            self.admin, type=("APPOINTMENT", "STATUS_CHANGE")
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_invalid_type_is_rejected(self):
        """IT-CRM-013 - Prueba de Integración - invalid type is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: invalid type is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get(self.admin, type="CHAT"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "El parámetro 'type' admite los valores APPOINTMENT y STATUS_CHANGE.",
        )
        self.assertEqual(
            problem["errors"],
            [
                {
                    "parameter": "type",
                    "message": "El valor 'CHAT' no pertenece al conjunto "
                    "permitido (APPOINTMENT, STATUS_CHANGE).",
                }
            ],
        )

    def test_date_filter_uses_lima_boundaries(self):
        """IT-CRM-014 - Prueba de Integración - date filter uses lima boundaries

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: date filter uses lima boundaries.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(
            self.admin,
            dateFrom="2026-10-06",
            dateTo="2026-10-06",
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertNotIn(
            str(self.appointment.id),
            [entry["id"] for entry in response.data["results"]],
        )

    def test_date_to_is_inclusive(self):
        """IT-CRM-015 - Prueba de Integración - date to is inclusive

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: date to is inclusive.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin, dateTo="2026-10-05")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["type"], "APPOINTMENT")

    def test_inverted_range_is_invalid_filter_range(self):
        """IT-CRM-016 - Prueba de Integración - inverted range is invalid filter range

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: inverted range is invalid filter range.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get(self.admin, dateFrom="2026-10-07", dateTo="2026-10-05"),
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
                    "message": "El valor '2026-10-05' es anterior a "
                    "'dateFrom' (2026-10-07).",
                }
            ],
        )

    def test_malformed_date_is_rejected(self):
        """IT-CRM-017 - Prueba de Integración - malformed date is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryFilterTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: malformed date is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get(self.admin, dateFrom="07-10-2026"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "El parámetro 'dateFrom' debe tener formato ISO 8601 (YYYY-MM-DD).",
        )


# ===== ClientHistoryPaginationTests: grupo de pruebas de client history pagination =====
class ClientHistoryPaginationTests(ClientHistoryApiTestCase):
    def test_limit_and_page_split_the_timeline(self):
        """IT-CRM-018 - Prueba de Integración - limit and page split the timeline

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryPaginationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: limit and page split the timeline.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        first = self.get(self.admin, limit="1", page="1")

        self.assertEqual(first.status_code, http_status.HTTP_200_OK)
        self.assertEqual(first["X-Total-Count"], "3")
        self.assertEqual(len(first.data["results"]), 1)
        self.assertEqual(first.data["results"][0]["id"], str(self.reschedule.id))
        self.assertIn("limit=1", first.data["next"])
        self.assertIn("page=2", first.data["next"])

        second = self.get(self.admin, limit="1", page="2")
        self.assertEqual(
            second.data["results"][0]["id"], str(self.confirmation.id)
        )

    def test_out_of_range_page_returns_empty_results(self):
        """IT-CRM-019 - Prueba de Integración - out of range page returns empty results

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryPaginationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: out of range page returns empty results.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin, page="99")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(response.data["results"], [])
        self.assertEqual(response["X-Total-Count"], "3")

    def test_empty_history_has_zero_count(self):
        """IT-CRM-020 - Prueba de Integración - empty history has zero count

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryPaginationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: empty history has zero count.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin, self.empty_client)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_date_parameters_are_preserved_in_next_link(self):
        """IT-CRM-021 - Prueba de Integración - date parameters are preserved in next link

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientHistoryPaginationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: date parameters are preserved in next link.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(
            self.admin, limit="1", page="1", dateFrom="2026-10-05"
        )

        self.assertIn("dateFrom=2026-10-05", response.data["next"])
