"""Pruebas de HTTP de RF-PROP-04: estado operativo, agenda y cascada.

Cada caso entra por la URL pública porque lo que se quiere fijar aquí es el
contrato que consume el panel del agente: código, cuerpo, contenido de
`application/problem+json` y efecto observable en el catálogo. Las reglas puras
que sostienen esos códigos están en `test_availability_rules.py`.
"""

import pytest

from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.properties.models import Property, PropertyStatus, PropertyStatusChange
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import (
    make_district,
    make_property,
    make_user,
    make_week,
)

pytestmark = pytest.mark.integration


# ===== AvailabilityApiTestCase: grupo de pruebas de availability =====
class AvailabilityApiTestCase(APITestCase):
    """Base con el mundo mínimo: un agente, un inmueble y sus URLs."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.property = make_property(self.district, self.agent, index=1)
        base = f"/api/v1/properties/{self.property.id}"
        self.status_url = f"{base}/status"
        self.schedules_url = f"{base}/schedules"

    def as_agent(self):
        self.client.force_authenticate(self.agent)
        return self


# ===== PropertyManagementApiTests: grupo de pruebas de property management =====
class PropertyManagementApiTests(AvailabilityApiTestCase):
    def setUp(self):
        super().setUp()
        self.property.status = PropertyStatus.SUSPENDIDO
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])
        self.detail_url = f"/api/v1/properties/{self.property.id}"
        self.management_url = f"{self.detail_url}/management"

    def test_assigned_agent_can_reopen_suspended_property(self):
        """IT-PROP-001 - Prueba de Integración - assigned agent can reopen suspended property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyManagementApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: assigned agent can reopen suspended property.
        Código HTTP Esperado: 404 Not Found, 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 404 Not Found, 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.as_agent()
        self.assertEqual(self.client.get(self.detail_url).status_code, 404)
        response = self.client.get(self.management_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "SUSPENDIDO")
        self.assertFalse(response.json()["is_active"])
        self.assertFalse(response.json()["is_bookable"])
        self.assertEqual(self.client.get(self.schedules_url).status_code, 200)
        response = self.client.patch(self.status_url, {"status": "DISPONIBLE"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_active"])
        self.assertEqual(self.client.get(self.detail_url).status_code, 200)

    def test_admin_can_read_suspended_management_detail(self):
        """IT-PROP-002 - Prueba de Integración - admin can read suspended management detail

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyManagementApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can read suspended management detail.
        Código HTTP Esperado: 200 OK, 404 Not Found
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK, 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(make_user("admin", role=ROLE_ADMIN))
        self.assertEqual(self.client.get(self.management_url).status_code, 200)
        self.assertEqual(self.client.get(self.detail_url).status_code, 404)

    def test_unassigned_agent_cannot_read_or_reopen_suspended_property(self):
        """IT-PROP-003 - Prueba de Integración - unassigned agent cannot read or reopen suspended property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyManagementApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unassigned agent cannot read or reopen suspended property.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(make_user("otro", role=ROLE_AGENT))
        self.assertEqual(self.client.get(self.management_url).status_code, 403)
        self.assertEqual(self.client.get(self.schedules_url).status_code, 403)
        response = self.client.patch(self.status_url, {"status": "DISPONIBLE"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.property.refresh_from_db()
        self.assertEqual(self.property.status, PropertyStatus.SUSPENDIDO)
        self.assertFalse(self.property.is_active)

    def test_anonymous_cannot_read_management_detail(self):
        """IT-PROP-004 - Prueba de Integración - anonymous cannot read management detail

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyManagementApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous cannot read management detail.
        Código HTTP Esperado: 401 Unauthorized, 404 Not Found
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 401 Unauthorized, 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.assertEqual(self.client.get(self.management_url).status_code, 401)
        self.assertEqual(self.client.get(self.detail_url).status_code, 404)

    def test_client_cannot_read_management_detail_even_if_assigned(self):
        """IT-PROP-005 - Prueba de Integración - client cannot read management detail even if assigned

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyManagementApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client cannot read management detail even if assigned.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        self.agent.role = ROLE_CLIENT
        self.client.force_authenticate(self.agent)
        self.assertEqual(self.client.get(self.management_url).status_code, 403)


# ===== PropertyStatusApiTests: grupo de pruebas de property status =====
class PropertyStatusApiTests(AvailabilityApiTestCase):
    def setUp(self):
        super().setUp()
        self.as_agent()

    def patch_status(self, **body):
        return self.client.patch(self.status_url, body, format="json")

    def test_patch_applies_the_transition_and_answers_the_new_state(self):
        """IT-PROP-006 - Prueba de Integración - patch applies the transition and answers the new state

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: patch applies the transition and answers the new state.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="El owner firmara la reserva")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/json"
        )
        body = response.json()
        self.assertEqual(body["id"], str(self.property.id))
        self.assertEqual(body["status"], "RESERVADO")
        self.assertEqual(body["previous_status"], "DISPONIBLE")
        self.assertTrue(body["is_active"])
        self.assertEqual(body["reason"], "El owner firmara la reserva")

        self.property.refresh_from_db()
        self.assertEqual(self.property.status, "RESERVADO")

    def test_result_carries_the_traceability_of_the_change(self):
        """IT-PROP-007 - Prueba de Integración - result carries the traceability of the change

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: result carries the traceability of the change.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="Reserva con dena")

        body = response.json()
        self.assertEqual(str(body["changed_by"]), str(self.agent.pk))
        self.assertTrue(body["changed_at"])

        change = PropertyStatusChange.objects.get()
        self.assertEqual(change.property_id, self.property.id)
        self.assertEqual(change.previous_status, "DISPONIBLE")
        self.assertEqual(change.new_status, "RESERVADO")
        self.assertEqual(change.reason, "Reserva con dena")
        self.assertEqual(change.changed_by_id, self.agent.pk)

    def test_reserved_can_be_sold_with_reason_and_remains_visible_not_bookable(self):
        """IT-PROP-008 - Prueba de Integración - reserved can be sold with reason and remains visible not bookable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reserved can be sold with reason and remains visible not bookable.
        Código HTTP Esperado: 400 Bad Request, 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request, 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.patch_status(status="RESERVADO", reason="Reserva firmada")
        response = self.patch_status(status="VENDIDO")
        self.assertEqual(response.status_code, 400)
        self.property.refresh_from_db()
        self.assertEqual(self.property.status, "RESERVADO")

        response = self.patch_status(status="VENDIDO", reason="Venta firmada")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["previous_status"], "RESERVADO")
        self.assertEqual(response.json()["status"], "VENDIDO")
        change = PropertyStatusChange.objects.get(new_status="VENDIDO")
        self.assertEqual(change.previous_status, "RESERVADO")
        self.assertEqual(change.reason, "Venta firmada")
        self.assertEqual(change.changed_by_id, self.agent.pk)
        detail = self.client.get(f"/api/v1/properties/{self.property.id}")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.json()["is_active"])
        self.assertFalse(detail.json()["is_bookable"])
        self.assertEqual(detail.json()["status"], "VENDIDO")

    def test_history_accumulates_one_row_per_transition(self):
        """IT-PROP-009 - Prueba de Integración - history accumulates one row per transition

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: history accumulates one row per transition.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.patch_status(status="RESERVADO", reason="Reserva con dena")
        self.patch_status(status="DISPONIBLE")

        history = {
            (change.previous_status, change.new_status, change.reason)
            for change in PropertyStatusChange.objects.all()
        }

        self.assertEqual(PropertyStatusChange.objects.count(), 2)
        self.assertEqual(
            history, {("DISPONIBLE", "RESERVADO", "Reserva con dena"), ("RESERVADO", "DISPONIBLE", None)}
        )

    def test_reserving_without_reason_is_rejected(self):
        """IT-PROP-010 - Prueba de Integración - reserving without reason is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reserving without reason is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_query_parameter")
        self.assertEqual(problem["errors"][0]["parameter"], "reason")
        self.property.refresh_from_db()
        self.assertEqual(self.property.status, "DISPONIBLE")
        self.assertFalse(PropertyStatusChange.objects.exists())

    def test_blank_reason_does_not_pass_as_a_reason(self):
        """IT-PROP-011 - Prueba de Integración - blank reason does not pass as a reason

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: blank reason does not pass as a reason.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="     ")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "reason")

    def test_reason_shorter_than_five_characters_is_rejected(self):
        """IT-PROP-012 - Prueba de Integración - reason shorter than five characters is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reason shorter than five characters is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="duda")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "reason")

    def test_reason_longer_than_five_hundred_characters_is_rejected(self):
        """IT-PROP-013 - Prueba de Integración - reason longer than five hundred characters is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reason longer than five hundred characters is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="a" * 501)

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "reason")

    def test_reason_is_optional_when_the_new_state_is_not_auditable(self):
        """IT-PROP-014 - Prueba de Integración - reason is optional when the new state is not auditable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reason is optional when the new state is not auditable.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "RESERVADO"
        self.property.save(update_fields=["status"])

        response = self.patch_status(status="DISPONIBLE")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIsNone(response.json()["reason"])

    def test_unknown_status_is_rejected(self):
        """IT-PROP-015 - Prueba de Integración - unknown status is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown status is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="EN_ALQUILER")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_query_parameter")
        self.assertEqual(response.json()["errors"][0]["parameter"], "status")

    def test_unknown_field_is_rejected_instead_of_ignored(self):
        """IT-PROP-016 - Prueba de Integración - unknown field is rejected instead of ignored

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown field is rejected instead of ignored.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="Va a firmarse", motivo="x")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_query_parameter")
        self.assertEqual([e["parameter"] for e in problem["errors"]], ["motivo"])
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/problem+json"
        )

    def test_transition_outside_the_matrix_is_rejected_with_the_example_code(self):
        """IT-PROP-017 - Prueba de Integración - transition outside the matrix is rejected with the example code

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: transition outside the matrix is rejected with the example code.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "ALQUILADO"
        self.property.save(update_fields=["status"])

        response = self.patch_status(status="VENDIDO", reason="Cierre de operacion")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_property_transition")
        self.assertEqual(
            problem["type"],
            "https://housebroker.pe/errors/invalid-property-transition",
        )
        self.assertEqual(problem["instance"], f"/api/v1/properties/{self.property.id}/status")
        self.assertEqual(problem["errors"][0]["parameter"], "status")
        self.property.refresh_from_db()
        self.assertEqual(self.property.status, "ALQUILADO")

    def test_terminal_status_cannot_go_back_to_disponible(self):
        """IT-PROP-018 - Prueba de Integración - terminal status cannot go back to disponible

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: terminal status cannot go back to disponible.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "VENDIDO"
        self.property.save(update_fields=["status"])

        response = self.patch_status(status="DISPONIBLE")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertIn("terminales", response.json()["detail"])

    def test_transition_to_the_same_status_is_rejected(self):
        """IT-PROP-019 - Prueba de Integración - transition to the same status is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: transition to the same status is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="DISPONIBLE")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_property_transition")

    def test_missing_status_is_rejected(self):
        """IT-PROP-020 - Prueba de Integración - missing status is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: missing status is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(reason="Sin estado nuevo")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "status")

    def test_suspension_takes_the_property_out_of_the_catalog(self):
        """IT-PROP-021 - Prueba de Integración - suspension takes the property out of the catalog

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: suspension takes the property out of the catalog.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="SUSPENDIDO", reason="El owner retiro el inmueble")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertFalse(response.json()["is_active"])
        self.property.refresh_from_db()
        self.assertFalse(self.property.is_active)
        self.assertNotIn(str(self.property.id), self.listed_ids())
        self.assertEqual(
            self.client.get(f"/api/v1/properties/{self.property.id}").status_code, 404
        )

    def test_reactivation_from_suspension_brings_the_property_back(self):
        """IT-PROP-022 - Prueba de Integración - reactivation from suspension brings the property back

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reactivation from suspension brings the property back.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "SUSPENDIDO"
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])

        response = self.patch_status(status="DISPONIBLE")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertTrue(response.json()["is_active"])
        self.property.refresh_from_db()
        self.assertTrue(self.property.is_active)
        self.assertIn(str(self.property.id), self.listed_ids())

    def test_reserving_keeps_the_property_visible_in_the_catalog(self):
        """IT-PROP-023 - Prueba de Integración - reserving keeps the property visible in the catalog

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyStatusApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reserving keeps the property visible in the catalog.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(status="RESERVADO", reason="Separo del catalogo")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertTrue(response.json()["is_active"])
        self.assertIn(str(self.property.id), self.listed_ids())

    def listed_ids(self):
        response = self.client.get("/api/v1/properties", {"limit": 50})
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        return [item["id"] for item in response.data["results"]]


