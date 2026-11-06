"""Pruebas de HTTP de `POST`/`PUT`/`DELETE /api/v1/properties` (HU-PROP-01/02).

El contrato `PropertyInput` no trae `code`, `agent` ni `district`: el servidor
decide los tres. El distrito se resuelve por el nombre contenido en la
dirección, y la escritura exige un `AGENTE` o un `ADMINISTRADOR`. La baja es
lógica (`is_active=False`) y devuelve el inmueble, no un cuerpo vacío.
"""

import pytest

from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.properties.models import Property, PropertyStatus
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = pytest.mark.integration

BASE = "/api/v1/properties"


def minimal_payload(**overrides):
    """Mínimo de `PropertyInput` (los `required` del schema)."""
    payload = {
        "title": "Departamento en San Isidro",
        "price": "250000",
        "moneda": "PEN",
        "mode": "VENTA",
        "address": "Av. Los Conquistadores 951, San Isidro",
        "property_type": "DEPARTAMENTO",
    }
    payload.update(overrides)
    return payload


# ===== PropertyCrudTestCase: grupo de pruebas de property crud =====
class PropertyCrudTestCase(APITestCase):
    def setUp(self):
        self.district = make_district(ubigeo="150131", name="San Isidro")
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.admin = make_user("admin", role=ROLE_ADMIN, staff=True)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)

    def request(self, method, path, user=None, payload=None):
        if user is not None:
            self.client.force_authenticate(user)
        response = getattr(self.client, method)(
            path, data=payload, format="json" if payload is not None else None
        )
        self.client.force_authenticate(None)
        return response

    def create_ok(self, user, **overrides):
        return self.request(
            "post", BASE, user=user, payload=minimal_payload(**overrides)
        )

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        problem = response.json()
        self.assertEqual(problem["code"], code)
        self.assertEqual(
            problem["status"], status_code, f"el `status` debe coincidir: {problem}"
        )
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/problem+json"
        )
        return problem


# ===== PropertyCreatePermissionTests: grupo de pruebas de property create permission =====
class PropertyCreatePermissionTests(PropertyCrudTestCase):
    def test_anonymous_create_is_rejected_with_401(self):
        """IT-PROP-124 - Prueba de Integración - anonymous create is rejected with 401

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreatePermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous create is rejected with 401.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.request("post", BASE, payload=minimal_payload()),
            "unauthorized",
            http_status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(Property.objects.count(), 0)

    def test_client_create_is_rejected_with_403(self):
        """IT-PROP-125 - Prueba de Integración - client create is rejected with 403

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreatePermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client create is rejected with 403.
        Código HTTP Esperado: 403 Forbidden
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.create_ok(self.client_user),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "Solo un agente o un administrador puede registrar propiedades.",
        )
        self.assertEqual(
            problem["required_roles"], [ROLE_AGENT, ROLE_ADMIN]
        )
        self.assertEqual(Property.objects.count(), 0)

    def test_agent_create_returns_201_with_server_managed_fields(self):
        """IT-PROP-126 - Prueba de Integración - agent create returns 201 with server managed fields

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreatePermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent create returns 201 with server managed fields.
        Código HTTP Esperado: 201 Created, 250
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 201 Created, 250 y el efecto se refleja en el estado o la base de datos.
        """
        response = self.create_ok(self.agent)

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        body = response.json()
        prop = Property.objects.get()

        self.assertEqual(str(prop.id), body["id"])
        self.assertEqual(prop.code, "PROP-00001")
        self.assertEqual(prop.agent, self.agent)
        self.assertEqual(prop.created_by, self.agent)
        self.assertEqual(prop.district, self.district)
        self.assertEqual(prop.title, "Departamento en San Isidro")
        self.assertEqual(prop.price, 250000)
        self.assertEqual(prop.currency, "PEN")
        self.assertEqual(prop.mode, "VENTA")
        self.assertEqual(prop.status, PropertyStatus.DISPONIBLE)
        self.assertTrue(prop.is_active)
        self.assertEqual(body["moneda"], "PEN")
        self.assertEqual(body["mode"], "VENTA")
        self.assertEqual(body["status"], PropertyStatus.DISPONIBLE)
        self.assertIn("Location", response)
        self.assertIn(f"/{prop.id}", response["Location"])

    def test_admin_create_returns_201(self):
        """IT-PROP-127 - Prueba de Integración - admin create returns 201

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreatePermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin create returns 201.
        Código HTTP Esperado: 201 Created
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        response = self.create_ok(self.admin)

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Property.objects.count(), 1)

    def test_new_property_appears_in_public_catalog(self):
        """IT-PROP-128 - Prueba de Integración - new property appears in public catalog

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreatePermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: new property appears in public catalog.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.create_ok(self.agent)
        response = self.client.get(BASE)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)


