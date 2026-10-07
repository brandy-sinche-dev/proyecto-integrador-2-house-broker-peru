"""Pruebas de HTTP de HU-PROP-05: favoritos por usuario (TASK-BACK-PROP-05).

Cada caso entra por la URL pública (`/api/v1/favorites/`) porque lo que se fija
aquí es el contrato que consume el botón de corazón y la vista Mis Favoritos:
código, cuerpo, idempotencia, `404` del inmueble y el `is_favorite` del
catálogo.
"""

from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.properties.models import Favorite, PropertyStatus
from apps.properties.permissions import ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

MISSING_UUID = "00000000-0000-4000-8000-000000000000"


class FavoriteApiTestCase(APITestCase):
    """Base con un cliente, un inmueble activo y la URL de favoritos."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.user = make_user("cliente", role=ROLE_CLIENT)
        self.other = make_user("otro-cliente", role=ROLE_CLIENT)
        self.property = make_property(self.district, self.agent, index=1, images=2)
        self.favorites_url = "/api/v1/favorites/"
        self.property_url = f"/api/v1/favorites/{self.property.id}/"

    def as_user(self):
        self.client.force_authenticate(self.user)
        return self

    def iso(self, value):
        return serializers.DateTimeField().to_representation(value)


class FavoriteAuthTests(FavoriteApiTestCase):
    def test_anonymous_is_asked_to_authenticate_on_every_endpoint(self):
        endpoints = (
            ("get", self.favorites_url, None),
            ("post", self.favorites_url, {"property_id": str(self.property.id)}),
            ("delete", self.property_url, None),
        )
        for method, url, body in endpoints:
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, body, format="json")
                self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(response.json()["code"], "unauthorized")


class FavoriteListTests(FavoriteApiTestCase):
    def test_empty_list_returns_zero_count(self):
        self.as_user()

        response = self.client.get(self.favorites_url)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response["X-Total-Count"], "0")
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_list_returns_favorites_newest_first(self):
        older = make_property(self.district, self.agent, index=2, images=1)
        newest = Favorite.objects.create(
            user=self.user, property=self.property, created_at=timezone.now()
        )
        oldest = Favorite.objects.create(
            user=self.user, property=older, created_at=timezone.now() - timedelta(days=2)
        )
        self.as_user()

        response = self.client.get(self.favorites_url)

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        first, second = response.data["results"]
        self.assertEqual(first["property"]["id"], str(newest.property_id))
        self.assertEqual(second["property"]["id"], str(oldest.property_id))
        self.assertEqual(first["added_at"], self.iso(newest.created_at))
        self.assertEqual(second["added_at"], self.iso(oldest.created_at))

    def test_list_card_carries_the_property_and_is_favorite(self):
        Favorite.objects.create(user=self.user, property=self.property)
        self.as_user()

        item = self.client.get(self.favorites_url).data["results"][0]

        self.assertEqual(item["property"]["id"], str(self.property.id))
        self.assertTrue(item["property"]["is_favorite"])
        self.assertEqual(item["property"]["title"], self.property.title)
        self.assertEqual(item["property"]["seller"]["email"], self.agent.email)
        self.assertEqual(len(item["property"]["images"]), 2)
        self.assertIn("added_at", item)

    def test_list_is_scoped_to_the_requesting_user(self):
        other_prop = make_property(self.district, self.agent, index=3)
        Favorite.objects.create(user=self.user, property=self.property)
        Favorite.objects.create(user=self.other, property=other_prop)
        self.as_user()

        response = self.client.get(self.favorites_url)

        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["property"]["id"], str(self.property.id)
        )

    def test_favorites_of_a_deactivated_property_stay_listed(self):
        Favorite.objects.create(user=self.user, property=self.property)
        self.property.status = PropertyStatus.SUSPENDIDO
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])
        self.as_user()

        item = self.client.get(self.favorites_url).data["results"][0]

        self.assertEqual(item["property"]["id"], str(self.property.id))
        self.assertFalse(item["property"]["is_active"])
        self.assertTrue(item["property"]["is_favorite"])

    def test_query_count_does_not_grow_with_the_number_of_favorites(self):
        for index in range(2):
            prop = make_property(self.district, self.agent, index=100 + index, images=2)
            Favorite.objects.create(user=self.user, property=prop)

        with CaptureQueriesContext(connection) as small:
            self.as_user()
            response = self.client.get(self.favorites_url)
        self.assertEqual(response.data["count"], 2)

        Favorite.objects.all().delete()
        for index in range(6):
            prop = make_property(self.district, self.agent, index=200 + index, images=2)
            Favorite.objects.create(user=self.user, property=prop)

        with CaptureQueriesContext(connection) as large:
            self.as_user()
            self.client.get(self.favorites_url)

        self.assertEqual(len(small), len(large))
        self.assertLessEqual(len(large), 4)


class FavoriteAddTests(FavoriteApiTestCase):
    def test_post_adds_and_answers_200_with_the_favorite(self):
        self.as_user()

        response = self.client.post(
            self.favorites_url, {"property_id": str(self.property.id)}, format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        favorite = Favorite.objects.get()
        body = response.json()
        self.assertEqual(body["property"]["id"], str(self.property.id))
        self.assertTrue(body["property"]["is_favorite"])
        self.assertEqual(body["added_at"], self.iso(favorite.created_at))
        self.assertEqual(favorite.user_id, self.user.pk)
        self.assertEqual(favorite.property_id, self.property.id)

    def test_post_is_idempotent_and_keeps_the_original_added_at(self):
        self.as_user()

        first = self.client.post(
            self.favorites_url, {"property_id": str(self.property.id)}, format="json"
        ).json()
        second = self.client.post(
            self.favorites_url, {"property_id": str(self.property.id)}, format="json"
        ).json()

        self.assertEqual(second["added_at"], first["added_at"])
        self.assertEqual(Favorite.objects.count(), 1)

    def test_post_with_malformed_uuid_is_400(self):
        self.as_user()

        response = self.client.post(
            self.favorites_url, {"property_id": "no-es-uuid"}, format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_query_parameter")
        self.assertEqual(problem["errors"][0]["parameter"], "property_id")

    def test_post_with_unknown_property_is_404(self):
        self.as_user()

        response = self.client.post(
            self.favorites_url, {"property_id": MISSING_UUID}, format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["code"], "resource_not_found")
        self.assertFalse(Favorite.objects.exists())

    def test_post_with_inactive_property_is_404(self):
        inactive = make_property(self.district, self.agent, index=4, is_active=False)
        self.as_user()

        response = self.client.post(
            self.favorites_url, {"property_id": str(inactive.id)}, format="json"
        )

        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)
        self.assertFalse(Favorite.objects.exists())

    def test_post_with_unknown_field_is_rejected(self):
        self.as_user()

        response = self.client.post(
            self.favorites_url,
            {"property_id": str(self.property.id), "motivo": "me gusta"},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)
        problem = response.json()
        self.assertEqual(problem["code"], "invalid_query_parameter")
        self.assertEqual(problem["errors"][0]["parameter"], "motivo")
        self.assertFalse(Favorite.objects.exists())


class FavoriteRemoveTests(FavoriteApiTestCase):
    def test_delete_removes_and_answers_204(self):
        Favorite.objects.create(user=self.user, property=self.property)
        self.as_user()

        response = self.client.delete(self.property_url)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        self.assertFalse(Favorite.objects.exists())

    def test_delete_is_idempotent_when_it_was_not_a_favorite(self):
        self.as_user()

        first = self.client.delete(self.property_url)
        second = self.client.delete(self.property_url)

        self.assertEqual(first.status_code, http_status.HTTP_204_NO_CONTENT)
        self.assertEqual(second.status_code, http_status.HTTP_204_NO_CONTENT)

    def test_delete_does_not_touch_other_users_favorites(self):
        Favorite.objects.create(user=self.other, property=self.property)
        self.as_user()

        response = self.client.delete(self.property_url)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        self.assertTrue(Favorite.objects.filter(user=self.other).exists())

    def test_delete_with_unknown_property_is_404(self):
        self.as_user()

        response = self.client.delete(f"/api/v1/favorites/{MISSING_UUID}/")

        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["code"], "resource_not_found")

    def test_delete_with_malformed_uuid_is_404_and_not_400(self):
        self.as_user()

        response = self.client.delete("/api/v1/favorites/no-es-uuid/")

        self.assertEqual(response.status_code, http_status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["code"], "resource_not_found")

    def test_delete_works_on_a_deactivated_property(self):
        Favorite.objects.create(user=self.user, property=self.property)
        self.property.status = PropertyStatus.SUSPENDIDO
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])
        self.as_user()

        response = self.client.delete(self.property_url)

        self.assertEqual(response.status_code, http_status.HTTP_204_NO_CONTENT)
        self.assertFalse(Favorite.objects.exists())


class CatalogFavoriteTests(APITestCase):
    """`Property.is_favorite`: el corazón del catálogo (v1.8.0)."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.user = make_user("cliente", role=ROLE_CLIENT)
        self.other = make_user("otro-cliente", role=ROLE_CLIENT)
        self.favorite_prop = make_property(self.district, self.agent, index=1, images=1)
        self.other_prop = make_property(self.district, self.agent, index=2, images=1)

    def catalog_item(self, prop_id):
        response = self.client.get("/api/v1/properties", {"limit": 10})
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        return next(
            item for item in response.data["results"] if item["id"] == str(prop_id)
        )

    def test_is_favorite_marks_only_the_own_favorites(self):
        Favorite.objects.create(user=self.user, property=self.favorite_prop)
        self.client.force_authenticate(self.user)

        self.assertTrue(self.catalog_item(self.favorite_prop.id)["is_favorite"])
        self.assertFalse(self.catalog_item(self.other_prop.id)["is_favorite"])

    def test_is_favorite_is_scoped_to_the_requesting_user(self):
        Favorite.objects.create(user=self.user, property=self.favorite_prop)
        self.client.force_authenticate(self.other)

        self.assertFalse(self.catalog_item(self.favorite_prop.id)["is_favorite"])

    def test_is_favorite_is_false_for_anonymous(self):
        self.assertFalse(self.catalog_item(self.favorite_prop.id)["is_favorite"])

    def test_retrieve_carries_is_favorite(self):
        Favorite.objects.create(user=self.user, property=self.favorite_prop)
        self.client.force_authenticate(self.user)

        response = self.client.get(f"/api/v1/properties/{self.favorite_prop.id}")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertTrue(response.data["is_favorite"])