# ===== CatalogCascadeTests: grupo de pruebas de catalog cascade =====
class CatalogCascadeTests(AvailabilityApiTestCase):
    """Lo que el estado operativo le cuenta al catálogo público."""

    def setUp(self):
        super().setUp()
        self.as_agent()

    def test_catalog_exposes_status_and_is_bookable(self):
        """IT-PROP-024 - Prueba de Integración - catalog exposes status and is bookable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / CatalogCascadeTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: catalog exposes status and is bookable.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties")

        item = response.data["results"][0]
        self.assertEqual(item["status"], "DISPONIBLE")
        self.assertTrue(item["is_bookable"])

    def test_reserved_property_is_listed_but_not_bookable(self):
        """IT-PROP-025 - Prueba de Integración - reserved property is listed but not bookable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / CatalogCascadeTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reserved property is listed but not bookable.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "RESERVADO"
        self.property.save(update_fields=["status"])

        item = self.client.get("/api/v1/properties").data["results"][0]
        self.assertEqual(item["status"], "RESERVADO")
        self.assertFalse(item["is_bookable"])

    def test_is_bookable_is_false_for_every_state_that_stays_listed(self):
        """IT-PROP-026 - Prueba de Integración - is bookable is false for every state that stays listed

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / CatalogCascadeTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: is bookable is false for every state that stays listed.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        for state in ("RESERVADO", "ALQUILADO", "VENDIDO"):
            with self.subTest(status=state):
                self.property.status = state
                self.property.save(update_fields=["status"])
                item = self.client.get("/api/v1/properties").data["results"][0]
                self.assertFalse(item["is_bookable"])

    def test_suspended_property_leaves_the_catalog_instead_of_going_unbookable(self):
        """IT-PROP-027 - Prueba de Integración - suspended property leaves the catalog instead of going unbookable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / CatalogCascadeTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: suspended property leaves the catalog instead of going unbookable.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.property.status = "SUSPENDIDO"
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])

        listing = self.client.get("/api/v1/properties").data["results"]
        detail = self.client.get(f"/api/v1/properties/{self.property.id}")

        self.assertEqual(listing, [])
        self.assertEqual(detail.status_code, http_status.HTTP_404_NOT_FOUND)


