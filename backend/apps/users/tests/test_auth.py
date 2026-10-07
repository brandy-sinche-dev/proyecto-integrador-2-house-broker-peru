from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class AuthEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_and_login(self):
        payload = {
            "email": "cliente@test.pe",
            "password": "ClaveSegura2026",
            "full_name": "Cliente Test",
            "role": "CLIENTE",
        }
        response = self.client.post("/api/v1/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data["role"], "CLIENTE")
        login = self.client.post(
            "/api/v1/auth/login",
            {"email": "cliente@test.pe", "password": "ClaveSegura2026"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.content)
        self.assertIn("access", login.data)
        self.assertEqual(login.data["user"]["email"], "cliente@test.pe")

    def test_register_rejects_non_client_role(self):
        response = self.client.post(
            "/api/v1/auth/register",
            {
                "email": "admin@test.pe",
                "password": "ClaveSegura2026",
                "full_name": "Admin",
                "role": "ADMINISTRADOR",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_invalid_credentials_same_response(self):
        response = self.client.post(
            "/api/v1/auth/login",
            {"email": "nadie@test.pe", "password": "ClaveSegura2026"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
