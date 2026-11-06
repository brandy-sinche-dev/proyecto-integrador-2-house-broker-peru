"""Reglas de RF-PROP-04 que no necesitan HTTP ni base de datos.

La matriz de transiciones, el formato `HH:MM` y la traducción del enum de día
son tablas puras: probarlas por separado fija el error en el lugar donde se
produjo, y deja a `test_availability.py` con la pregunta que le corresponde,
"¿qué le llega al cliente?".
"""

from datetime import time, timedelta
from types import SimpleNamespace

import pytest

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from apps.properties import services
from apps.properties.models import (
    SLOT_MAX_DURATION,
    SLOT_MIN_DURATION,
    Property,
    PropertySchedule,
    PropertyStatus,
    PropertyStatusChange,
    Weekday,
)
from apps.properties.problems import ProblemError
from apps.properties.serializers import build_schedules_payload
from apps.properties.tests.helpers import make_district, make_property


# ===== StatusMatrixTests: grupo de pruebas de status matrix =====
class StatusMatrixTests(SimpleTestCase):
    @pytest.mark.unit
    def test_every_status_has_a_row_in_the_matrix(self):
        """UT-PROP-001 - Prueba Unitaria - Matriz de transiciones de PropertyStatus.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Matriz de transiciones de PropertyStatus.
        Propósito del Escenario: Verifica que cada valor de PropertyStatus tenga su fila en STATUS_TRANSITIONS.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(
            set(services.STATUS_TRANSITIONS), set(PropertyStatus.values)
        )

    @pytest.mark.unit
    def test_no_status_can_transition_to_itself(self):
        """UT-PROP-002 - Prueba Unitaria - Matriz de transiciones de PropertyStatus.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Matriz de transiciones de PropertyStatus.
        Propósito del Escenario: Confirma que ningun estado se transiciona a si mismo.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for status, targets in services.STATUS_TRANSITIONS.items():
            with self.subTest(status=status):
                self.assertNotIn(status, targets)

    @pytest.mark.unit
    def test_terminal_states_have_no_way_back_to_disponible(self):
        """UT-PROP-003 - Prueba Unitaria - Estados terminales.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Estados terminales.
        Propósito del Escenario: Los estados terminales (ALQUILADO, VENDIDO) no vuelven a DISPONIBLE.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for status in services.TERMINAL_STATUSES:
            with self.subTest(status=status):
                self.assertNotIn(
                    "DISPONIBLE", services.allowed_transitions(status)
                )

    @pytest.mark.unit
    def test_alquilado_cannot_go_to_vendido(self):
        """UT-PROP-004 - Prueba Unitaria - Estados terminales.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Estados terminales.
        Propósito del Escenario: ALQUILADO no puede transicionar a VENDIDO.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertNotIn("VENDIDO", services.allowed_transitions("ALQUILADO"))

    @pytest.mark.unit
    def test_suspension_is_reachable_from_every_state_but_its_own(self):
        """UT-PROP-005 - Prueba Unitaria - Estado SUSPENDIDO.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Estado SUSPENDIDO.
        Propósito del Escenario: SUSPENDIDO es alcanzable desde todo estado distinto de si mismo.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for status in PropertyStatus.values:
            if status == "SUSPENDIDO":
                continue
            with self.subTest(status=status):
                self.assertIn("SUSPENDIDO", services.allowed_transitions(status))

    @pytest.mark.unit
    def test_auditable_states_are_exactly_the_ones_that_demand_a_reason(self):
        """UT-PROP-006 - Prueba Unitaria - Estados auditables.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Estados auditables.
        Propósito del Escenario: AUDITABLE_STATUSES coincide con todos los estados menos DISPONIBLE.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(
            set(services.AUDITABLE_STATUSES),
            set(PropertyStatus.values) - {"DISPONIBLE"},
        )

    @pytest.mark.unit
    def test_validate_transition_accepts_every_documented_edge(self):
        """UT-PROP-007 - Prueba Unitaria - validate_transition.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_transition.
        Propósito del Escenario: Acepta cada arista documentada de la matriz de transiciones.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for origin, targets in services.STATUS_TRANSITIONS.items():
            for target in targets:
                with self.subTest(origin=origin, target=target):
                    services.validate_transition(origin, target)

    @pytest.mark.unit
    def test_validate_transition_rejects_an_unknown_target(self):
        """UT-PROP-008 - Prueba Unitaria - validate_transition.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_transition.
        Propósito del Escenario: Rechaza una transicion no permitida con code invalid_property_transition y parameter status.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError) as ctx:
            services.validate_transition("DISPONIBLE", "ALQUILADO")

        self.assertEqual(ctx.exception.code, "invalid_property_transition")
        self.assertEqual(ctx.exception.errors[0]["parameter"], "status")

    @pytest.mark.unit
    def test_validate_transition_rejects_an_unknown_origin(self):
        """UT-PROP-009 - Prueba Unitaria - validate_transition.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_transition.
        Propósito del Escenario: Rechaza un estado de origen desconocido aunque el destino sea valido.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError):
            services.validate_transition("EN_TRAMITE", "DISPONIBLE")


# ===== ParseHhmmTests: grupo de pruebas de parse hhmm =====
class ParseHhmmTests(SimpleTestCase):
    @pytest.mark.unit
    def test_reads_a_valid_time(self):
        """UT-PROP-010 - Prueba Unitaria - parse_hhmm.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: parse_hhmm.
        Propósito del Escenario: Convierte el texto '09:30' en time(9, 30).
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(services.parse_hhmm("09:30", "start_time"), time(9, 30))

    @pytest.mark.unit
    def test_reads_midnight_and_the_last_minute_of_the_day(self):
        """UT-PROP-011 - Prueba Unitaria - parse_hhmm.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: parse_hhmm.
        Propósito del Escenario: Acepta los limites del dia: 00:00 y 23:59.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(services.parse_hhmm("00:00", "t"), time(0, 0))
        self.assertEqual(services.parse_hhmm("23:59", "t"), time(23, 59))

    @pytest.mark.unit
    def test_rejects_everything_that_is_not_hh_mm(self):
        """UT-PROP-012 - Prueba Unitaria - parse_hhmm.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: parse_hhmm.
        Propósito del Escenario: Rechaza todo formato fuera de HH:MM con code invalid_time_range.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for raw in ("9:00", "09.00", "0900", "", "09:", ":30", "09:60", "24:00", "09:0a", None):
            with self.subTest(raw=raw):
                with self.assertRaises(ProblemError) as ctx:
                    services.parse_hhmm(raw, "start_time")
                self.assertEqual(ctx.exception.code, "invalid_time_range")
                self.assertEqual(ctx.exception.errors[0]["parameter"], "start_time")

    @pytest.mark.unit
    def test_a_time_object_is_not_a_valid_input(self):
        """UT-PROP-013 - Prueba Unitaria - parse_hhmm.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: parse_hhmm.
        Propósito del Escenario: Rechaza un objeto time ya parseado: el contrato exige texto plano.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        # El contrato manda texto: un `time` en el cuerpo significaría que
        # alguien serializó a mano, y aceptarlo escondería un cliente roto.
        with self.assertRaises(ProblemError):
            services.parse_hhmm(time(8, 15), "t")

    @pytest.mark.unit
    def test_formats_back_to_hh_mm(self):
        """UT-PROP-014 - Prueba Unitaria - format_hhmm.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: format_hhmm.
        Propósito del Escenario: Formatea un time a HH:MM con ceros a la izquierda.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(services.format_hhmm(time(9, 5)), "09:05")
        self.assertEqual(services.format_hhmm(time(18, 30)), "18:30")


