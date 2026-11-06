"""Configuración compartida de la suite Pytest.

La base de datos se resuelve en `config.test_settings` (SQLite en memoria), así
que no hace falta exportar variables de entorno para correr las pruebas.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.test_settings")

import pytest


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    """BCrypt hace que cada usuario de prueba cueste ~100 ms; MD5 no aporta seguridad aquí."""
    settings.PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]


@pytest.fixture
def api():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def authenticate(api):
    """Autentica el cliente de la prueba sin pasar por el endpoint de login."""

    def _authenticate(user):
        api.force_authenticate(user=user)
        return api

    return _authenticate


@pytest.fixture
def assert_problem():
    """Comprueba el sobre `application/problem+json` completo y lo devuelve."""

    def _assert(response, code, status_code):
        assert response.status_code == status_code, response.content
        body = response.json()
        assert body["code"] == code, body
        assert body["status"] == status_code, body
        assert (
            response["Content-Type"].split(";")[0] == "application/problem+json"
        ), response["Content-Type"]
        return body

    return _assert
