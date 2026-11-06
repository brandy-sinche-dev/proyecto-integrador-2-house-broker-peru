"""Pruebas de `GET /api/v1/clients/{id}/profile` (HU-CRM-03)."""

import pytest

from datetime import timedelta
from datetime import timezone as dt_timezone

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.appointments.models import AppointmentStatus
from apps.properties.models import Favorite
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

from .helpers import make_appointment, make_client_profile

pytestmark = pytest.mark.integration


# ===== ClientProfileApiTestCase: grupo de pruebas de client profile =====
class ClientProfileApiTestCase(APITestCase):
    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.other_agent = make_user("otro_agente", role=ROLE_AGENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.other_client = make_user("otro_cliente", role=ROLE_CLIENT)

        self.client_user.profile.phone = "+51 987 654 321"
        self.client_user.profile.save(update_fields=["phone"])

        self.property_one = make_property(self.district, self.agent, index=1)
        self.property_two = make_property(self.district, self.agent, index=2)
        self.other_property = make_property(
            self.district, self.other_agent, index=3
        )

        now = timezone.now()
        self.pending = make_appointment(
            self.property_one,
            self.client_user,
            self.agent,
            now + timedelta(days=2),
            AppointmentStatus.PENDING,
        )
        self.completed = make_appointment(
            self.property_one,
            self.client_user,
            self.agent,
            now - timedelta(days=3),
            AppointmentStatus.COMPLETED,
        )
        self.cancelled = make_appointment(
            self.property_one,
            self.client_user,
            self.agent,
            now - timedelta(days=1),
            AppointmentStatus.CANCELLED,
        )
        self.no_show = make_appointment(
            self.property_one,
            self.client_user,
            self.agent,
            now - timedelta(days=2),
            AppointmentStatus.NO_SHOW,
        )
        self.older_completed = make_appointment(
            self.property_two,
            self.client_user,
            self.agent,
            now - timedelta(days=6),
            AppointmentStatus.COMPLETED,
        )

        self.foreign_appointment = make_appointment(
            self.other_property,
            self.other_client,
            self.other_agent,
            now + timedelta(days=4),
            AppointmentStatus.PENDING,
        )

        Favorite.objects.create(user=self.client_user, property=self.property_one)
        Favorite.objects.create(user=self.client_user, property=self.property_two)
        Favorite.objects.create(user=self.other_client, property=self.other_property)

        self.crm_profile = make_client_profile(self.client_user)

    def url(self, user):
        return f"/api/v1/clients/{user.pk}/profile"

    def get(self, requestor, target=None):
        self.client.force_authenticate(requestor)
        return self.client.get(self.url(target or self.client_user))

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


# ===== ClientProfileAccessTests: grupo de pruebas de client profile access =====
class ClientProfileAccessTests(ClientProfileApiTestCase):
    def test_admin_can_read_any_client(self):
        """IT-CRM-053 - Prueba de Integración - admin can read any client

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can read any client.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.client_user.pk))
        self.assertEqual(response.data["full_name"], "cliente")
        self.assertEqual(
            response.data["email"], self.client_user.email
        )
        self.assertEqual(response.data["phone"], "+51 987 654 321")
        self.assertTrue(response.data["is_active"])

    def test_assigned_agent_can_read(self):
        """IT-CRM-054 - Prueba de Integración - assigned agent can read

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: assigned agent can read.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.client_user.pk))
        self.assertEqual(response.data["full_name"], "cliente")

    def test_agent_without_assigned_appointments_gets_404(self):
        """IT-CRM-055 - Prueba de Integración - agent without assigned appointments gets 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent without assigned appointments gets 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get(self.agent, self.other_client),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )

        self.assertEqual(
            problem["detail"],
            "El cliente no existe o no tiene citas asignadas a tu cuenta.",
        )

    def test_client_role_is_forbidden(self):
        """IT-CRM-056 - Prueba de Integración - client role is forbidden

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
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
            "La ficha CRM del cliente solo está disponible para agentes y "
            "administradores.",
        )
        self.assertEqual(problem["required_roles"], [ROLE_AGENT, ROLE_ADMIN])

    def test_anonymous_is_unauthorized(self):
        """IT-CRM-057 - Prueba de Integración - anonymous is unauthorized

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
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
        """IT-CRM-058 - Prueba de Integración - nonexistent client gets 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: nonexistent client gets 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.admin)
        self.assertProblem(
            self.client.get("/api/v1/clients/999999/profile"),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )

    def test_agent_account_is_not_a_client(self):
        """IT-CRM-059 - Prueba de Integración - agent account is not a client

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileAccessTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent account is not a client.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.assertProblem(
            self.get(self.admin, self.agent),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )


# ===== ClientProfileContentTests: grupo de pruebas de client profile content =====
class ClientProfileContentTests(ClientProfileApiTestCase):
    def test_crm_profile_fields_are_exposed(self):
        """IT-CRM-060 - Prueba de Integración - crm profile fields are exposed

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: crm profile fields are exposed.
        Código HTTP Esperado: 180, 250
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 180, 250 y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        data = response.data

        self.assertEqual(float(data["budget_min"]), 1800.0)
        self.assertEqual(float(data["budget_max"]), 2500.0)
        self.assertEqual(data["budget_currency"], "PEN")
        self.assertEqual(data["preferred_district"], "Miraflores")
        self.assertEqual(data["preferences"]["mode"], "ALQUILER")
        self.assertEqual(data["preferences"]["districts"][0], "Miraflores")
        self.assertEqual(data["interest_level"], 4)

    def test_client_without_crm_profile_returns_nulls(self):
        """IT-CRM-061 - Prueba de Integración - client without crm profile returns nulls

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client without crm profile returns nulls.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin, self.other_client)
        data = response.data

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIsNone(data["budget_min"])
        self.assertIsNone(data["budget_max"])
        self.assertEqual(data["budget_currency"], "PEN")
        self.assertIsNone(data["preferred_district"])
        self.assertIsNone(data["preferences"])
        self.assertIsNone(data["interest_level"])

    def test_summary_counts_client_activity(self):
        """IT-CRM-062 - Prueba de Integración - summary counts client activity

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: summary counts client activity.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        summary = response.data["summary"]

        self.assertEqual(summary["appointments_total"], 5)
        self.assertEqual(summary["appointments_upcoming"], 1)
        self.assertEqual(summary["appointments_completed"], 2)
        self.assertEqual(summary["appointments_cancelled"], 1)
        self.assertEqual(summary["appointments_no_show"], 1)
        self.assertEqual(summary["properties_total"], 2)
        self.assertEqual(summary["favorite_properties_total"], 2)
        self.assertEqual(
            summary["last_appointment_at"], self.iso(self.completed.scheduled_at)
        )
        self.assertEqual(
            summary["next_appointment_at"], self.iso(self.pending.scheduled_at)
        )

    def test_summary_ignores_other_clients(self):
        """IT-CRM-063 - Prueba de Integración - summary ignores other clients

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: summary ignores other clients.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        summary = response.data["summary"]

        self.assertEqual(summary["appointments_total"], 5)
        self.assertEqual(summary["properties_total"], 2)

    def test_profile_does_not_query_per_appointment(self):
        """IT-CRM-064 - Prueba de Integración - profile does not query per appointment

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: profile does not query per appointment.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        with CaptureQueriesContext(connection) as queries:
            response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertLessEqual(len(queries), 5)

    def test_associated_properties_have_counts_and_order(self):
        """IT-CRM-065 - Prueba de Integración - associated properties have counts and order

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientProfileContentTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: associated properties have counts and order.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.admin)
        associated = response.data["associated_properties"]

        self.assertEqual(len(associated), 2)
        first, second = associated
        self.assertEqual(first["id"], str(self.property_one.id))
        self.assertEqual(first["appointments_count"], 4)
        self.assertEqual(
            first["last_appointment_at"], self.iso(self.completed.scheduled_at)
        )
        self.assertEqual(
            first["next_appointment_at"], self.iso(self.pending.scheduled_at)
        )
        self.assertEqual(second["id"], str(self.property_two.id))
        self.assertEqual(second["appointments_count"], 1)
        self.assertIsNone(second["next_appointment_at"])
        self.assertEqual(
            first["district"], self.district.name
        )
        self.assertEqual(first["title"], self.property_one.title)
        self.assertEqual(first["status"], self.property_one.status)
