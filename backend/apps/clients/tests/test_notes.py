"""Pruebas de `GET`, `POST` y `DELETE /api/v1/clients/{id}/notes` (HU-CRM-04)."""

import pytest

from datetime import timedelta
from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.appointments.models import AppointmentStatus
from apps.clients.models import ClientNote
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

from .helpers import make_appointment

pytestmark = pytest.mark.integration


# ===== ClientNoteApiTestCase: grupo de pruebas de client note =====
class ClientNoteApiTestCase(APITestCase):
    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.second_agent = make_user("segundo_agente", role=ROLE_AGENT)
        self.other_agent = make_user("otro_agente", role=ROLE_AGENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.other_client = make_user("otro_cliente", role=ROLE_CLIENT)

        self.property = make_property(self.district, self.agent, index=1)
        self.second_property = make_property(
            self.district, self.second_agent, index=2
        )
        self.other_property = make_property(
            self.district, self.other_agent, index=3
        )

        now = timezone.now()
        self.appointment = make_appointment(
            self.property,
            self.client_user,
            self.agent,
            now + timedelta(days=2),
            AppointmentStatus.PENDING,
        )
        self.second_appointment = make_appointment(
            self.second_property,
            self.client_user,
            self.second_agent,
            now + timedelta(days=3),
            AppointmentStatus.CONFIRMED,
        )
        self.foreign_appointment = make_appointment(
            self.other_property,
            self.other_client,
            self.other_agent,
            now + timedelta(days=4),
            AppointmentStatus.PENDING,
        )

    def url(self, client=None, note_id=None):
        base = f"/api/v1/clients/{(client or self.client_user).pk}/notes"
        return base if note_id is None else f"{base}/{note_id}"

    def get(self, requestor, client=None):
        self.client.force_authenticate(requestor)
        return self.client.get(self.url(client))

    def post(self, requestor, data, client=None):
        self.client.force_authenticate(requestor)
        return self.client.post(self.url(client), data, format="json")

    def delete(self, requestor, note_id, client=None):
        self.client.force_authenticate(requestor)
        return self.client.delete(self.url(client, note_id))

    def make_note(self, client=None, author=None, created_at=None, **overrides):
        defaults = {"body": "Observación de seguimiento comercial."}
        defaults.update(overrides)
        note = ClientNote.objects.create(
            client=client or self.client_user,
            author=author or self.agent,
            **defaults,
        )
        if created_at is not None:
            ClientNote.objects.filter(pk=note.pk).update(created_at=created_at)
            note.refresh_from_db()
        return note

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        body = response.json()
        self.assertEqual(body["code"], code)
        return body


# ===== ClientNoteListTests: grupo de pruebas de client note list =====
class ClientNoteListTests(ClientNoteApiTestCase):
    def test_requires_authentication(self):
        """IT-CRM-022 - Prueba de Integración - requires authentication

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: requires authentication.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get(self.url())

        self.assertProblem(response, "unauthorized", http_status.HTTP_401_UNAUTHORIZED)

    def test_client_role_is_forbidden(self):
        """IT-CRM-023 - Prueba de Integración - client role is forbidden

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client role is forbidden.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.client_user)

        body = self.assertProblem(
            response, "forbidden", http_status.HTTP_403_FORBIDDEN
        )
        self.assertEqual(body["required_roles"], [ROLE_AGENT, ROLE_ADMIN])

    def test_unassigned_agent_gets_not_found(self):
        """IT-CRM-024 - Prueba de Integración - unassigned agent gets not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unassigned agent gets not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get(self.other_agent)

        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )

    def test_agent_assigned_to_client_can_read(self):
        """IT-CRM-025 - Prueba de Integración - agent assigned to client can read

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent assigned to client can read.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.make_note()

        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["body"], "Observación de seguimiento comercial.")

    def test_admin_can_read_any_client(self):
        """IT-CRM-026 - Prueba de Integración - admin can read any client

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can read any client.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.make_note()

        response = self.get(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_lists_newest_first_and_excludes_deleted(self):
        """IT-CRM-027 - Prueba de Integración - lists newest first and excludes deleted

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: lists newest first and excludes deleted.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        now = timezone.now()
        older = self.make_note(
            body="Nota antigua", created_at=now - timedelta(days=2)
        )
        newer = self.make_note(
            body="Nota reciente", created_at=now - timedelta(hours=1)
        )
        deleted = self.make_note(
            body="Nota eliminada", created_at=now - timedelta(days=1)
        )
        ClientNote.objects.filter(pk=deleted.pk).update(deleted_at=now)

        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response["X-Total-Count"], "2")
        self.assertEqual(
            [item["id"] for item in response.data["results"]],
            [str(newer.pk), str(older.pk)],
        )

    def test_list_does_not_query_author_per_note(self):
        """IT-CRM-028 - Prueba de Integración - list does not query author per note

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: list does not query author per note.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.make_note()
        self.client.force_authenticate(self.agent)
        with CaptureQueriesContext(connection) as one_note:
            first = self.client.get(self.url())

        for index in range(3):
            self.make_note(body=f"Nota {index}")

        with CaptureQueriesContext(connection) as four_notes:
            second = self.client.get(self.url())

        self.assertEqual(first.status_code, http_status.HTTP_200_OK)
        self.assertEqual(second.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(one_note), len(four_notes))

    def test_pagination_uses_page_and_limit(self):
        """IT-CRM-029 - Prueba de Integración - pagination uses page and limit

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteListTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: pagination uses page and limit.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        for index in range(3):
            self.make_note(body=f"Nota {index}")

        self.client.force_authenticate(self.agent)
        response = self.client.get(self.url() + "?page=2&limit=2")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 1)


