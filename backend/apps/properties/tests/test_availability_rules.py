"""Reglas de RF-PROP-04 que no necesitan HTTP ni base de datos.

La matriz de transiciones, el formato `HH:MM` y la traducción del enum de día
son tablas puras: probarlas por separado fija el error en el lugar donde se
produjo, y deja a `test_availability.py` con la pregunta que le corresponde,
"¿qué le llega al cliente?".
"""

from datetime import time, timedelta
from types import SimpleNamespace

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


class StatusMatrixTests(SimpleTestCase):
    def test_every_status_has_a_row_in_the_matrix(self):
        self.assertEqual(
            set(services.STATUS_TRANSITIONS), set(PropertyStatus.values)
        )

    def test_no_status_can_transition_to_itself(self):
        for status, targets in services.STATUS_TRANSITIONS.items():
            with self.subTest(status=status):
                self.assertNotIn(status, targets)

    def test_terminal_states_have_no_way_back_to_disponible(self):
        for status in services.TERMINAL_STATUSES:
            with self.subTest(status=status):
                self.assertNotIn(
                    "DISPONIBLE", services.allowed_transitions(status)
                )

    def test_alquilado_cannot_go_to_vendido(self):
        self.assertNotIn("VENDIDO", services.allowed_transitions("ALQUILADO"))

    def test_suspension_is_reachable_from_every_state_but_its_own(self):
        for status in PropertyStatus.values:
            if status == "SUSPENDIDO":
                continue
            with self.subTest(status=status):
                self.assertIn("SUSPENDIDO", services.allowed_transitions(status))

    def test_auditable_states_are_exactly_the_ones_that_demand_a_reason(self):
        self.assertEqual(
            set(services.AUDITABLE_STATUSES),
            set(PropertyStatus.values) - {"DISPONIBLE"},
        )

    def test_validate_transition_accepts_every_documented_edge(self):
        for origin, targets in services.STATUS_TRANSITIONS.items():
            for target in targets:
                with self.subTest(origin=origin, target=target):
                    services.validate_transition(origin, target)

    def test_validate_transition_rejects_an_unknown_target(self):
        with self.assertRaises(ProblemError) as ctx:
            services.validate_transition("DISPONIBLE", "ALQUILADO")

        self.assertEqual(ctx.exception.code, "invalid_property_transition")
        self.assertEqual(ctx.exception.errors[0]["parameter"], "status")

    def test_validate_transition_rejects_an_unknown_origin(self):
        with self.assertRaises(ProblemError):
            services.validate_transition("EN_TRAMITE", "DISPONIBLE")


class ParseHhmmTests(SimpleTestCase):
    def test_reads_a_valid_time(self):
        self.assertEqual(services.parse_hhmm("09:30", "start_time"), time(9, 30))

    def test_reads_midnight_and_the_last_minute_of_the_day(self):
        self.assertEqual(services.parse_hhmm("00:00", "t"), time(0, 0))
        self.assertEqual(services.parse_hhmm("23:59", "t"), time(23, 59))

    def test_rejects_everything_that_is_not_hh_mm(self):
        for raw in ("9:00", "09.00", "0900", "", "09:", ":30", "09:60", "24:00", "09:0a", None):
            with self.subTest(raw=raw):
                with self.assertRaises(ProblemError) as ctx:
                    services.parse_hhmm(raw, "start_time")
                self.assertEqual(ctx.exception.code, "invalid_time_range")
                self.assertEqual(ctx.exception.errors[0]["parameter"], "start_time")

    def test_a_time_object_is_not_a_valid_input(self):
        # El contrato manda texto: un `time` en el cuerpo significaría que
        # alguien serializó a mano, y aceptarlo escondería un cliente roto.
        with self.assertRaises(ProblemError):
            services.parse_hhmm(time(8, 15), "t")

    def test_formats_back_to_hh_mm(self):
        self.assertEqual(services.format_hhmm(time(9, 5)), "09:05")
        self.assertEqual(services.format_hhmm(time(18, 30)), "18:30")


class ValidateDayTests(SimpleTestCase):
    @staticmethod
    def slot(start, end):
        return services.SlotInput(start_time=time(*start), end_time=time(*end))

    def test_accepts_contiguous_slots(self):
        services.validate_day(
            "LUNES", [self.slot((9, 0), (12, 0)), self.slot((12, 0), (15, 0))], "days[0]"
        )

    def test_rejects_a_slot_that_starts_inside_the_previous_one(self):
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day(
                "LUNES", [self.slot((9, 0), (12, 0)), self.slot((11, 59), (15, 0))], "days[0]"
            )

        self.assertEqual(ctx.exception.code, "schedule_overlap")

    def test_rejects_an_inverted_slot(self):
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day("LUNES", [self.slot((12, 0), (9, 0))], "days[0]")

        self.assertEqual(ctx.exception.code, "invalid_time_range")

    def test_rejects_a_slot_shorter_than_the_minimum(self):
        with self.assertRaises(ProblemError):
            services.validate_day("LUNES", [self.slot((9, 0), (9, 29))], "days[0]")

    def test_rejects_a_slot_longer_than_the_maximum(self):
        with self.assertRaises(ProblemError):
            services.validate_day("LUNES", [self.slot((8, 0), (16, 1))], "days[0]")

    def test_error_path_follows_the_request_shape(self):
        with self.assertRaises(ProblemError) as ctx:
            services.validate_day(
                "LUNES",
                [self.slot((9, 0), (12, 0)), self.slot((10, 0), (10, 30))],
                "days[3]",
            )

        self.assertEqual(ctx.exception.errors[0]["parameter"], "days[3].slots[1]")

    def test_order_of_the_slots_does_not_matter(self):
        services.validate_day(
            "MARTES",
            [self.slot((15, 0), (16, 0)), self.slot((9, 0), (10, 0))],
            "days[0]",
        )


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

    def test_accepts_a_week_at_the_top_of_the_range(self):
        week = [self.entry(day, 4) for day in services.WEEKDAY_FROM_ENUM]

        services.validate_week(week)

    def test_rejects_a_duplicated_day(self):
        with self.assertRaises(ProblemError) as ctx:
            services.validate_week([self.entry("LUNES"), self.entry("LUNES")])

        self.assertEqual(ctx.exception.errors[0]["parameter"], "days[1]")

    def test_rejects_a_week_over_the_top(self):
        days = [
            self.entry(day, 5)
            for day in ("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO")
        ]

        with self.assertRaises(ProblemError) as ctx:
            services.validate_week(days)

        self.assertIn("30", ctx.exception.detail)

    def test_limits_are_the_ones_the_contract_states(self):
        self.assertEqual(services.MAX_SLOTS_PER_DAY, 6)
        self.assertEqual(services.MAX_SLOTS_PER_WEEK, 28)
        self.assertEqual(SLOT_MIN_DURATION, timedelta(minutes=30))
        self.assertEqual(SLOT_MAX_DURATION, timedelta(hours=8))


