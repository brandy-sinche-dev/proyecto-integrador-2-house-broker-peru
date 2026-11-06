import pytest

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.integration

User = get_user_model()


# ===== AuthEndpointsTest: grupo de pruebas de auth endpoints =====
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

    def test_register_then_login_returns_created_and_token(self):
        """IT-AUTH-001 - Prueba de Integración - register then login returns created and token

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / AuthEndpointsTest.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: register then login returns created and token.
        Código HTTP Esperado: 201 Created, 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 201 Created, 200 OK y el efecto se refleja en el estado o la base de datos.
        """
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
        """IT-AUTH-002 - Prueba de Integración - register rejects non client role

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / AuthEndpointsTest.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: register rejects non client role.
        Código HTTP Esperado: 400 Bad Request
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
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
        self.assertEqual(response.data["code"], "invalid_query_parameter")
        self.assertFalse(
            User.objects.filter(email="admin@test.pe").exists(),
            "El autorregistro no debe crear usuarios con rol administrativo.",
        )

    def test_login_invalid_credentials_same_response(self):
        """IT-AUTH-003 - Prueba de Integración - login invalid credentials same response

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / AuthEndpointsTest.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: login invalid credentials same response.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.post(
            "/api/v1/auth/login",
            {"email": "nadie@test.pe", "password": "ClaveSegura2026"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "invalid_credentials")
        self.assertNotIn("access", response.data)

    def test_refresh_rotates_session(self):
        """IT-AUTH-004 - El refresh lee el claim configurado (`sub`), no `user_id`.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / AuthEndpointsTest.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: refresh rotates session.
        Código HTTP Esperado: 200 OK
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        login = self._login()
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.content)

        first = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.content)
        self.assertIn("access", first.data)
        self.assertEqual(first.data["user"]["email"], self.credentials[0])

        second = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.content)

    def test_refresh_rejects_reused_token(self):
        """IT-AUTH-005 - Prueba de Integración - refresh rejects reused token

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / AuthEndpointsTest.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: refresh rejects reused token.
        Código HTTP Esperado: 200 OK, 401 Unauthorized
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK, 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
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