# ===== ValidateDayTests: grupo de pruebas de validate day =====
class ValidateDayTests(SimpleTestCase):
    @staticmethod
    def slot(start, end):
        return services.SlotInput(start_time=time(*start), end_time=time(*end))

    @pytest.mark.unit
    def test_accepts_contiguous_slots(self):
        """UT-PROP-015 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Acepta bloques contiguos donde el fin de uno es el inicio del siguiente.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        services.validate_day(
            "LUNES", [self.slot((9, 0), (12, 0)), self.slot((12, 0), (15, 0))], "days[0]"
        )

    @pytest.mark.unit
    def test_rejects_a_slot_that_starts_inside_the_previous_one(self):
        """UT-PROP-016 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Rechaza solapamiento entre bloques del mismo dia con code schedule_overlap.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day(
                "LUNES", [self.slot((9, 0), (12, 0)), self.slot((11, 59), (15, 0))], "days[0]"
            )

        self.assertEqual(ctx.exception.code, "schedule_overlap")

    @pytest.mark.unit
    def test_rejects_an_inverted_slot(self):
        """UT-PROP-017 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Rechaza un bloque con fin menor o igual al inicio con code invalid_time_range.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day("LUNES", [self.slot((12, 0), (9, 0))], "days[0]")

        self.assertEqual(ctx.exception.code, "invalid_time_range")

    @pytest.mark.unit
    def test_rejects_a_slot_shorter_than_the_minimum(self):
        """UT-PROP-018 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Rechaza un bloque de duracion inferior a SLOT_MIN_DURATION.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError):
            services.validate_day("LUNES", [self.slot((9, 0), (9, 29))], "days[0]")

    @pytest.mark.unit
    def test_rejects_a_slot_longer_than_the_maximum(self):
        """UT-PROP-019 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Rechaza un bloque de duracion superior a SLOT_MAX_DURATION.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError):
            services.validate_day("LUNES", [self.slot((8, 0), (16, 1))], "days[0]")

    @pytest.mark.unit
    def test_error_path_follows_the_request_shape(self):
        """UT-PROP-020 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: El parameter del error refleja la ruta days[i].slots[j] del request.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day(
                "LUNES",
                [self.slot((9, 0), (12, 0)), self.slot((10, 0), (10, 30))],
                "days[3]",
            )

        self.assertEqual(ctx.exception.errors[0]["parameter"], "days[3].slots[1]")

    @pytest.mark.unit
    def test_order_of_the_slots_does_not_matter(self):
        """UT-PROP-021 - Prueba Unitaria - validate_day.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_day.
        Propósito del Escenario: Acepta bloques desordenados siempre que no se solapen.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        services.validate_day(
            "MARTES",
            [self.slot((15, 0), (16, 0)), self.slot((9, 0), (10, 0))],
            "days[0]",
        )


# ===== ValidateWeekTests: grupo de pruebas de validate week =====
class ValidateWeekTests(SimpleTestCase):
    @staticmethod
    def entry(weekday, count=1):
        return (
            weekday,
            [
                services.SlotInput(
                    start_time=time(9 + index, 0), end_time=time(9 + index, 30)
                )
                for index in range(count)
            ],
        )

    @pytest.mark.unit
    def test_accepts_a_week_at_the_top_of_the_range(self):
        """UT-PROP-022 - Prueba Unitaria - validate_week.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_week.
        Propósito del Escenario: Acepta 7 dias por 4 bloques = 28, el tope semanal del contrato.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        week = [self.entry(day, 4) for day in services.WEEKDAY_FROM_ENUM]

        services.validate_week(week)

    @pytest.mark.unit
    def test_rejects_a_duplicated_day(self):
        """UT-PROP-023 - Prueba Unitaria - validate_week.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_week.
        Propósito del Escenario: Rechaza un dia repetido en la semana y senala days[1].
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        with self.assertRaises(ProblemError) as ctx:
            services.validate_week([self.entry("LUNES"), self.entry("LUNES")])

        self.assertEqual(ctx.exception.errors[0]["parameter"], "days[1]")

    @pytest.mark.unit
    def test_rejects_a_week_over_the_top(self):
        """UT-PROP-024 - Prueba Unitaria - validate_week.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: validate_week.
        Propósito del Escenario: Rechaza mas de 28 bloques (30) e informa el tope en el detalle.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        days = [
            self.entry(day, 5)
            for day in ("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO")
        ]

        with self.assertRaises(ProblemError) as ctx:
            services.validate_week(days)

        self.assertIn("30", ctx.exception.detail)

    @pytest.mark.unit
    def test_limits_are_the_ones_the_contract_states(self):
        """UT-PROP-025 - Prueba Unitaria - Limites de agenda.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Limites de agenda.
        Propósito del Escenario: Fija MAX_SLOTS_PER_DAY=6, MAX_SLOTS_PER_WEEK=28 y duracion 30 min a 8 h.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(services.MAX_SLOTS_PER_DAY, 6)
        self.assertEqual(services.MAX_SLOTS_PER_WEEK, 28)
        self.assertEqual(SLOT_MIN_DURATION, timedelta(minutes=30))
        self.assertEqual(SLOT_MAX_DURATION, timedelta(hours=8))


# ===== WeekdayTranslationTests: grupo de pruebas de weekday translation =====
class WeekdayTranslationTests(SimpleTestCase):
    @pytest.mark.unit
    def test_weekday_persists_as_a_smallint_that_starts_on_monday(self):
        """UT-PROP-026 - Prueba Unitaria - Weekday.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Weekday.
        Propósito del Escenario: Weekday se persiste como SmallInt 0..6 con LUNES=0 y DOMINGO=6.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual([choice.value for choice in Weekday], list(range(7)))
        self.assertEqual(Weekday.LUNES, 0)
        self.assertEqual(Weekday.DOMINGO, 6)

    @pytest.mark.unit
    def test_translation_round_trips_in_both_directions(self):
        """UT-PROP-027 - Prueba Unitaria - Traduccion Weekday.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Traduccion Weekday.
        Propósito del Escenario: ENUM_FROM_WEEKDAY y WEEKDAY_FROM_ENUM son inversos entre si.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        for choice in Weekday:
            with self.subTest(day=choice.name):
                self.assertEqual(
                    services.ENUM_FROM_WEEKDAY[services.WEEKDAY_FROM_ENUM[choice.name]],
                    choice.name,
                )

    @pytest.mark.unit
    def test_translation_keeps_the_seven_days_of_the_contract(self):
        """UT-PROP-028 - Prueba Unitaria - Traduccion Weekday.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Traduccion Weekday.
        Propósito del Escenario: El orden de los siete dias coincide con el contrato.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(
            list(services.WEEKDAY_FROM_ENUM),
            ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
        )

    @pytest.mark.unit
    def test_schedule_timezone_is_the_one_the_contract_fixes(self):
        """UT-PROP-029 - Prueba Unitaria - schedule_timezone.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: schedule_timezone.
        Propósito del Escenario: La zona horaria de agenda es fija: America/Lima.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertEqual(services.schedule_timezone(), "America/Lima")


# ===== SchedulesPayloadTests: grupo de pruebas de schedules payload =====
class SchedulesPayloadTests(SimpleTestCase):
    @pytest.mark.unit
    def test_lists_the_seven_days_even_without_slots(self):
        """UT-PROP-030 - Prueba Unitaria - build_schedules_payload.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: build_schedules_payload.
        Propósito del Escenario: Siempre devuelve siete dias, total_slots 0 y timezone aunque no haya bloques.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        payload = build_schedules_payload(SimpleNamespace(id="x"), [])

        self.assertEqual(payload["total_slots"], 0)
        self.assertEqual([day["weekday"] for day in payload["days"]], list(services.WEEKDAY_FROM_ENUM))
        self.assertEqual(payload["timezone"], "America/Lima")

    @pytest.mark.unit
    def test_groups_and_sorts_the_slots_of_each_day(self):
        """UT-PROP-031 - Prueba Unitaria - build_schedules_payload.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: build_schedules_payload.
        Propósito del Escenario: Agrupa los bloques por dia y los ordena por start_time en formato HH:MM.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        slots = [
            SimpleNamespace(
                id=1, weekday=0, start_time=time(15, 0), end_time=time(16, 0), is_active=True
            ),
            SimpleNamespace(
                id=2, weekday=0, start_time=time(9, 0), end_time=time(10, 0), is_active=True
            ),
        ]

        payload = build_schedules_payload(SimpleNamespace(id="x"), slots)

        self.assertEqual(payload["total_slots"], 2)
        self.assertEqual(
            [slot["start_time"] for slot in payload["days"][0]["slots"]], ["09:00", "15:00"]
        )


# ===== PropertyBookableTests: grupo de pruebas de property bookable =====
class PropertyBookableTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    @pytest.mark.unit
    def test_is_bookable_only_when_available(self):
        """UT-PROP-032 - Prueba Unitaria - Property.is_bookable.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Property.is_bookable.
        Propósito del Escenario: El inmueble es reservable solo con status DISPONIBLE e is_active=True.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertTrue(self.property.is_bookable)

    @pytest.mark.unit
    def test_is_bookable_is_false_without_is_active(self):
        """UT-PROP-033 - Prueba Unitaria - Property.is_bookable.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Property.is_bookable.
        Propósito del Escenario: Un inmueble DISPONIBLE pero inactivo no es reservable.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.property.status = "RESERVADO"
        self.property.is_active = False
        self.assertFalse(self.property.is_bookable)

    @pytest.mark.unit
    def test_is_bookable_is_false_for_a_suspended_property(self):
        """UT-PROP-034 - Prueba Unitaria - Property.is_bookable.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: Property.is_bookable.
        Propósito del Escenario: Un inmueble con status SUSPENDIDO no es reservable.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertFalse(make_property(self.district, None, index=2, status="SUSPENDIDO").is_bookable)


