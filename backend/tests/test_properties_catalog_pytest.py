"""Pruebas Pytest del catálogo público y los favoritos (HU-PROP-03 / HU-PROP-05).

Se centran en lo que consume el frontend de la vitrina: paginación, filtros
combinados, búsqueda sin acentos, ficha pública y el corazón de favoritos.
"""

import pytest
from rest_framework import status

from apps.properties.models import Favorite, PropertyStatus
from apps.properties.permissions import ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = pytest.mark.django_db

CATALOG = "/api/v1/properties"
FAVORITES = "/api/v1/favorites/"


@pytest.fixture
def district(db):
    return make_district()


@pytest.fixture
def other_district(db):
    return make_district(ubigeo="150132", name="San Isidro")


@pytest.fixture
def agent(db):
    return make_user("agente", role=ROLE_AGENT)


@pytest.fixture
def client_user(db):
    return make_user("cliente", role=ROLE_CLIENT)


@pytest.fixture
def other_client(db):
    return make_user("otro-cliente", role=ROLE_CLIENT)


# ===== TestPropertyCatalog: grupo de pruebas de property catalog =====
class TestPropertyCatalog:
    @pytest.mark.integration
    def test_list_is_paginated_and_reports_the_total(self, api, district, agent):
        """IT-PROP-142 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Camino feliz: pagina el catálogo y expone el total en el cuerpo y en X-Total-Count.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        for index in range(1, 4):
            make_property(district, agent, index=index)

        response = api.get(CATALOG)

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["count"] == 3
        assert len(body["results"]) == 3
        assert response["X-Total-Count"] == "3"

    @pytest.mark.integration
    def test_inactive_and_suspended_properties_are_hidden(self, api, district, agent):
        """IT-PROP-143 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Regla de negocio: excluye del catálogo las propiedades inactivas y suspendidas.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_property(district, agent, index=1)
        make_property(district, agent, index=2, is_active=False)
        make_property(district, agent, index=3, status=PropertyStatus.SUSPENDIDO)

        body = api.get(CATALOG).json()

        assert body["count"] == 1
        assert body["results"][0]["title"] == "Propiedad 1"

    @pytest.mark.integration
    def test_price_type_and_ubigeo_filters_combine_with_and(
        self, api, district, other_district, agent
    ):
        """IT-PROP-144 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Camino feliz: combina precio, tipo y ubigeo con AND.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_property(
            district, agent, index=1, price=100000, property_type="DEPARTAMENTO"
        )
        target = make_property(
            other_district, agent, index=2, price=250000, property_type="CASA"
        )

        body = api.get(
            CATALOG,
            {
                "minPrice": "200000",
                "maxPrice": "300000",
                "propertyType": "CASA",
                "ubigeo": "150132",
            },
        ).json()

        assert body["count"] == 1
        assert body["results"][0]["id"] == str(target.id)

    @pytest.mark.integration
    def test_search_is_accent_insensitive(self, api, district, agent):
        """IT-PROP-145 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Camino feliz: busca texto sin distinguir acentos ni mayúsculas.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        target = make_property(district, agent, index=1, title="Dúplex en Ñaña")

        body = api.get(CATALOG, {"search": "NANA"}).json()

        assert body["count"] == 1
        assert body["results"][0]["id"] == str(target.id)

    @pytest.mark.integration
    def test_empty_parameters_are_equivalent_to_omitted(
        self, api, district, agent
    ):
        """IT-PROP-146 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Borde: interpreta los parámetros vacíos como omitidos.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_property(district, agent, index=1)

        response = api.get(
            CATALOG,
            {
                "minPrice": "",
                "maxPrice": "",
                "propertyType": "",
                "ubigeo": "",
                "search": "",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1

    @pytest.mark.integration
    def test_invalid_filters_are_reported_together(self, api, assert_problem):
        """IT-PROP-147 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Error 400: agrupa todos los filtros inválidos en un único problem+json.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(
            CATALOG,
            {
                "minPrice": "abc",
                "maxPrice": "-1",
                "propertyType": "CASTILLO",
                "ubigeo": "123",
                "search": "a",
            },
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        parameters = {error["parameter"] for error in problem["errors"]}
        assert parameters == {
            "minPrice",
            "maxPrice",
            "propertyType",
            "ubigeo",
            "search",
        }

    @pytest.mark.integration
    def test_inverted_price_range_has_its_own_code(
        self, api, district, agent, assert_problem
    ):
        """IT-PROP-148 - Prueba de Integración — PropertyViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.list.
        Propósito del Escenario: Error 400: distingue el rango de precio invertido con un código propio.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        make_property(district, agent, index=1)

        response = api.get(CATALOG, {"minPrice": "300000", "maxPrice": "100000"})

        problem = assert_problem(
            response, "invalid_filter_range", status.HTTP_400_BAD_REQUEST
        )
        assert problem["title"] == "Rango de precio incoherente"

    @pytest.mark.integration
    def test_detail_returns_404_for_unknown_property(self, api):
        """IT-PROP-149 - Prueba de Integración — PropertyViewSet.retrieve.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.retrieve.
        Propósito del Escenario: Error 404: oculta una propiedad inexistente en la ficha pública.
        Código HTTP Esperado: 404 Not Found.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = api.get(f"{CATALOG}/00000000-0000-4000-8000-000000000000")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_detail_returns_404_for_inactive_property(self, api, district, agent):
        """IT-PROP-150 - Prueba de Integración — PropertyViewSet.retrieve.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.retrieve.
        Propósito del Escenario: Regla de negocio 404: una propiedad inactiva no se expone en la ficha pública.
        Código HTTP Esperado: 404 Not Found.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1, is_active=False)

        response = api.get(f"{CATALOG}/{prop.id}")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_is_favorite_is_false_for_anonymous_and_true_for_its_owner(
        self, api, authenticate, district, agent, client_user
    ):
        """IT-PROP-151 - Prueba de Integración — PropertyViewSet.retrieve.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.retrieve.
        Propósito del Escenario: Camino feliz: calcula is_favorite según el usuario autenticado.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1)
        Favorite.objects.create(user=client_user, property=prop)

        anonymous = api.get(f"{CATALOG}/{prop.id}").json()
        assert anonymous["is_favorite"] is False

        authenticate(client_user)
        authenticated = api.get(f"{CATALOG}/{prop.id}").json()
        assert authenticated["is_favorite"] is True