# ===== PropertyCreateValidationTests: grupo de pruebas de property create validation =====
class PropertyCreateValidationTests(PropertyCrudTestCase):
    def test_unknown_field_is_rejected_with_400(self):
        """IT-PROP-129 - Prueba de Integración - unknown field is rejected with 400

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreateValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown field is rejected with 400.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.create_ok(self.agent, campo_extra="x"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            problem["errors"],
            [{"parameter": "campo_extra", "message": "Campo no reconocido."}],
        )
        self.assertEqual(Property.objects.count(), 0)

    def test_missing_required_field_is_rejected_with_400(self):
        """IT-PROP-130 - Prueba de Integración - missing required field is rejected with 400

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreateValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: missing required field is rejected with 400.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        payload = minimal_payload()
        payload.pop("mode")

        problem = self.assertProblem(
            self.request("post", BASE, user=self.agent, payload=payload),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertTrue(
            any(err["parameter"] == "mode" for err in problem["errors"])
        )
        self.assertEqual(Property.objects.count(), 0)

    def test_price_below_minimum_is_rejected_with_400(self):
        """IT-PROP-131 - Prueba de Integración - price below minimum is rejected with 400

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreateValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: price below minimum is rejected with 400.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.create_ok(self.agent, price="0.00001"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertTrue(
            any(err["parameter"] == "price" for err in problem["errors"])
        )
        self.assertEqual(Property.objects.count(), 0)

    def test_address_without_known_district_is_rejected_with_400(self):
        """IT-PROP-132 - Prueba de Integración - address without known district is rejected with 400

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCreateValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: address without known district is rejected with 400.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.create_ok(self.agent, address="Calle Los Pinos 123"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            problem["errors"],
            [
                {
                    "parameter": "address",
                    "message": "La dirección no menciona un distrito registrado.",
                }
            ],
        )
        self.assertEqual(Property.objects.count(), 0)


# ===== PropertyUpdateTests: grupo de pruebas de property update =====
class PropertyUpdateTests(PropertyCrudTestCase):
    def setUp(self):
        super().setUp()
        self.property = make_property(self.district, self.agent, index=1)

    def url(self, prop):
        return f"{BASE}/{prop.id}"

    def test_agent_updates_own_property(self):
        """IT-PROP-133 - Prueba de Integración - agent updates own property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyUpdateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent updates own property.
        Código HTTP Esperado: 200 OK, 280
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK, 280 y el efecto se refleja en el estado o la base de datos.
        """
        before_active = self.property.is_active
        before_code = self.property.code
        before_created = self.property.created_at
        before_status = self.property.status

        response = self.request(
            "put",
            self.url(self.property),
            user=self.agent,
            payload=minimal_payload(price="280000", mode="ALQUILER"),
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.property.refresh_from_db()
        body = response.json()

        self.assertEqual(self.property.price, 280000)
        self.assertEqual(self.property.mode, "ALQUILER")
        self.assertEqual(self.property.district, self.district)
        self.assertEqual(body["price"], 280000.0)
        self.assertEqual(body["mode"], "ALQUILER")
        self.assertEqual(self.property.code, before_code)
        self.assertEqual(self.property.is_active, before_active)
        self.assertEqual(self.property.created_at, before_created)
        self.assertEqual(self.property.status, before_status)

    def test_admin_updates_any_property(self):
        """IT-PROP-134 - Prueba de Integración - admin updates any property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyUpdateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin updates any property.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        other = make_user("agente2", role=ROLE_AGENT)
        self.property.agent = other
        self.property.save(update_fields=["agent"])

        response = self.request(
            "put",
            self.url(self.property),
            user=self.admin,
            payload=minimal_payload(title="Renovado por admin"),
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.property.refresh_from_db()
        self.assertEqual(self.property.title, "Renovado por admin")

    def test_agent_cannot_update_another_agents_property(self):
        """IT-PROP-135 - Prueba de Integración - agent cannot update another agents property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyUpdateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent cannot update another agents property.
        Código HTTP Esperado: 403 Forbidden
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        other = make_user("agente2", role=ROLE_AGENT)
        self.property.agent = other
        self.property.save(update_fields=["agent"])

        problem = self.assertProblem(
            self.request(
                "put",
                self.url(self.property),
                user=self.agent,
                payload=minimal_payload(),
            ),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )
        self.property.refresh_from_db()
        self.assertEqual(self.property.title, "Propiedad 1")

    def test_client_cannot_update_property(self):
        """IT-PROP-136 - Prueba de Integración - client cannot update property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyUpdateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client cannot update property.
        Código HTTP Esperado: 403 Forbidden
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.request(
                "put",
                self.url(self.property),
                user=self.client_user,
                payload=minimal_payload(),
            ),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

    def test_update_of_missing_property_is_404(self):
        """IT-PROP-137 - Prueba de Integración - update of missing property is 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyUpdateTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: update of missing property is 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = self.request(
            "put",
            f"{BASE}/00000000-0000-0000-0000-000000000000",
            user=self.agent,
            payload=minimal_payload(),
        )
        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)


# ===== PropertyDeleteTests: grupo de pruebas de property delete =====
class PropertyDeleteTests(PropertyCrudTestCase):
    def setUp(self):
        super().setUp()
        self.property = make_property(self.district, self.agent, index=1)

    def url(self, prop):
        return f"{BASE}/{prop.id}"

    def test_agent_deletes_own_property_as_soft_delete(self):
        """IT-PROP-138 - Prueba de Integración - agent deletes own property as soft delete

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent deletes own property as soft delete.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        before_id = self.property.id

        response = self.request(
            "delete", self.url(self.property), user=self.agent
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        body = response.json()
        self.property.refresh_from_db()

        self.assertEqual(str(self.property.id), body["id"])
        self.assertFalse(self.property.is_active)
        self.assertIsNotNone(self.property.deleted_at)
        self.assertAlmostEqual(
            self.property.deleted_at, timezone.now(), delta=timezone.timedelta(seconds=5)
        )
        self.assertEqual(str(self.property.id), str(before_id))

    def test_deleted_property_vanishes_from_public_catalog(self):
        """IT-PROP-139 - Prueba de Integración - deleted property vanishes from public catalog

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: deleted property vanishes from public catalog.
        Código HTTP Esperado: 404 Not Found, 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found, 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        self.request("delete", self.url(self.property), user=self.agent)

        detail = self.client.get(self.url(self.property))
        self.assertEqual(detail.status_code, http_status.HTTP_404_NOT_FOUND)

        listing = self.client.get(BASE)
        self.assertEqual(listing.status_code, http_status.HTTP_200_OK)
        self.assertEqual(listing.json()["results"], [])

    def test_agent_cannot_delete_another_agents_property(self):
        """IT-PROP-140 - Prueba de Integración - agent cannot delete another agents property

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent cannot delete another agents property.
        Código HTTP Esperado: 403 Forbidden
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        other = make_user("agente2", role=ROLE_AGENT)
        self.property.agent = other
        self.property.save(update_fields=["agent"])

        problem = self.assertProblem(
            self.request("delete", self.url(self.property), user=self.agent),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )
        self.property.refresh_from_db()
        self.assertTrue(self.property.is_active)

    def test_anonymous_delete_is_rejected_with_401(self):
        """IT-PROP-141 - Prueba de Integración - anonymous delete is rejected with 401

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyDeleteTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous delete is rejected with 401.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.request("delete", self.url(self.property)),
            "unauthorized",
            http_status.HTTP_401_UNAUTHORIZED,
        )
        self.property.refresh_from_db()
        self.assertTrue(self.property.is_active)