class WeekdayTranslationTests(SimpleTestCase):
    def test_weekday_persists_as_a_smallint_that_starts_on_monday(self):
        self.assertEqual([choice.value for choice in Weekday], list(range(7)))
        self.assertEqual(Weekday.LUNES, 0)
        self.assertEqual(Weekday.DOMINGO, 6)

    def test_translation_round_trips_in_both_directions(self):
        for choice in Weekday:
            with self.subTest(day=choice.name):
                self.assertEqual(
                    services.ENUM_FROM_WEEKDAY[services.WEEKDAY_FROM_ENUM[choice.name]],
                    choice.name,
                )

    def test_translation_keeps_the_seven_days_of_the_contract(self):
        self.assertEqual(
            list(services.WEEKDAY_FROM_ENUM),
            ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
        )

    def test_schedule_timezone_is_the_one_the_contract_fixes(self):
        self.assertEqual(services.schedule_timezone(), "America/Lima")


class SchedulesPayloadTests(SimpleTestCase):
    def test_lists_the_seven_days_even_without_slots(self):
        payload = build_schedules_payload(SimpleNamespace(id="x"), [])

        self.assertEqual(payload["total_slots"], 0)
        self.assertEqual([day["weekday"] for day in payload["days"]], list(services.WEEKDAY_FROM_ENUM))
        self.assertEqual(payload["timezone"], "America/Lima")

    def test_groups_and_sorts_the_slots_of_each_day(self):
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


class PropertyBookableTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    def test_is_bookable_only_when_available(self):
        self.assertTrue(self.property.is_bookable)

    def test_is_bookable_is_false_without_is_active(self):
        self.property.status = "RESERVADO"
        self.property.is_active = False
        self.assertFalse(self.property.is_bookable)

    def test_is_bookable_is_false_for_a_suspended_property(self):
        self.assertFalse(make_property(self.district, None, index=2, status="SUSPENDIDO").is_bookable)


class PropertyScheduleModelTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    def make_slot(self, weekday, start, end, **overrides):
        return PropertySchedule(
            property=self.property, weekday=weekday, start_time=time(*start), end_time=time(*end), **overrides
        )

    def test_duration_is_the_difference_between_the_ends(self):
        slot = self.make_slot(0, (9, 0), (11, 30))

        self.assertEqual(slot.duration, timedelta(hours=2, minutes=30))

    def test_clean_accepts_contiguous_slots(self):
        self.make_slot(0, (9, 0), (12, 0)).full_clean()
        self.make_slot(0, (12, 0), (15, 0)).full_clean()

    def test_clean_rejects_an_overlap_with_a_stored_slot(self):
        self.make_slot(0, (9, 0), (12, 0)).save()

        with self.assertRaises(ValidationError) as ctx:
            self.make_slot(0, (11, 0), (15, 0)).full_clean()

        self.assertIn("start_time", ctx.exception.message_dict)

    def test_clean_ignores_deactivated_slots(self):
        self.make_slot(0, (9, 0), (12, 0), is_active=False).save()

        self.make_slot(0, (11, 0), (15, 0)).full_clean()

    def test_overlaps_is_false_across_days(self):
        monday = self.make_slot(0, (9, 0), (12, 0))
        tuesday = self.make_slot(1, (9, 0), (12, 0))

        self.assertFalse(monday.overlaps(tuesday))

    def test_str_names_the_day(self):
        self.assertIn("Lunes", str(self.make_slot(0, (9, 0), (12, 0))))


class PropertyStatusChangeModelTests(TestCase):
    def setUp(self):
        self.district = make_district()
        self.property = make_property(self.district, None, index=1)

    def test_saving_an_existing_row_is_refused(self):
        change = PropertyStatusChange.objects.create(
            property=self.property, new_status="RESERVADO", reason="Reserva en firme"
        )

        with self.assertRaises(ValueError):
            change.save()

    def test_a_second_insert_is_the_way_to_correct_the_history(self):
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

    def test_newest_change_comes_first(self):
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

    def test_str_reads_as_a_transition(self):
        change = PropertyStatusChange.objects.create(
            property=self.property,
            previous_status="DISPONIBLE",
            new_status="SUSPENDIDO",
            reason="El owner retiro el inmueble",
        )

        self.assertIn("DISPONIBLE", str(change))
        self.assertIn("SUSPENDIDO", str(change))