# ===== ClientNoteCreateTests: grupo de pruebas de client note create =====
class ClientNoteCreateTests(ClientNoteApiTestCase):
    def test_agent_can_create_minimal_note(self):
        """IT-CRM-030 - Prueba de Integración - agent can create minimal note

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent can create minimal note.
        Código HTTP Esperado: 201 Created
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.agent, {"body": "  Llamada de seguimiento.  "})

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(response.data["client_id"], str(self.client_user.pk))
        self.assertEqual(response.data["author"]["id"], str(self.agent.pk))
        self.assertEqual(response.data["body"], "Llamada de seguimiento.")
        self.assertIsNone(response.data["appointment_id"])
        self.assertTrue(response["Location"].endswith(
            f"/api/v1/clients/{self.client_user.pk}/notes/{response.data['id']}"
        ))

        note = ClientNote.objects.get(pk=response.data["id"])
        self.assertEqual(note.author, self.agent)
        self.assertEqual(note.client, self.client_user)

    def test_agent_can_create_full_note(self):
        """IT-CRM-031 - Prueba de Integración - agent can create full note

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent can create full note.
        Código HTTP Esperado: 201 Created, 235
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created, 235 y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent,
            {
                "body": "El cliente pidió evaluar una contraoferta.",
                "appointment_id": str(self.appointment.pk),
                "interest_level": 4,
                "client_showed_up": True,
                "counteroffer_amount": "2350.00",
                "counteroffer_currency": "PEN",
                "followup_at": "2026-10-12T15:00:00Z",
            },
        )

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(response.data["appointment_id"], str(self.appointment.pk))
        self.assertEqual(response.data["interest_level"], 4)
        self.assertIs(response.data["client_showed_up"], True)
        self.assertEqual(float(response.data["counteroffer_amount"]), 2350.0)
        self.assertEqual(response.data["counteroffer_currency"], "PEN")
        self.assertTrue(response.data["followup_at"].endswith("Z"))

    def test_admin_can_create_for_any_client(self):
        """IT-CRM-032 - Prueba de Integración - admin can create for any client

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can create for any client.
        Código HTTP Esperado: 201 Created
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.admin, {"body": "Nota del administrador."})

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(response.data["author"]["id"], str(self.admin.pk))

    def test_client_role_is_forbidden(self):
        """IT-CRM-033 - Prueba de Integración - client role is forbidden

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client role is forbidden.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.client_user, {"body": "No autorizado."})

        self.assertProblem(
            response, "forbidden", http_status.HTTP_403_FORBIDDEN
        )

    def test_unassigned_agent_gets_not_found(self):
        """IT-CRM-034 - Prueba de Integración - unassigned agent gets not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unassigned agent gets not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.other_agent, {"body": "No visible."})

        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )

    def test_empty_body_is_rejected(self):
        """IT-CRM-035 - Prueba de Integración - empty body is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: empty body is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.agent, {"body": "   "})

        body = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "body")

    def test_missing_body_is_rejected(self):
        """IT-CRM-036 - Prueba de Integración - missing body is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: missing body is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.agent, {})

        body = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "body")

    def test_body_longer_than_limit_is_rejected(self):
        """IT-CRM-037 - Prueba de Integración - body longer than limit is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: body longer than limit is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.agent, {"body": "x" * 2001})

        body = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "body")

    def test_interest_level_out_of_range_is_rejected(self):
        """IT-CRM-038 - Prueba de Integración - interest level out of range is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: interest level out of range is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(self.agent, {"body": "Nota.", "interest_level": 6})

        body = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "interest_level")

    def test_counteroffer_amount_requires_currency(self):
        """IT-CRM-039 - Prueba de Integración - counteroffer amount requires currency

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: counteroffer amount requires currency.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent, {"body": "Nota.", "counteroffer_amount": "2000.00"}
        )

        body = self.assertProblem(
            response, "invalid_counteroffer", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            body["errors"][0]["parameter"], "counteroffer_currency"
        )

    def test_counteroffer_currency_requires_amount(self):
        """IT-CRM-040 - Prueba de Integración - counteroffer currency requires amount

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: counteroffer currency requires amount.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent, {"body": "Nota.", "counteroffer_currency": "PEN"}
        )

        body = self.assertProblem(
            response, "invalid_counteroffer", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "counteroffer_amount")

    def test_appointment_from_another_client_is_rejected(self):
        """IT-CRM-041 - Prueba de Integración - appointment from another client is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: appointment from another client is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent,
            {
                "body": "Nota.",
                "appointment_id": str(self.foreign_appointment.pk),
            },
        )

        body = self.assertProblem(
            response,
            "invalid_appointment_reference",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(body["errors"][0]["parameter"], "appointment_id")

    def test_unknown_fields_are_rejected(self):
        """IT-CRM-042 - Prueba de Integración - unknown fields are rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown fields are rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent, {"body": "Nota.", "author": str(self.other_agent.pk)}
        )

        body = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(body["errors"][0]["parameter"], "author")

    def test_counteroffer_is_persisted_as_decimal(self):
        """IT-CRM-043 - Prueba de Integración - counteroffer is persisted as decimal

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteCreateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: counteroffer is persisted as decimal.
        Código HTTP Esperado: 201 Created
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        response = self.post(
            self.agent,
            {
                "body": "Nota.",
                "counteroffer_amount": "1999.99",
                "counteroffer_currency": "USD",
            },
        )

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        note = ClientNote.objects.get(pk=response.data["id"])
        self.assertEqual(note.counteroffer_amount, Decimal("1999.99"))


# ===== ClientNoteDeleteTests: grupo de pruebas de client note delete =====
class ClientNoteDeleteTests(ClientNoteApiTestCase):
    def test_author_can_delete_own_note(self):
        """IT-CRM-044 - Prueba de Integración - author can delete own note

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: author can delete own note.
        Código HTTP Esperado: 204 No Content
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note()

        response = self.delete(self.agent, note.pk)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        note.refresh_from_db()
        self.assertIsNotNone(note.deleted_at)

    def test_deleted_note_disappears_from_list(self):
        """IT-CRM-045 - Prueba de Integración - deleted note disappears from list

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: deleted note disappears from list.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note()

        self.delete(self.agent, note.pk)
        response = self.get(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_repeated_delete_is_idempotent(self):
        """IT-CRM-046 - Prueba de Integración - repeated delete is idempotent

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: repeated delete is idempotent.
        Código HTTP Esperado: 204 No Content
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note()
        self.delete(self.agent, note.pk)
        note.refresh_from_db()
        first_deleted_at = note.deleted_at

        response = self.delete(self.agent, note.pk)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        note.refresh_from_db()
        self.assertEqual(note.deleted_at, first_deleted_at)

    def test_admin_can_delete_note_of_another_agent(self):
        """IT-CRM-047 - Prueba de Integración - admin can delete note of another agent

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can delete note of another agent.
        Código HTTP Esperado: 204 No Content
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note(author=self.second_agent)

        response = self.delete(self.admin, note.pk)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        note.refresh_from_db()
        self.assertIsNotNone(note.deleted_at)

    def test_assigned_agent_cannot_delete_another_agents_note(self):
        """IT-CRM-048 - Prueba de Integración - assigned agent cannot delete another agents note

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: assigned agent cannot delete another agents note.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note(author=self.agent)

        response = self.delete(self.second_agent, note.pk)

        body = self.assertProblem(
            response, "forbidden", http_status.HTTP_403_FORBIDDEN
        )
        self.assertIn("autor", body["detail"])
        note.refresh_from_db()
        self.assertIsNone(note.deleted_at)

    def test_unassigned_agent_gets_not_found(self):
        """IT-CRM-049 - Prueba de Integración - unassigned agent gets not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unassigned agent gets not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note()

        response = self.delete(self.other_agent, note.pk)

        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )

    def test_client_role_is_forbidden(self):
        """IT-CRM-050 - Prueba de Integración - client role is forbidden

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client role is forbidden.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note()

        response = self.delete(self.client_user, note.pk)

        self.assertProblem(
            response, "forbidden", http_status.HTTP_403_FORBIDDEN
        )

    def test_note_from_another_client_is_not_found(self):
        """IT-CRM-051 - Prueba de Integración - note from another client is not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: note from another client is not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        note = self.make_note(client=self.other_client, author=self.other_agent)

        response = self.delete(self.agent, note.pk)

        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )

    def test_malformed_note_id_is_not_found(self):
        """IT-CRM-052 - Prueba de Integración - malformed note id is not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: CRM / ClientNoteDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: malformed note id is not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-03
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = self.delete(self.agent, "no-es-un-uuid")

        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )
