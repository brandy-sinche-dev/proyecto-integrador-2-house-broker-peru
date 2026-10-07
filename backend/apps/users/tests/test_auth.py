from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class AuthEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.credentials = ("sesion@test.pe", "ClaveSegura2026")
        User.objects.create_user(
            username=self.credentials[0],
            email=self.credentials[0],
            password=self.credentials[1],
        )

    def _login(self):
        email, password = self.credentials
        return self.client.post(
            "/api/v1/auth/login",
            {"email": email, "password": password},
            format="json",
        )

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

    def test_refresh_rotates_session(self):
        """El refresh lee el claim configurado (`sub`), no `user_id`."""
        login = self._login()
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.content)

        first = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.content)
        self.assertIn("access", first.data)
        self.assertEqual(first.data["user"]["email"], self.credentials[0])

        second = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.content)

    def test_refresh_rejects_reused_token(self):
        login = self._login()
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.content)
        consumed = self.client.cookies["hb_refresh_token"].value

        self.assertEqual(
            self.client.post("/api/v1/auth/refresh").status_code,
            status.HTTP_200_OK,
        )

        self.client.cookies["hb_refresh_token"] = consumed
        reused = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED, reused.content)
        self.assertEqual(reused.data["code"], "refresh_token_reused")
