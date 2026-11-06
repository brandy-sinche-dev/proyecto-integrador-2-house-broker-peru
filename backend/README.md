# Backend — HouseBroker Perú

API REST en Django + Django REST Framework para propiedades, citas y CRM.
Base de datos de producción PostgreSQL 16; la suite de pruebas usa SQLite en
memoria (`config.test_settings`).

## Requisitos

- Python 3.12+ (el proyecto se ejecuta con 3.13).
- Entorno virtual en `backend/.venv` con las dependencias de desarrollo
  (`pytest`, `pytest-django`, `pytest-cov`).

## Ejecutar la suite

Desde `backend/` en Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe scripts\run_tests.py
```

El runner:

1. Ejecuta Pytest sobre `apps` y `tests`.
2. Genera cobertura de `apps` y `config`.
3. Exige un mínimo de **93 %** (configurado también en `pyproject.toml`).
4. Escribe el reporte HTML en `backend/htmlcov/index.html`.
5. Imprime el resumen por módulo con los códigos HTTP observados.

Resultado de la última corrida: **565 aprobadas, 69 subtests, 0 fallos,
94.64 % de cobertura**.

### Filtrar por capa

```powershell
.\.venv\Scripts\python.exe -m pytest -m unit -q
.\.venv\Scripts\python.exe -m pytest -m integration -q
.\.venv\Scripts\python.exe -m pytest -m "not unit" -q
```

## Estructura

```text
backend/
├─ apps/
│  ├─ appointments/   # citas, disponibilidad y máquina de estados
│  ├─ clients/        # ficha, historial y notas del cliente
│  ├─ properties/     # catálogo, estados, agenda y favoritos
│  └─ users/          # registro, login y sesión JWT
├─ config/            # settings, URLs, ASGI/WSGI y settings de prueba
├─ tests/             # suite Pytest nueva de integración
├─ scripts/           # run_tests.py y plugin de resumen HTTP
├─ conftest.py        # fixtures compartidas
├─ pyproject.toml     # Pytest, markers y cobertura
└─ htmlcov/           # reporte HTML generado
```

## Documentación de pruebas

- `../skills/pruebas/SKILL.md` — guía operativa.
- `../skills/pruebas/inventario-pruebas.md` — números, capas, cobertura y limitaciones.
- `../skills/pruebas/matriz-trazabilidad.md` — requisito → ID → archivo → resultado.
- `../skills/pruebas/casos-de-prueba.md` — 15 casos representativos.
- `../skills/pruebas/guia-exposicion.md` — guion de exposición.
- `../skills/pruebas/preguntas-frecuentes.md` y `../skills/pruebas/glosario.md`.

## Convenciones rápidas

- Unitarias: `apps/<app>/tests/test_services_unit.py` con `@pytest.mark.unit`.
- Integración: `backend/tests/` con `@pytest.mark.integration`.
- Cada prueba lleva un ID `UT-<MOD>-NNN` o `IT-<MOD>-NNN` en su docstring.
- No se baja el umbral de cobertura sin justificación en el pull request.

## Cuentas de demostración y siembra de datos

Para poblar la base de datos con las 25 propiedades con fotografías, distritos, agendas y usuarios de prueba:

```powershell
.\.venv\Scripts\python.exe manage.py seed_demo
```

| Rol | Correo | Contraseña por defecto |
|---|---|---|
| Administrador | `admin@housebroker.pe` | `Housebroker2026.` |
| Agente Titular | `yohan.nato@housebroker.pe` | `Housebroker2026.` |
| Agente Secundario | `agente@housebroker.pe` | `Housebroker2026.` |
| Cliente | `cliente@housebroker.pe` | `Housebroker2026.` |

