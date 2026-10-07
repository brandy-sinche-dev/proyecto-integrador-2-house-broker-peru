"""Filtros del catálogo `GET /api/v1/properties` (HU-PROP-03).

Cubre la tabla de `docs/api/README.md` §"Filtros de búsqueda": combinación AND
entre filtros distintos, OR dentro de `propertyType`/`ubigeo`, inclusividad de
los extremos, `search` case/accent-insensitive con mínimo de 2 caracteres, y el
rechazo `400` con todos las parámetros inválidos acumulados.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.properties.models import District, Property, PropertyStatus

from .helpers import make_property

User = get_user_model()


def _search_url(**params):
    """`/api/v1/properties` con los query params serializados."""
    query = "&".join(f"{key}={value}" for key, value in params.items() if value != "")
    return f"/api/v1/properties?{query}" if query else "/api/v1/properties"


class CatalogFiltersTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.district = District.objects.create(
            ubigeo="150131", name="Miraflores", province="Lima"
        )
        cls.district2 = District.objects.create(
            ubigeo="150140", name="Jesús María", province="Lima"
        )
        agent = User.objects.create_user(
            username="agente", email="agente@housebroker.pe", password="secret123"
        )

        make_property(
            cls.district,
            agent=agent,
            index=1,
            title="Departamento amoblado en Miraflores",
            price=Decimal("150000.00"),
            property_type="DEPARTAMENTO",
            mode="VENTA",
            address="Av. Larco 456, Miraflores",
            images=1,
        )
        make_property(
            cls.district2,
            agent=agent,
            index=2,
            title="Casa con jardín en Jesús María",
            price=Decimal("450000.00"),
            property_type="CASA",
            mode="VENTA",
            address="Jr. Salaverry 120, Jesús María",
            images=1,
        )
        make_property(
            cls.district,
            agent=agent,
            index=3,
            title="Terreno en venta en Miraflores Sur",
            price=Decimal("98000.00"),
            property_type="TERRENO",
            mode="VENTA",
            address="Calle La Marina 800, Miraflores",
            images=1,
        )
        make_property(
            cls.district,
            agent=agent,
            index=4,
            title="Oficina corporativa en San Isidro",
            price=Decimal("8000.00"),
            property_type="OFICINA",
            mode="ALQUILER",
            address="Av. El Derby 220, San Isidro",
            images=1,
        )
        make_property(
            cls.district,
            agent=agent,
            index=5,
            status=PropertyStatus.SUSPENDIDO,
            title="Departamento suspendido",
            price=Decimal("999999.00"),
            property_type="DEPARTAMENTO",
            mode="VENTA",
            address="Calle Oculta 1, Lima",
            images=0,
        )

    def setUp(self):
        self.client = APIClient()

    def _ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def _property_by_index(self, index):
        return Property.objects.get(code=f"PROP-{index:05d}")

    def test_no_filter_returns_all_active(self):
        response = self.client.get("/api/v1/properties", {"limit": 50})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 4)

    def test_search_by_title_ignores_case_and_accents(self):
        response = self.client.get(_search_url(search="MIRAFLORES", limit=50))
        ids = self._ids(response)
        self.assertIn(str(self._property_by_index(1).id), ids)
        self.assertIn(str(self._property_by_index(3).id), ids)
        self.assertNotIn(str(self._property_by_index(4).id), ids)

    def test_search_matches_address(self):
        response = self.client.get(_search_url(search="jesus maria", limit=50))
        ids = self._ids(response)
        self.assertEqual(
            ids, [str(self._property_by_index(2).id)]
        )

    def test_search_with_accented_query_finds_plain_title(self):
        response = self.client.get(_search_url(search="Casa con jardin", limit=50))
        self.assertIn(str(self._property_by_index(2).id), self._ids(response))

    def test_search_shorter_than_two_chars_is_rejected(self):
        response = self.client.get(_search_url(search="a"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["code"], "invalid_query_parameter")
        self.assertEqual(body["detail"], "El parámetro 'search' debe tener entre 2 y 120 caracteres.")
        self.assertEqual(
            body["errors"],
            [
                {
                    "parameter": "search",
                    "message": "El valor 'a' tiene 1 carácter y el mínimo es 2.",
                }
            ],
        )

    def test_search_longer_than_120_is_rejected(self):
        response = self.client.get(_search_url(search="a" * 121))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_query_parameter")

    def test_empty_search_is_treated_as_omitted(self):
        response = self.client.get(_search_url(search="", limit=50))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 4)

    def test_min_price_is_inclusive(self):
        response = self.client.get(_search_url(minPrice="150000", limit=50))
        ids = self._ids(response)
        self.assertIn(str(self._property_by_index(1).id), ids)
        self.assertIn(str(self._property_by_index(2).id), ids)
        self.assertNotIn(str(self._property_by_index(3).id), ids)

    def test_max_price_is_inclusive(self):
        response = self.client.get(_search_url(maxPrice="98000", limit=50))
        ids = self._ids(response)
        self.assertIn(str(self._property_by_index(3).id), ids)
        self.assertNotIn(str(self._property_by_index(1).id), ids)

    def test_price_range_filters_between(self):
        response = self.client.get(
            _search_url(minPrice="100000", maxPrice="460000", limit=50)
        )
        ids = self._ids(response)
        self.assertEqual(len(ids), 2)
        self.assertIn(str(self._property_by_index(1).id), ids)
        self.assertIn(str(self._property_by_index(2).id), ids)
        self.assertNotIn(str(self._property_by_index(3).id), ids)

    def test_inverted_price_range_is_rejected_with_specific_code(self):
        response = self.client.get(_search_url(minPrice="450000", maxPrice="150000"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["code"], "invalid_filter_range")
        self.assertEqual(body["title"], "Rango de precio incoherente")
        self.assertEqual(body["detail"], "`minPrice` no puede ser mayor que `maxPrice`.")
        self.assertEqual(
            body["errors"],
            [
                {
                    "parameter": "minPrice",
                    "message": "El valor '450000.0' es mayor que 'maxPrice' (150000.0).",
                }
            ],
        )

    def test_non_numeric_price_is_rejected(self):
        response = self.client.get(_search_url(minPrice="caro"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["code"], "invalid_query_parameter")
        self.assertEqual(body["errors"][0]["parameter"], "minPrice")

    def test_property_type_single_value(self):
        response = self.client.get(_search_url(propertyType="CASA", limit=50))
        ids = self._ids(response)
        self.assertEqual(ids, [str(self._property_by_index(2).id)])

    def test_property_type_multiple_values_are_or(self):
        response = self.client.get(
            f"/api/v1/properties?propertyType=CASA&propertyType=TERRENO&limit=50"
        )
        ids = self._ids(response)
        self.assertIn(str(self._property_by_index(2).id), ids)
        self.assertIn(str(self._property_by_index(3).id), ids)
        self.assertNotIn(str(self._property_by_index(1).id), ids)

    def test_invalid_property_type_is_rejected(self):
        response = self.client.get(_search_url(propertyType="DUPLEX"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["detail"], "El parámetro 'propertyType' admite los valores DEPARTAMENTO, CASA, TERRENO, OFICINA.")
        self.assertEqual(
            body["errors"],
            [
                {
                    "parameter": "propertyType",
                    "message": "El valor 'DUPLEX' no pertenece al conjunto permitido (DEPARTAMENTO, CASA, TERRENO, OFICINA).",
                }
            ],
        )

    def test_ubigeo_filters_by_district(self):
        response = self.client.get(_search_url(ubigeo="150140", limit=50))
        self.assertEqual(self._ids(response), [str(self._property_by_index(2).id)])

    def test_ubigeo_multiple_values_are_or(self):
        response = self.client.get(f"/api/v1/properties?ubigeo=150131&ubigeo=150140&limit=50")
        self.assertEqual(response.data["count"], 4)

    def test_malformed_ubigeo_is_rejected(self):
        response = self.client.get(_search_url(ubigeo="1501"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["code"], "invalid_query_parameter")
        self.assertEqual(
            body["errors"],
            [
                {
                    "parameter": "ubigeo",
                    "message": "El valor '1501' no cumple el formato de 6 dígitos (patrón ^\\d{6}$).",
                }
            ],
        )

    def test_filters_combine_with_and(self):
        response = self.client.get(
            _search_url(propertyType="DEPARTAMENTO", ubigeo="150131", minPrice="100000", limit=50)
        )
        # El único DEPARTAMENTO de Miraflores sobre 100000 es el index 1.
        self.assertEqual(self._ids(response), [str(self._property_by_index(1).id)])

    def test_multiple_invalid_params_are_reported_together(self):
        response = self.client.get(_search_url(propertyType="DUPLEX", search="a"))
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["detail"], "Se detectaron 2 parámetros de consulta inválidos.")
        params = [error["parameter"] for error in body["errors"]]
        self.assertEqual(params, ["propertyType", "search"])

    def test_x_total_count_reflects_filters(self):
        response = self.client.get(_search_url(propertyType="DEPARTAMENTO"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["X-Total-Count"], "1")
        self.assertEqual(response.data["count"], 1)

    def test_pagination_links_carry_filters(self):
        # 3 propiedades de Miraflores: minPrice deja 2, `limit=1` fuerza pages.
        response = self.client.get(
            _search_url(ubigeo="150131") + "&minPrice=50000&limit=1&page=1"
        )
        self.assertEqual(response.status_code, 200)
        next_url = response.data["next"]
        self.assertIsNotNone(next_url)
        self.assertIn("minPrice=50000", next_url)
        self.assertIn("ubigeo=150131", next_url)