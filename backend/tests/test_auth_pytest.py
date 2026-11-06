"""Pruebas Pytest del módulo de autenticación (registro, login y sesión).

Cubren los caminos felices y los errores que documenta el contrato:
`201`, `200`, `202`, `400`, `401`, `403` y `409`, incluido el sobre
`application/problem+json` y la rotación/revocación del refresh token.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status

from apps.users.models import PasswordResetToken, Role, UserProfile

pytestmark = pytest.mark.django_db

User = get_user_model()

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
REFRESH = "/api/v1/auth/refresh"
RESET = "/api/v1/auth/password-reset/"
RESET_CONFIRM = "/api/v1/auth/password-reset-confirm/"

PASSWORD = "ClaveSegura2026"


def register_payload(**overrides):
    payload = {
        "email": "nuevo@test.pe",
        "password": PASSWORD,
        "full_name": "Cliente Nuevo",
        "phone": "987654321",
        "role": Role.CLIENTE.value,
    }
    payload.update(overrides)
    return payload


def make_user(email="cliente@test.pe", password=PASSWORD, **extra):
    return User.objects.create_user(
        username=email, email=email, password=password, **extra
    )


def login(api, email="cliente@test.pe", password=PASSWORD):
    return api.post(LOGIN, {"email": email, "password": password}, format="json")


# ===== TestRegister: grupo de pruebas de register =====
class TestRegister:
    @pytest.mark.integration
    def test_register_returns_201_and_normalizes_the_email(self, api):
        """IT-AUTH-006 - Prueba de Integración — RegisterView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RegisterView.
        Propósito del Escenario: Camino feliz: registra un cliente y normaliza el email a minúsculas.
        Código HTTP Esperado: 201 Created.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            REGISTER, register_payload(email="  Nuevo@Test.PE  "), format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED, response.content
        body = response.json()
        assert body["email"] == "nuevo@test.pe"
        assert body["role"] == Role.CLIENTE.value

        user = User.objects.get(email="nuevo@test.pe")
        assert user.username == "nuevo@test.pe"
        assert UserProfile.objects.get(user=user).role == Role.CLIENTE.value

    @pytest.mark.integration
    def test_duplicate_email_returns_409(self, api, assert_problem):
        """IT-AUTH-007 - Prueba de Integración — RegisterView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RegisterView.
        Propósito del Escenario: Conflicto 409: rechaza un email ya registrado sin crear un segundo usuario.
        Código HTTP Esperado: 409 Conflict.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 409 Conflict y el efecto se refleja en el estado o la base de datos.
        """
        make_user("duplicado@test.pe")

        response = api.post(
            REGISTER, register_payload(email="DUPLICADO@test.pe"), format="json"
        )

        problem = assert_problem(
            response, "email_already_registered", status.HTTP_409_CONFLICT
        )
        assert "duplicado@test.pe" in problem["detail"]

    @pytest.mark.integration
    def test_weak_password_returns_400(self, api, assert_problem):
        """IT-AUTH-008 - Prueba de Integración — RegisterView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RegisterView.
        Propósito del Escenario: Error 400: rechaza una contraseña que no cumple la política.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            REGISTER, register_payload(password="corta"), format="json"
        )

        problem = assert_problem(
            response, "weak_password", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "password"

    @pytest.mark.integration
    def test_non_client_role_is_rejected(self, api, assert_problem):
        """IT-AUTH-009 - Prueba de Integración — RegisterView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RegisterView.
        Propósito del Escenario: Error 400: solo permite el rol CLIENTE en el autorregistro.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            REGISTER, register_payload(role=Role.ADMINISTRADOR.value), format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "role"

    @pytest.mark.integration
    def test_unknown_field_is_rejected(self, api, assert_problem):
        """IT-AUTH-010 - Prueba de Integración — RegisterView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RegisterView.
        Propósito del Escenario: Error 400: rechaza campos fuera del contrato en lugar de ignorarlos.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            REGISTER, register_payload(telefono="999999999"), format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "telefono"


# ===== TestLoginAndSession: grupo de pruebas de login and session =====
class TestLoginAndSession:
    @pytest.mark.integration
    def test_login_returns_access_and_sets_the_refresh_cookie(self, api):
        """IT-AUTH-011 - Prueba de Integración — LoginView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / LoginView.
        Propósito del Escenario: Camino feliz: valida credenciales, devuelve el access y emite la cookie refresh HttpOnly.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()

        response = login(api)

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["access"]
        assert body["token_type"] == "Bearer"
        assert body["expires_in"] == 1800
        assert body["user"]["email"] == user.email
        assert "hb_refresh_token" in response.cookies
        assert response.cookies["hb_refresh_token"]["httponly"]

    @pytest.mark.integration
    def test_invalid_credentials_return_401(self, api, assert_problem):
        """IT-AUTH-012 - Prueba de Integración — LoginView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / LoginView.
        Propósito del Escenario: Error 401: credenciales inválidas sin filtrar si el email existe.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        make_user()

        response = login(api, password="OtraClave2026")

        assert_problem(
            response, "invalid_credentials", status.HTTP_401_UNAUTHORIZED
        )

    @pytest.mark.integration
    def test_disabled_account_returns_403(self, api, assert_problem):
        """IT-AUTH-013 - Prueba de Integración — LoginView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / LoginView.
        Propósito del Escenario: Permisos 403: bloquea el inicio de sesión de una cuenta desactivada.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        User.objects.filter(pk=user.pk).update(is_active=False)

        response = login(api)

        assert_problem(response, "account_disabled", status.HTTP_403_FORBIDDEN)

    @pytest.mark.integration
    def test_refresh_without_cookie_returns_401(self, api, assert_problem):
        """IT-AUTH-014 - Prueba de Integración — RefreshView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RefreshView.
        Propósito del Escenario: Error 401: exige la cookie de refresh para renovar la sesión.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(REFRESH)

        assert_problem(
            response, "refresh_token_missing", status.HTTP_401_UNAUTHORIZED
        )

    @pytest.mark.integration
    def test_refresh_for_disabled_account_returns_403(self, api, assert_problem):
        """IT-AUTH-015 - Prueba de Integración - refresh for disabled account returns 403

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / TestLoginAndSession.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: refresh for disabled account returns 403.
        Código HTTP Esperado: 200 OK, 403 Forbidden
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK, 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        assert login(api).status_code == status.HTTP_200_OK
        User.objects.filter(pk=user.pk).update(is_active=False)

        response = api.post(REFRESH)

        assert_problem(response, "account_disabled", status.HTTP_403_FORBIDDEN)

    @pytest.mark.integration
    def test_refresh_rotates_the_cookie_and_returns_a_new_access(self, api):
        """IT-AUTH-016 - Prueba de Integración — RefreshView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RefreshView.
        Propósito del Escenario: Camino feliz: rota el refresh token y entrega un access nuevo.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        make_user()
        assert login(api).status_code == status.HTTP_200_OK
        consumed = api.cookies["hb_refresh_token"].value

        first = api.post(REFRESH)
        assert first.status_code == status.HTTP_200_OK, first.content
        rotated = api.cookies["hb_refresh_token"].value
        assert rotated != consumed

        second = api.post(REFRESH)
        assert second.status_code == status.HTTP_200_OK, second.content
        assert second.json()["user"]["email"] == "cliente@test.pe"

    @pytest.mark.integration
    def test_reused_refresh_token_returns_401(self, api, assert_problem):
        """IT-AUTH-017 - Prueba de Integración — RefreshView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RefreshView.
        Propósito del Escenario: Seguridad 401: invalida un refresh token ya consumido.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        make_user()
        assert login(api).status_code == status.HTTP_200_OK
        consumed = api.cookies["hb_refresh_token"].value
        assert api.post(REFRESH).status_code == status.HTTP_200_OK

        api.cookies["hb_refresh_token"] = consumed
        response = api.post(REFRESH)

        assert_problem(
            response, "refresh_token_reused", status.HTTP_401_UNAUTHORIZED
        )

    @pytest.mark.integration
    def test_malformed_refresh_token_returns_401(self, api, assert_problem):
        """IT-AUTH-018 - Prueba de Integración — RefreshView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / RefreshView.
        Propósito del Escenario: Error 401: rechaza un refresh token con formato inválido.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        api.cookies["hb_refresh_token"] = "esto-no-es-un-token"

        response = api.post(REFRESH)

        assert_problem(
            response, "invalid_refresh_token", status.HTTP_401_UNAUTHORIZED
        )


# ===== TestPasswordReset: grupo de pruebas de password reset =====
class TestPasswordReset:
    @pytest.mark.integration
    def test_existing_email_creates_a_token_and_returns_202(self, api):
        """IT-AUTH-019 - Prueba de Integración — PasswordResetView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetView.
        Propósito del Escenario: Camino feliz: crea un token de recuperación para un email existente.
        Código HTTP Esperado: 202 Accepted.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 202 Accepted y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()

        response = api.post(RESET, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_202_ACCEPTED
        token = PasswordResetToken.objects.get(user=user)
        assert token.used_at is None
        assert token.expires_at > timezone.now()

    @pytest.mark.integration
    def test_unknown_email_returns_202_without_creating_a_token(self, api):
        """IT-AUTH-020 - Prueba de Integración — PasswordResetView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetView.
        Propósito del Escenario: Anti-enumeración: responde 202 con un email desconocido sin crear token.
        Código HTTP Esperado: 202 Accepted.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 202 Accepted y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(RESET, {"email": "nadie@test.pe"}, format="json")

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert PasswordResetToken.objects.count() == 0

    @pytest.mark.integration
    def test_confirm_changes_the_password_and_marks_the_token_used(self, api):
        """IT-AUTH-021 - Prueba de Integración — PasswordResetConfirmView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetConfirmView.
        Propósito del Escenario: Camino feliz: cambia la contraseña y consume el token de recuperación.
        Código HTTP Esperado: 200 OK.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        api.post(RESET, {"email": user.email}, format="json")
        record = PasswordResetToken.objects.get(user=user)

        response = api.post(
            RESET_CONFIRM,
            {"token": record.token, "password": "NuevaClave2026"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.content
        record.refresh_from_db()
        assert record.used_at is not None
        assert login(api, password="NuevaClave2026").status_code == status.HTTP_200_OK
        assert login(api).status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.integration
    def test_invalid_token_returns_400(self, api, assert_problem):
        """IT-AUTH-022 - Prueba de Integración — PasswordResetConfirmView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetConfirmView.
        Propósito del Escenario: Error 400: rechaza un token de recuperación inválido.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(
            RESET_CONFIRM,
            {"token": "x" * 64, "password": "NuevaClave2026"},
            format="json",
        )

        assert_problem(
            response, "invalid_reset_token", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_expired_token_returns_400(self, api, assert_problem):
        """IT-AUTH-023 - Prueba de Integración — PasswordResetConfirmView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetConfirmView.
        Propósito del Escenario: Error 400: rechaza un token de recuperación expirado.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        PasswordResetToken.objects.create(
            user=user,
            token="y" * 64,
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = api.post(
            RESET_CONFIRM,
            {"token": "y" * 64, "password": "NuevaClave2026"},
            format="json",
        )

        assert_problem(
            response, "invalid_reset_token", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_already_used_token_returns_400(self, api, assert_problem):
        """IT-AUTH-024 - Prueba de Integración — PasswordResetConfirmView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetConfirmView.
        Propósito del Escenario: Error 400: rechaza un token de recuperación ya utilizado.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        PasswordResetToken.objects.create(
            user=user,
            token="z" * 64,
            expires_at=timezone.now() + timedelta(hours=1),
            used_at=timezone.now(),
        )

        response = api.post(
            RESET_CONFIRM,
            {"token": "z" * 64, "password": "NuevaClave2026"},
            format="json",
        )

        assert_problem(
            response, "invalid_reset_token", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_weak_password_is_rejected_before_consuming_the_token(
        self, api, assert_problem
    ):
        """IT-AUTH-025 - Prueba de Integración — PasswordResetConfirmView.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Autenticación / PasswordResetConfirmView.
        Propósito del Escenario: Error 400: valida la contraseña antes de consumir el token.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: N/A
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        user = make_user()
        api.post(RESET, {"email": user.email}, format="json")
        record = PasswordResetToken.objects.get(user=user)

        response = api.post(
            RESET_CONFIRM, {"token": record.token, "password": "corta"}, format="json"
        )

        assert_problem(response, "weak_password", status.HTTP_400_BAD_REQUEST)
        record.refresh_from_db()
        assert record.used_at is None
