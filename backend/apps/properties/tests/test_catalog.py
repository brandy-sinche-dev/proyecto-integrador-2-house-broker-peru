import pytest

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory

from apps.properties.models import District, Property, PropertyImage
from apps.properties.pagination import PropertyPagination

pytestmark = pytest.mark.integration

User = get_user_model()


def make_property(district, agent, index, active=True):
    prop = Property.objects.create(
        code=f"PROP-{index:05d}",
        title=f"Propiedad {index}",
        price=100000,
        currency="PEN",
        mode="VENTA",
        property_type="DEPARTAMENTO",
        status="DISPONIBLE" if active else "SUSPENDIDO",
        agent=agent,
        district=district,
        address=f"Av. Siempre Viva {index}",
        is_active=active,
    )
    PropertyImage.objects.create(
        property=prop,
        storage_key=f"propiedades/{index}/fachada.jpg",
        sort_order=0,
        is_cover=True,
        alt_text="Fachada",
    )
    PropertyImage.objects.create(
        property=prop,
        storage_key=f"propiedades/{index}/sala.jpg",
        sort_order=1,
    )
    return prop


# ===== PropertyCatalogTests: grupo de pruebas de property catalog =====
class PropertyCatalogTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.district = District.objects.create(
            ubigeo="150131", name="Miraflores", province="Lima"
        )
        cls.agent = User.objects.create_user(
            username="agente", email="agente@housebroker.pe", password="secret123"
        )
        for index in range(20):
            make_property(cls.district, cls.agent, index)

    def setUp(self):
        self.client = APIClient()

    def test_default_page_size_is_twelve(self):
        """IT-PROP-067 - Prueba de Integración - default page size is twelve

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: default page size is twelve.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 20)
        self.assertEqual(len(response.data["results"]), 12)
        self.assertEqual(response["X-Total-Count"], "20")

    def test_limit_query_param_shapes_the_page(self):
        """IT-PROP-068 - Prueba de Integración - limit query param shapes the page

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: limit query param shapes the page.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"limit": 5, "page": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNotNone(response.data["previous"])

    def test_limit_is_capped_at_max_page_size(self):
        """IT-PROP-069 - Prueba de Integración - limit is capped at max page size

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: limit is capped at max page size.
        Código HTTP Esperado: 100
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 100 y el efecto se refleja en el estado o la base de datos.
        """
        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/properties", {"limit": 1000}))
        self.assertEqual(PropertyPagination().get_page_size(request), 100)

    def test_page_zero_is_rejected(self):
        """IT-PROP-070 - Prueba de Integración - page zero is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: page zero is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"page": 0})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_query_parameter")
        self.assertEqual(response.json()["errors"][0]["parameter"], "page")

    def test_limit_zero_is_rejected(self):
        """IT-PROP-071 - Prueba de Integración - limit zero is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: limit zero is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"limit": 0})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_query_parameter")
        self.assertEqual(response.json()["errors"][0]["parameter"], "limit")

    def test_inactive_properties_are_excluded(self):
        """IT-PROP-072 - Prueba de Integración - inactive properties are excluded

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: inactive properties are excluded.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_property(self.district, self.agent, 999, active=False)
        response = self.client.get("/api/v1/properties")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 20)
        self.assertEqual(response["X-Total-Count"], "20")

    def test_payload_carries_key_catalog_fields(self):
        """IT-PROP-073 - Prueba de Integración - payload carries key catalog fields

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: payload carries key catalog fields.
        Código HTTP Esperado: N/A
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"limit": 1})
        item = response.data["results"][0]
        self.assertIn("price", item)
        self.assertEqual(item["moneda"], "PEN")
        self.assertEqual(item["mode"], "VENTA")
        self.assertIn("address", item)
        self.assertEqual(item["property_type"], "DEPARTAMENTO")
        self.assertEqual(item["seller"]["email"], "agente@housebroker.pe")
        self.assertEqual(len(item["images"]), 2)
        self.assertTrue(item["images"][0]["url"].startswith("https://cdn."))

    def test_retrieve_property_by_id(self):
        """IT-PROP-074 - Prueba de Integración - retrieve property by id

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: retrieve property by id.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        prop = Property.objects.first()
        response = self.client.get(f"/api/v1/properties/{prop.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(prop.id))

    def test_retrieve_inactive_property_returns_404(self):
        """IT-PROP-075 - Prueba de Integración - retrieve inactive property returns 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: retrieve inactive property returns 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(self.district, self.agent, 998, active=False)
        response = self.client.get(f"/api/v1/properties/{prop.id}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    def test_query_count_does_not_grow_with_result_size(self):
        """IT-PROP-076 - Prueba de Integración - query count does not grow with result size

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: query count does not grow with result size.
        Código HTTP Esperado: N/A
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        with CaptureQueriesContext(connection) as small:
            self.client.get("/api/v1/properties", {"limit": 3})
        with CaptureQueriesContext(connection) as large:
            self.client.get("/api/v1/properties", {"limit": 12})
        self.assertEqual(len(small), len(large))
        self.assertLessEqual(len(large), 4)

    def test_non_numeric_limit_is_rejected(self):
        """IT-PROP-077 - Prueba de Integración - non numeric limit is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: non numeric limit is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"limit": "abc"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_query_parameter")
        self.assertEqual(response.json()["errors"][0]["parameter"], "limit")

    def test_empty_page_param_is_treated_as_first_page(self):
        """IT-PROP-078 - Prueba de Integración - empty page param is treated as first page

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyCatalogTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: empty page param is treated as first page.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get("/api/v1/properties", {"page": ""})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 20)
        self.assertEqual(len(response.data["results"]), 12)
