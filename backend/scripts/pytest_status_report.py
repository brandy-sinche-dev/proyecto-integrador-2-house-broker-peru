"""Plugin de Pytest que resume la suite por módulo y por código HTTP.

Se carga desde ``scripts/run_tests.py``. Instrumenta ``Client.request`` de
Django para registrar cada respuesta emitida por el cliente de pruebas y
atribuirla al test que la provocó, sin modificar los casos existentes.
"""

from __future__ import annotations

from collections import Counter

import pytest

MODULES = (
    ("Autenticación", ("auth", "users")),
    ("Propiedades", ("properties", "catalog", "favorite", "availability")),
    ("Citas", ("appointments", "slot")),
    ("CRM", ("clients", "crm", "history", "notes", "profile")),
)

_statuses: dict[str, Counter] = {}
_outcomes: dict[str, str] = {}
_items: dict[str, object] = {}
_current = {"nodeid": None}
_original_request = None


def module_for(nodeid: str) -> str:
    """Clasifica por la ruta del archivo, no por el nombre de la prueba.

    Si se mira el ``nodeid`` completo, una prueba como
    ``test_requires_authentication`` cae en Autenticación aunque viva en CRM.
    Por eso se descarta todo lo que sigue a ``::`` antes de buscar los tokens.
    """

    normalized = nodeid.replace("\\", "/").lower().split("::", 1)[0]
    for label, tokens in MODULES:
        if any(token in normalized for token in tokens):
            return label
    return "Otros"


def pytest_sessionstart(session):
    _statuses.clear()
    _outcomes.clear()
    _items.clear()


def pytest_configure(config):
    global _original_request

    from django.test.client import Client

    if _original_request is not None:
        return

    _original_request = Client.request

    def request(self, *args, **kwargs):
        response = _original_request(self, *args, **kwargs)
        nodeid = _current["nodeid"]
        if nodeid is not None:
            _statuses.setdefault(nodeid, Counter())[response.status_code] += 1
        return response

    Client.request = request


def pytest_unconfigure(config):
    global _original_request

    if _original_request is None:
        return

    from django.test.client import Client

    Client.request = _original_request
    _original_request = None


def pytest_collection_modifyitems(session, config, items):
    _items.clear()
    _items.update({item.nodeid: item for item in items})


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_protocol(item, nextitem):
    previous = _current["nodeid"]
    _current["nodeid"] = item.nodeid
    try:
        yield
    finally:
        _current["nodeid"] = previous


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when != "call":
        return
    if report.failed:
        _outcomes[item.nodeid] = "failed"
    elif report.skipped and _outcomes.get(item.nodeid) != "failed":
        _outcomes[item.nodeid] = "skipped"
    else:
        _outcomes.setdefault(item.nodeid, "passed")


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    writer = terminalreporter
    writer.write_sep("=", "RESUMEN POR MÓDULO", bold=True)
    writer.write_line(
        f"{'Módulo':<15}{'Pruebas':>8}{'OK':>6}{'Fallos':>8}{'Omitidas':>10}   Códigos HTTP evaluados"
    )

    order = [label for label, _ in MODULES] + ["Otros"]
    totals = Counter()

    for label in order:
        nodeids = [nodeid for nodeid in _items if module_for(nodeid) == label]
        if not nodeids:
            continue

        statuses = Counter()
        outcomes = Counter(_outcomes.get(nodeid, "sin ejecutar") for nodeid in nodeids)
        for nodeid in nodeids:
            statuses.update(_statuses.get(nodeid, Counter()))

        totals.update(outcomes)
        totals["pruebas"] += len(nodeids)

        codes = "  ".join(
            f"{code} x{count}" for code, count in sorted(statuses.items())
        ) or "sin llamadas"
        writer.write_line(
            f"{label:<15}{len(nodeids):>8}{outcomes['passed']:>6}"
            f"{outcomes['failed']:>8}{outcomes['skipped']:>10}   {codes}"
        )

    writer.write_sep("-", "", bold=False)
    writer.write_line(
        f"{'TOTAL':<15}{totals['pruebas']:>8}{totals['passed']:>6}"
        f"{totals['failed']:>8}{totals['skipped']:>10}"
    )
    writer.write_sep("=", "", bold=True)