# ===== PropertyScheduleModelTests: grupo de pruebas de property schedule model =====
class PropertyScheduleModelTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    def make_slot(self, weekday, start, end, **overrides):
        return PropertySchedule(
            property=self.property, weekday=weekday, start_time=time(*start), end_time=time(*end), **overrides
        )

    @pytest.mark.unit
    def test_duration_is_the_difference_between_the_ends(self):
        """UT-PROP-035 - Prueba Unitaria - PropertySchedule.duration.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.duration.
        Propósito del Escenario: La duracion del bloque es end_time - start_time.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        slot = self.make_slot(0, (9, 0), (11, 30))

        self.assertEqual(slot.duration, timedelta(hours=2, minutes=30))

    @pytest.mark.unit
    def test_clean_accepts_contiguous_slots(self):
        """UT-PROP-036 - Prueba Unitaria - PropertySchedule.clean.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.clean.
        Propósito del Escenario: Acepta bloques contiguos del mismo dia sin marcar solape.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.make_slot(0, (9, 0), (12, 0)).full_clean()
        self.make_slot(0, (12, 0), (15, 0)).full_clean()

    @pytest.mark.unit
    def test_clean_rejects_an_overlap_with_a_stored_slot(self):
        """UT-PROP-037 - Prueba Unitaria - PropertySchedule.clean.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.clean.
        Propósito del Escenario: Rechaza el solape con un bloque ya guardado y lo reporta en start_time.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.make_slot(0, (9, 0), (12, 0)).save()

        with self.assertRaises(ValidationError) as ctx:
            self.make_slot(0, (11, 0), (15, 0)).full_clean()

        self.assertIn("start_time", ctx.exception.message_dict)

    @pytest.mark.unit
    def test_clean_ignores_deactivated_slots(self):
        """UT-PROP-038 - Prueba Unitaria - PropertySchedule.clean.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.clean.
        Propósito del Escenario: No considera los bloques con is_active=False al validar solapes.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.make_slot(0, (9, 0), (12, 0), is_active=False).save()

        self.make_slot(0, (11, 0), (15, 0)).full_clean()

    @pytest.mark.unit
    def test_overlaps_is_false_across_days(self):
        """UT-PROP-039 - Prueba Unitaria - PropertySchedule.overlaps.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.overlaps.
        Propósito del Escenario: Dos bloques en dias distintos nunca se solapan.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        monday = self.make_slot(0, (9, 0), (12, 0))
        tuesday = self.make_slot(1, (9, 0), (12, 0))

        self.assertFalse(monday.overlaps(tuesday))

    @pytest.mark.unit
    def test_str_names_the_day(self):
        """UT-PROP-040 - Prueba Unitaria - PropertySchedule.__str__.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertySchedule.__str__.
        Propósito del Escenario: La representacion del bloque incluye el nombre del dia.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        self.assertIn("Lunes", str(self.make_slot(0, (9, 0), (12, 0))))


