"""Ejecuta toda la suite Pytest con resumen por módulo y cobertura HTML.

Uso (Git Bash, desde ``backend``)::

    ./.venv/Scripts/python.exe scripts/run_tests.py

El umbral mínimo de cobertura es 93 %; el reporte HTML se genera en
``backend/htmlcov/index.html``. Cualquier argumento adicional se reenvía a
Pytest, por ejemplo ``-k auth`` para filtrar pruebas.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MIN_COVERAGE = 93


def main(argv: list[str] | None = None) -> int:
    extra_args = list(sys.argv[1:] if argv is None else argv)

    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))
    os.chdir(BACKEND_DIR)

    import pytest

    from scripts import pytest_status_report

    pytest_args = [
        "-v",
        "-p",
        "no:cacheprovider",
        "--cov=apps",
        "--cov=config",
        "--cov-report=term-missing",
        f"--cov-report=html:{BACKEND_DIR / 'htmlcov'}",
        f"--cov-fail-under={DEFAULT_MIN_COVERAGE}",
        *extra_args,
    ]

    exit_code = int(pytest.main(pytest_args, plugins=[pytest_status_report]))

    report = BACKEND_DIR / "htmlcov" / "index.html"
    print()
    if report.exists():
        print(f"Reporte HTML de cobertura: {report}")
    print(f"Umbral exigido: {DEFAULT_MIN_COVERAGE} % de cobertura.")
    print(f"Resultado Pytest: {'OK' if exit_code == 0 else 'CON FALLOS'}.")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