# ===== PropertySchedulesApiTests: grupo de pruebas de property schedules =====
class PropertySchedulesApiTests(AvailabilityApiTestCase):
    def setUp(self):
        super().setUp()
        self.as_agent()

    def test_empty_week_always_lists_the_seven_days_from_monday(self):
        """IT-PROP-028 - Prueba de Integración - empty week always lists the seven days from monday

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: empty week always lists the seven days from monday.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get(self.schedules_url)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["property_id"], str(self.property.id))
        self.assertEqual(body["timezone"], "America/Lima")
        self.assertEqual(body["total_slots"], 0)
        self.assertEqual(
            [day["weekday"] for day in body["days"]],
            ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
        )
        self.assertTrue(all(day["slots"] == [] for day in body["days"]))

    def test_put_creates_the_slots_and_answers_them_sorted(self):
        """IT-PROP-029 - Prueba de Integración - put creates the slots and answers them sorted

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: put creates the slots and answers them sorted.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url,
            make_week(("SABADO", [("11:00", "13:00")]), ("LUNES", [("09:00", "12:00")])),
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["total_slots"], 2)
        monday = body["days"][0]
        self.assertEqual(monday["weekday"], "LUNES")
        self.assertEqual(monday["slots"][0]["start_time"], "09:00")
        self.assertEqual(monday["slots"][0]["end_time"], "12:00")
        self.assertTrue(monday["slots"][0]["is_active"])
        self.assertEqual(body["days"][5]["slots"][0]["start_time"], "11:00")

    def test_slots_are_persisted_with_the_weekday_smallint(self):
        """IT-PROP-030 - Prueba de Integración - slots are persisted with the weekday smallint

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slots are persisted with the weekday smallint.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "10:00")])), format="json"
        )

        slot = self.property.schedule_slots.get()
        self.assertEqual(slot.weekday, 0)
        self.assertEqual(slot.start_time.strftime("%H:%M"), "09:00")

    def test_repeated_put_keeps_the_slot_id_stable(self):
        """IT-PROP-031 - Prueba de Integración - repeated put keeps the slot id stable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: repeated put keeps the slot id stable.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        body = make_week(("LUNES", [("09:00", "12:00")]), ("MARTES", [("10:00", "11:00")]))
        first = self.client.put(self.schedules_url, body, format="json").json()
        second = self.client.put(self.schedules_url, body, format="json").json()

        self.assertEqual(first["total_slots"], second["total_slots"])
        self.assertEqual(
            [slot["id"] for day in first["days"] for slot in day["slots"]],
            [slot["id"] for day in second["days"] for slot in day["slots"]],
        )
        self.assertEqual(self.property.schedule_slots.count(), 2)

    def test_put_replaces_the_previous_week(self):
        """IT-PROP-032 - Prueba de Integración - put replaces the previous week

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: put replaces the previous week.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "12:00")])), format="json"
        )
        response = self.client.put(
            self.schedules_url, make_week(("MARTES", [("15:00", "16:00")])), format="json"
        )

        body = response.json()
        self.assertEqual(body["total_slots"], 1)
        self.assertEqual(body["days"][0]["slots"], [])
        self.assertEqual(body["days"][1]["slots"][0]["start_time"], "15:00")

    def test_removed_slots_are_deactivated_not_deleted(self):
        """IT-PROP-033 - Prueba de Integración - removed slots are deactivated not deleted

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: removed slots are deactivated not deleted.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.client.put(
            self.schedules_url,
            make_week(("LUNES", [("09:00", "12:00")]), ("MARTES", [("10:00", "11:00")])),
            format="json",
        )
        self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "12:00")])), format="json"
        )

        stale = self.property.schedule_slots.get(weekday=1)
        self.assertFalse(stale.is_active)

    def test_contiguous_slots_are_valid(self):
        """IT-PROP-034 - Prueba de Integración - contiguous slots are valid

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: contiguous slots are valid.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url,
            make_week(("LUNES", [("09:00", "12:00"), ("12:00", "15:00")])),
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.json()["total_slots"], 2)

    def test_overlapping_slots_are_rejected(self):
        """IT-PROP-035 - Prueba de Integración - overlapping slots are rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: overlapping slots are rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url,
            make_week(("LUNES", [("09:00", "12:00"), ("11:00", "15:00")])),
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "schedule_overlap")
        self.assertEqual(problem["errors"][0]["parameter"], "days[0].slots[1]")
        self.assertFalse(self.property.schedule_slots.exists())

    def test_end_before_start_is_rejected(self):
        """IT-PROP-036 - Prueba de Integración - end before start is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: end before start is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("15:00", "09:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_time_range")

    def test_zero_length_slot_is_rejected(self):
        """IT-PROP-037 - Prueba de Integración - zero length slot is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: zero length slot is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "09:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_time_range")

    def test_slot_shorter_than_thirty_minutes_is_rejected(self):
        """IT-PROP-038 - Prueba de Integración - slot shorter than thirty minutes is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slot shorter than thirty minutes is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "09:29")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_time_range")
        self.assertIn("30", problem["detail"])

    def test_slot_of_exactly_thirty_minutes_is_accepted(self):
        """IT-PROP-039 - Prueba de Integración - slot of exactly thirty minutes is accepted

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slot of exactly thirty minutes is accepted.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "09:30")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_slot_longer_than_eight_hours_is_rejected(self):
        """IT-PROP-040 - Prueba de Integración - slot longer than eight hours is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slot longer than eight hours is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("08:00", "16:01")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_time_range")

    def test_slot_of_exactly_eight_hours_is_accepted(self):
        """IT-PROP-041 - Prueba de Integración - slot of exactly eight hours is accepted

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slot of exactly eight hours is accepted.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("08:00", "16:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_more_than_six_slots_per_day_is_rejected(self):
        """IT-PROP-042 - Prueba de Integración - more than six slots per day is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: more than six slots per day is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url,
            make_week(
                (
                    "LUNES",
                    [
                        ("08:00", "08:30"),
                        ("09:00", "09:30"),
                        ("10:00", "10:30"),
                        ("11:00", "11:30"),
                        ("12:00", "12:30"),
                        ("13:00", "13:30"),
                        ("14:00", "14:30"),
                    ],
                )
            ),
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertIn("6", response.json()["detail"])

    def test_more_than_twenty_eight_slots_per_week_is_rejected(self):
        # Cinco franjas por día en siete días: 35 en total, dentro del tope
        # diario pero fuera del semanal, que es la regla que se quiere probar.
        """IT-PROP-043 - Prueba de Integración - more than twenty eight slots per week is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: more than twenty eight slots per week is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        body = {
            "days": [
                {
                    "weekday": day,
                    "slots": [
                        {"start_time": f"{5 + 2 * index:02d}:00", "end_time": f"{6 + 2 * index:02d}:00"}
                        for index in range(5)
                    ],
                }
                for day in ("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO")
            ]
        }

        response = self.client.put(self.schedules_url, body, format="json")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertIn("35", response.json()["detail"])
        self.assertIn("28", response.json()["detail"])

    def test_duplicate_weekday_is_rejected(self):
        """IT-PROP-044 - Prueba de Integración - duplicate weekday is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: duplicate weekday is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url,
            make_week(("LUNES", [("09:00", "10:00")]), ("LUNES", [("11:00", "12:00")])),
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "days[1]")

    def test_empty_week_is_accepted_and_clears_the_slots(self):
        """IT-PROP-045 - Prueba de Integración - empty week is accepted and clears the slots

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: empty week is accepted and clears the slots.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "10:00")])), format="json"
        )
        response = self.client.put(self.schedules_url, {"days": []}, format="json")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.json()["total_slots"], 0)
        self.assertFalse(self.property.schedule_slots.filter(is_active=True).exists())

    def test_day_without_slots_is_rejected(self):
        """IT-PROP-046 - Prueba de Integración - day without slots is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: day without slots is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "days[0].slots")

    def test_wrong_time_format_is_rejected(self):
        """IT-PROP-047 - Prueba de Integración - wrong time format is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: wrong time format is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("9:00", "12:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_time_range")
        self.assertEqual(problem["errors"][0]["parameter"], "days[0].slots[0].start_time")

    def test_out_of_clock_time_is_rejected(self):
        """IT-PROP-048 - Prueba de Integración - out of clock time is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: out of clock time is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("LUNES", [("09:00", "24:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "invalid_time_range")

    def test_unknown_weekday_is_rejected(self):
        """IT-PROP-049 - Prueba de Integración - unknown weekday is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown weekday is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(
            self.schedules_url, make_week(("FUNES", [("09:00", "10:00")])), format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "days[0].weekday")

    def test_unknown_slot_field_is_rejected(self):
        """IT-PROP-050 - Prueba de Integración - unknown slot field is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown slot field is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        body = make_week(("LUNES", [("09:00", "10:00")]))
        body["days"][0]["slots"][0]["capacity"] = 5

        response = self.client.put(self.schedules_url, body, format="json")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "capacity")

    def test_missing_days_key_is_rejected(self):
        """IT-PROP-051 - Prueba de Integración - missing days key is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: missing days key is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.put(self.schedules_url, {}, format="json")

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["errors"][0]["parameter"], "days")

    def test_get_after_put_returns_the_same_week(self):
        """IT-PROP-052 - Prueba de Integración - get after put returns the same week

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertySchedulesApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: get after put returns the same week.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        body = make_week(("JUEVES", [("09:00", "10:30"), ("16:00", "17:00")]))
        put_response = self.client.put(self.schedules_url, body, format="json")
        get_response = self.client.get(self.schedules_url)

        self.assertEqual(get_response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(get_response.json(), put_response.json())


# ===== AvailabilityPermissionTests: grupo de pruebas de availability permission =====
class AvailabilityPermissionTests(APITestCase):
    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.other = make_user("otro-agente", role=ROLE_AGENT)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.property = make_property(self.district, self.agent, index=1)
        self.endpoints = (
            ("get", f"/api/v1/properties/{self.property.id}/schedules"),
            ("put", f"/api/v1/properties/{self.property.id}/schedules"),
            ("patch", f"/api/v1/properties/{self.property.id}/status"),
        )
        self.bodies = {
            "get": None,
            "put": make_week(("LUNES", [("09:00", "10:00")])),
            "patch": {"status": "RESERVADO", "reason": "Reserva en firme"},
        }

    def call(self, method, url):
        return getattr(self.client, method)(url, self.bodies[method], format="json")

    def test_anonymous_is_asked_to_authenticate_on_every_endpoint(self):
        """IT-PROP-053 - Prueba de Integración - anonymous is asked to authenticate on every endpoint

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous is asked to authenticate on every endpoint.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        for method, url in self.endpoints:
            with self.subTest(method=method):
                response = self.call(method, url)
                self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(response.json()["code"], "unauthorized")

    def test_another_agent_receives_forbidden_with_the_roles_the_contract_lists(self):
        """IT-PROP-054 - Prueba de Integración - another agent receives forbidden with the roles the contract lists

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: another agent receives forbidden with the roles the contract lists.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.other)

        response = self.client.get(self.endpoints[0][1])

        problem = response.json()
        self.assertEqual(problem["code"], "forbidden")
        self.assertEqual(problem["required_roles"], ["AGENTE", "ADMINISTRADOR"])
        self.assertIn("agente asignado", problem["detail"])

    def test_assigned_agent_may_manage(self):
        """IT-PROP-055 - Prueba de Integración - assigned agent may manage

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: assigned agent may manage.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.agent)

        for method, url in self.endpoints:
            with self.subTest(method=method):
                response = self.call(method, url)
                self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_admin_may_manage_an_assigned_property(self):
        """IT-PROP-056 - Prueba de Integración - admin may manage an assigned property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin may manage an assigned property.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.admin)

        for method, url in self.endpoints:
            with self.subTest(method=method):
                response = self.call(method, url)
                self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_admin_may_manage_an_unassigned_property(self):
        """IT-PROP-057 - Prueba de Integración - admin may manage an unassigned property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin may manage an unassigned property.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        unassigned = make_property(self.district, None, index=2)
        self.client.force_authenticate(self.admin)

        response = self.client.get(f"/api/v1/properties/{unassigned.id}/schedules")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_staff_without_role_falls_back_to_the_admin_branch(self):
        """IT-PROP-058 - Prueba de Integración - staff without role falls back to the admin branch

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: staff without role falls back to the admin branch.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        legacy_admin = make_user("legacy-admin", staff=True)
        self.client.force_authenticate(legacy_admin)

        response = self.client.get(f"/api/v1/properties/{self.property.id}/schedules")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_another_agent_is_forbidden_on_all_three_endpoints(self):
        """IT-PROP-059 - Prueba de Integración - another agent is forbidden on all three endpoints

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: another agent is forbidden on all three endpoints.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.other)

        for method, url in self.endpoints:
            with self.subTest(method=method):
                response = self.call(method, url)
                self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_client_role_is_forbidden_even_if_it_were_the_assigned_agent(self):
        """IT-PROP-060 - Prueba de Integración - client role is forbidden even if it were the assigned agent

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client role is forbidden even if it were the assigned agent.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(self.district, self.client_user, index=3)
        self.client.force_authenticate(self.client_user)

        response = self.client.get(f"/api/v1/properties/{prop.id}/schedules")

        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_without_role_is_allowed_only_on_the_assigned_property(self):
        """IT-PROP-061 - Prueba de Integración - authenticated user without role is allowed only on the assigned property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: authenticated user without role is allowed only on the assigned property.
        Código HTTP Esperado: 403 Forbidden, 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden, 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        unassigned = make_property(self.district, None, index=4)
        roleless = make_user("sin-rol")
        owned = make_property(self.district, roleless, index=5)
        self.client.force_authenticate(roleless)

        forbidden = self.client.get(f"/api/v1/properties/{unassigned.id}/schedules")
        allowed = self.client.get(f"/api/v1/properties/{owned.id}/schedules")

        self.assertEqual(forbidden.status_code, http_status.HTTP_403_FORBIDDEN)
        self.assertEqual(allowed.status_code, http_status.HTTP_200_OK)

    def test_suspended_property_stays_manageable(self):
        """IT-PROP-062 - Prueba de Integración - suspended property stays manageable

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: suspended property stays manageable.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        suspended = make_property(
            self.district, self.agent, index=5, status="SUSPENDIDO"
        )
        self.client.force_authenticate(self.agent)

        response = self.client.get(f"/api/v1/properties/{suspended.id}/schedules")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_unknown_property_is_a_404_for_the_admin_and_not_a_permission_probe(self):
        """IT-PROP-063 - Prueba de Integración - unknown property is a 404 for the admin and not a permission probe

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown property is a 404 for the admin and not a permission probe.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        missing = "00000000-0000-4000-8000-000000000000"
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/v1/properties/{missing}/status",
            {"status": "RESERVADO", "reason": "Prueba de inexistente"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)

    def test_permission_is_checked_before_the_payload(self):
        """IT-PROP-064 - Prueba de Integración - permission is checked before the payload

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: permission is checked before the payload.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.other)

        response = self.client.patch(
            f"/api/v1/properties/{self.property.id}/status",
            {"estado": "RESERVADO"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_state_is_untouched_by_a_forbidden_request(self):
        """IT-PROP-065 - Prueba de Integración - state is untouched by a forbidden request

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: state is untouched by a forbidden request.
        Código HTTP Esperado: N/A
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.other)

        self.client.patch(
            f"/api/v1/properties/{self.property.id}/status",
            {"status": "SUSPENDIDO", "reason": "No deberia aplicarse"},
            format="json",
        )

        self.property.refresh_from_db()
        self.assertEqual(self.property.status, PropertyStatus.DISPONIBLE)
        self.assertTrue(self.property.is_active)
        self.assertEqual(PropertyStatusChange.objects.count(), 0)

    def test_public_catalog_stays_open_to_everyone(self):
        """IT-PROP-066 - Prueba de Integración - public catalog stays open to everyone

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / AvailabilityPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: public catalog stays open to everyone.
        Código HTTP Esperado: 200 OK
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(Property.objects.count(), 1)