# ===== PropertyStatusChangeModelTests: grupo de pruebas de property status change model =====
class PropertyStatusChangeModelTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    @pytest.mark.unit
    def test_saving_an_existing_row_is_refused(self):
        """UT-PROP-041 - Prueba Unitaria - PropertyStatusChange.save.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertyStatusChange.save.
        Propósito del Escenario: Un registro historico no se actualiza: guardar de nuevo lanza ValueError.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        change = PropertyStatusChange.objects.create(
            property=self.property, new_status="RESERVADO", reason="Reserva en firme"
        )

        with self.assertRaises(ValueError):
            change.save()

    @pytest.mark.unit
    def test_a_second_insert_is_the_way_to_correct_the_history(self):
        """UT-PROP-042 - Prueba Unitaria - PropertyStatusChange.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertyStatusChange.
        Propósito del Escenario: La correccion del historial se hace con un nuevo registro, no editando.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        PropertyStatusChange.objects.create(
            property=self.property, new_status="RESERVADO", reason="Reserva en firme"
        )
        correction = PropertyStatusChange.objects.create(
            property=self.property,
            new_status="RESERVADO",
            reason="Correccion: se registro sin la senia",
        )

        self.assertEqual(PropertyStatusChange.objects.count(), 2)
        self.assertEqual(correction.new_status, "RESERVADO")

    @pytest.mark.unit
    def test_newest_change_comes_first(self):
        """UT-PROP-043 - Prueba Unitaria - PropertyStatusChange.Meta.ordering.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertyStatusChange.Meta.ordering.
        Propósito del Escenario: El orden por -changed_at devuelve primero el cambio mas reciente.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        first = PropertyStatusChange.objects.create(
            property=self.property,
            new_status="RESERVADO",
            reason="Reserva en firme",
            changed_at=timezone.now() - timedelta(minutes=5),
        )
        second = PropertyStatusChange.objects.create(
            property=self.property,
            previous_status="RESERVADO",
            new_status="DISPONIBLE",
            changed_at=timezone.now(),
        )

        self.assertEqual(list(PropertyStatusChange.objects.all()), [second, first])

    @pytest.mark.unit
    def test_str_reads_as_a_transition(self):
        """UT-PROP-044 - Prueba Unitaria - PropertyStatusChange.__str__.

        Tipo de Prueba: [Prueba Unitaria] Servicio/modelo de dominio, sin HTTP.
        Módulo y Entidad: PropertyStatusChange.__str__.
        Propósito del Escenario: La representacion lee como una transicion de estado.
        Código HTTP Esperado: N/A (no hay endpoint HTTP).
        Requisito: RF-PROP-04
        Resultado Esperado: La regla de negocio se cumple sin errores inesperados.
        """
        change = PropertyStatusChange.objects.create(
            property=self.property,
            previous_status="DISPONIBLE",
            new_status="SUSPENDIDO",
            reason="El owner retiro el inmueble",
        )

        self.assertIn("DISPONIBLE", str(change))
        self.assertIn("SUSPENDIDO", str(change))
