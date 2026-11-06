"""Settings de la suite Pytest: la misma app sobre SQLite en memoria.

Así `pytest` no necesita PostgreSQL ni variables de entorno para correr.
"""

from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
