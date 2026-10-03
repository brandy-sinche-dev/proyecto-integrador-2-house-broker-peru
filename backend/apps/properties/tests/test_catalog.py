from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory

from apps.properties.models import District, Property, PropertyImage
from apps.properties.pagination import PropertyPagination

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
        response = self.client.get("/api/v1/properties")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 20)
        self.assertEqual(len(response.data["results"]), 12)
        self.assertEqual(response["X-Total-Count"], "20")

    def test_limit_query_param_shapes_the_page(self):
        response = self.client.get("/api/v1/properties", {"limit": 5, "page": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNotNone(response.data["previous"])

    def test_limit_is_capped_at_max_page_size(self):
        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/properties", {"limit": 1000}))
        self.assertEqual(PropertyPagination().get_page_size(request), 100)

    def test_page_zero_is_rejected(self):
        response = self.client.get("/api/v1/properties", {"page": 0})
        self.assertEqual(response.status_code, 400)

    def test_limit_zero_is_rejected(self):
        response = self.client.get("/api/v1/properties", {"limit": 0})
        self.assertEqual(response.status_code, 400)

    def test_inactive_properties_are_excluded(self):
        make_property(self.district, self.agent, 999, active=False)
        response = self.client.get("/api/v1/properties")
        self.assertEqual(response.data["count"], 20)

    def test_payload_carries_key_catalog_fields(self):
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
        prop = Property.objects.first()
        response = self.client.get(f"/api/v1/properties/{prop.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(prop.id))

    def test_retrieve_inactive_property_returns_404(self):
        prop = make_property(self.district, self.agent, 998, active=False)
        response = self.client.get(f"/api/v1/properties/{prop.id}")
        self.assertEqual(response.status_code, 404)

    def test_query_count_does_not_grow_with_result_size(self):
        with CaptureQueriesContext(connection) as small:
            self.client.get("/api/v1/properties", {"limit": 3})
        with CaptureQueriesContext(connection) as large:
            self.client.get("/api/v1/properties", {"limit": 12})
        self.assertEqual(len(small), len(large))
        self.assertLessEqual(len(large), 4)