# ===== TestFavorites: grupo de pruebas de favorites =====
class TestFavorites:
    @pytest.mark.integration
    def test_favorites_require_authentication(self, api, assert_problem):
        """IT-PROP-152 - Prueba de Integración — FavoriteViewSet.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.
        Propósito del Escenario: Permisos 401: protege el listado y el alta de favoritos.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        assert_problem(
            api.get(FAVORITES), "unauthorized", status.HTTP_401_UNAUTHORIZED
        )
        assert_problem(
            api.post(FAVORITES, {"property_id": "x"}, format="json"),
            "unauthorized",
            status.HTTP_401_UNAUTHORIZED,
        )

    @pytest.mark.integration
    def test_create_is_idempotent(
        self, api, authenticate, district, agent, client_user
    ):
        """IT-PROP-153 - Prueba de Integración — FavoriteViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.create.
        Propósito del Escenario: Camino feliz: repetir el alta no duplica el favorito ni cambia added_at.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1)
        authenticate(client_user)

        first = api.post(FAVORITES, {"property_id": str(prop.id)}, format="json")
        second = api.post(FAVORITES, {"property_id": str(prop.id)}, format="json")

        assert first.status_code == status.HTTP_200_OK, first.content
        assert second.status_code == status.HTTP_200_OK
        assert first.json()["added_at"] == second.json()["added_at"]
        assert first.json()["property"]["is_favorite"] is True
        assert Favorite.objects.filter(user=client_user, property=prop).count() == 1

    @pytest.mark.integration
    def test_list_only_returns_the_requesting_users_favorites(
        self, api, authenticate, district, agent, client_user, other_client
    ):
        """IT-PROP-154 - Prueba de Integración — FavoriteViewSet.list.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.list.
        Propósito del Escenario: Regla de negocio: aísla los favoritos por usuario.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1)
        Favorite.objects.create(user=client_user, property=prop)
        Favorite.objects.create(user=other_client, property=prop)

        authenticate(client_user)
        body = api.get(FAVORITES).json()

        assert body["count"] == 1
        assert body["results"][0]["property"]["id"] == str(prop.id)

        authenticate(other_client)
        assert api.get(FAVORITES).json()["count"] == 1

    @pytest.mark.integration
    def test_unknown_property_returns_404_on_create(
        self, api, authenticate, client_user, assert_problem
    ):
        """IT-PROP-155 - Prueba de Integración — FavoriteViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.create.
        Propósito del Escenario: Error 404: rechaza un property_id que no existe.
        Código HTTP Esperado: 404 Not Found.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)

        response = api.post(
            FAVORITES,
            {"property_id": "00000000-0000-4000-8000-000000000000"},
            format="json",
        )

        assert_problem(response, "resource_not_found", status.HTTP_404_NOT_FOUND)

    @pytest.mark.integration
    def test_inactive_property_cannot_be_added_but_can_be_removed(
        self, api, authenticate, district, agent, client_user, assert_problem
    ):
        """IT-PROP-156 - Prueba de Integración — FavoriteViewSet.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.
        Propósito del Escenario: Regla de negocio: impide agregar una propiedad inactiva pero permite quitarla.
        Código HTTP Esperado: 404 Not Found y 204 No Content.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 404 Not Found y 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1, status=PropertyStatus.SUSPENDIDO)
        Favorite.objects.create(user=client_user, property=prop)
        authenticate(client_user)

        create = api.post(FAVORITES, {"property_id": str(prop.id)}, format="json")
        assert_problem(create, "resource_not_found", status.HTTP_404_NOT_FOUND)

        removed = api.delete(f"{FAVORITES}{prop.id}/")
        assert removed.status_code == status.HTTP_204_NO_CONTENT
        assert Favorite.objects.count() == 0

    @pytest.mark.integration
    def test_delete_is_idempotent(
        self, api, authenticate, district, agent, client_user
    ):
        """IT-PROP-157 - Prueba de Integración — FavoriteViewSet.destroy.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / FavoriteViewSet.destroy.
        Propósito del Escenario: Camino feliz: eliminar dos veces mantiene el resultado y responde 204.
        Código HTTP Esperado: 204 No Content.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 204 No Content y el efecto se refleja en el estado o la base de datos.
        """
        prop = make_property(district, agent, index=1)
        Favorite.objects.create(user=client_user, property=prop)
        authenticate(client_user)

        first = api.delete(f"{FAVORITES}{prop.id}/")
        second = api.delete(f"{FAVORITES}{prop.id}/")

        assert first.status_code == status.HTTP_204_NO_CONTENT
        assert second.status_code == status.HTTP_204_NO_CONTENT
        assert Favorite.objects.count() == 0
