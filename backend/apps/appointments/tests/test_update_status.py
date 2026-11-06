"""Pruebas de `PATCH /api/v1/appointments/{id}/status` (RF-CRM-02).

Fijan el contrato que consume el panel del agente: la matriz de transiciones
(con los tres estados terminales cerrados), las reglas de `scheduled_at` y
`reason`, el alcance por rol, la reprogramación con conflicto de agenda, la
liberación del bloque horario al cancelar y los correos transaccionales.
"""

import pytest

import uuid
from datetime import datetime, time, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.core import mail
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.appointments.models import (
    Appointment,
    AppointmentStatus,
    AppointmentStatusChange,
)
from apps.properties.models import PropertySchedule
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import make_district, make_property, make_user

pytestmark = pytest.mark.integration

LIMA = ZoneInfo("America/Lima")
UTC = ZoneInfo("UTC")


# ===== AppointmentStatusApiTestCase: grupo de pruebas de appointment status =====
class AppointmentStatusApiTestCase(APITestCase):
    """Cita pendiente del agente sobre un inmueble con dos días de agenda."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.other_agent = make_user("otro-agente", role=ROLE_AGENT)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.admin = make_user("admin", role=ROLE_ADMIN)
        self.property = make_property(self.district, self.agent, index=1)

        self.day = timezone.localdate() + timedelta(days=2)
        self.next_day = self.day + timedelta(days=1)
        self.add_slot(self.property, self.day, "14:00", "15:00")
        self.add_slot(self.property, self.day, "16:00", "17:00")
        self.add_slot(self.property, self.next_day, "14:00", "15:00")
        self.add_slot(self.property, self.next_day, "16:00", "17:00")

        self.appointment = self.make_appointment(self.day, 14)

    def add_slot(self, prop, day, start, end):
        return PropertySchedule.objects.create(
            property=prop,
            weekday=day.weekday(),
            start_time=time.fromisoformat(start),
            end_time=time.fromisoformat(end),
        )

    def local_at(self, day, hour=14, minute=0):
        return datetime.combine(day, time(hour, minute), tzinfo=LIMA)

    def iso(self, day, hour=14, minute=0):
        return (
            self.local_at(day, hour, minute)
            .astimezone(UTC)
            .isoformat(timespec="seconds")
            .replace("+00:00", "Z")
        )

    def make_appointment(
        self,
        day,
        hour=14,
        *,
        status=AppointmentStatus.PENDING,
        client=None,
        agent=None,
        prop=None,
    ):
        prop = prop or self.property
        return Appointment.objects.create(
            property=prop,
            client=client or self.client_user,
            agent=agent or self.agent,
            scheduled_at=self.local_at(day, hour),
            duration_minutes=60,
            status=status,
        )

    def clear_appointments(self):
        Appointment.objects.all().delete()
        mail.outbox.clear()

    def patch_status(self, user, payload, appointment=None):
        appointment = appointment or self.appointment
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/api/v1/appointments/{appointment.id}/status",
            payload,
            format="json",
        )

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        problem = response.json()
        self.assertEqual(problem["code"], code)
        self.assertEqual(problem["status"], status_code)
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/problem+json"
        )
        return problem


# ===== AppointmentTransitionTests: grupo de pruebas de appointment transition =====
class AppointmentTransitionTests(AppointmentStatusApiTestCase):
    VALID = (
        (AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED),
        (AppointmentStatus.PENDING, AppointmentStatus.RESCHEDULED),
        (AppointmentStatus.PENDING, AppointmentStatus.CANCELLED),
        (AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED),
        (AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED),
        (AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW),
        (AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED),
        (AppointmentStatus.RESCHEDULED, AppointmentStatus.CONFIRMED),
        (AppointmentStatus.RESCHEDULED, AppointmentStatus.CANCELLED),
    )

    def payload_for(self, target):
        if target == AppointmentStatus.RESCHEDULED:
            return {
                "status": target,
                "scheduled_at": self.iso(self.next_day),
                "reason": "El propietario no está disponible ese día.",
            }
        if target in (AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW):
            return {
                "status": target,
                "reason": "El cliente pidió cancelar la visita.",
            }
        return {"status": target}

    def test_every_allowed_transition_returns_200(self):
        """IT-CIT-057 - Prueba de Integración - every allowed transition returns 200

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentTransitionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: every allowed transition returns 200.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        for current, target in self.VALID:
            with self.subTest(current=current, target=target):
                self.clear_appointments()
                appointment = self.make_appointment(self.day, status=current)
                response = self.patch_status(
                    self.agent, self.payload_for(target), appointment
                )

                self.assertEqual(response.status_code, http_status.HTTP_200_OK)
                self.assertEqual(response.data["status"], target)
                self.assertEqual(response.data["previous_status"], current)
                appointment.refresh_from_db()
                self.assertEqual(appointment.status, target)

    def test_pending_to_confirmed_returns_traceability(self):
        """IT-CIT-058 - Prueba de Integración - pending to confirmed returns traceability

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentTransitionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: pending to confirmed returns traceability.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(
            self.agent, {"status": AppointmentStatus.CONFIRMED}
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.appointment.id))
        self.assertEqual(response.data["status"], "CONFIRMED")
        self.assertEqual(response.data["previous_status"], "PENDING")
        self.assertEqual(response.data["scheduled_at"], self.iso(self.day))
        self.assertEqual(response.data["previous_scheduled_at"], self.iso(self.day))
        self.assertEqual(response.data["changed_by"], str(self.agent.pk))
        self.assertIn("changed_at", response.data)

        self.appointment.refresh_from_db()
        self.assertIsNotNone(self.appointment.confirmed_at)
        change = AppointmentStatusChange.objects.get()
        self.assertEqual(change.previous_status, AppointmentStatus.PENDING)
        self.assertEqual(change.new_status, AppointmentStatus.CONFIRMED)
        self.assertEqual(change.changed_by, self.agent)
        self.assertEqual(change.previous_scheduled_at, self.appointment.scheduled_at)

    def test_completed_cannot_be_cancelled(self):
        """IT-CIT-059 - Prueba de Integración - completed cannot be cancelled

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentTransitionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: completed cannot be cancelled.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, status=AppointmentStatus.COMPLETED
        )

        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {
                    "status": AppointmentStatus.CANCELLED,
                    "reason": "Ya no puede asistir el cliente.",
                },
                appointment,
            ),
            "invalid_appointment_transition",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn("terminales", problem["detail"])
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.COMPLETED)
        self.assertFalse(AppointmentStatusChange.objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_unlisted_transitions_are_rejected(self):
        """IT-CIT-060 - Prueba de Integración - unlisted transitions are rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentTransitionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unlisted transitions are rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        invalid = (
            (AppointmentStatus.PENDING, AppointmentStatus.COMPLETED),
            (AppointmentStatus.PENDING, AppointmentStatus.NO_SHOW),
            (AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.CANCELLED, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED),
        )
        for current, target in invalid:
            with self.subTest(current=current, target=target):
                self.clear_appointments()
                appointment = self.make_appointment(self.day, status=current)
                response = self.patch_status(
                    self.agent,
                    {
                        "status": target,
                        "reason": "Motivo suficientemente largo.",
                    },
                    appointment,
                )
                self.assertProblem(
                    response,
                    "invalid_appointment_transition",
                    http_status.HTTP_400_BAD_REQUEST,
                )
                appointment.refresh_from_db()
                self.assertEqual(appointment.status, current)

    def test_repeating_the_same_status_is_idempotent(self):
        """IT-CIT-061 - Prueba de Integración - repeating the same status is idempotent

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentTransitionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: repeating the same status is idempotent.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        first = self.patch_status(
            self.agent, {"status": AppointmentStatus.CONFIRMED}
        )
        self.assertEqual(first.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(AppointmentStatusChange.objects.count(), 1)

        second = self.patch_status(
            self.agent, {"status": AppointmentStatus.CONFIRMED}
        )

        self.assertEqual(second.status_code, http_status.HTTP_200_OK)
        self.assertEqual(second.data["status"], "CONFIRMED")
        self.assertEqual(second.data["previous_status"], "CONFIRMED")
        self.assertEqual(AppointmentStatusChange.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 2)


# ===== AppointmentStatusValidationTests: grupo de pruebas de appointment status validation =====
class AppointmentStatusValidationTests(AppointmentStatusApiTestCase):
    def test_pending_is_not_an_allowed_destination(self):
        """IT-CIT-062 - Prueba de Integración - pending is not an allowed destination

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: pending is not an allowed destination.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(self.agent, {"status": "PENDING"}),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "status")

    def test_reschedule_requires_scheduled_at(self):
        """IT-CIT-063 - Prueba de Integración - reschedule requires scheduled at

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule requires scheduled at.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )

        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {
                    "status": AppointmentStatus.RESCHEDULED,
                    "reason": "Cambio de horario solicitado.",
                },
                appointment,
            ),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")

    def test_scheduled_at_is_forbidden_outside_reschedule(self):
        """IT-CIT-064 - Prueba de Integración - scheduled at is forbidden outside reschedule

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: scheduled at is forbidden outside reschedule.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {
                    "status": AppointmentStatus.CONFIRMED,
                    "scheduled_at": self.iso(self.next_day),
                },
            ),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")

    def test_cancel_requires_reason(self):
        """IT-CIT-065 - Prueba de Integración - cancel requires reason

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: cancel requires reason.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(self.agent, {"status": AppointmentStatus.CANCELLED}),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "reason")

    def test_reschedule_requires_reason(self):
        """IT-CIT-066 - Prueba de Integración - reschedule requires reason

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule requires reason.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )

        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {
                    "status": AppointmentStatus.RESCHEDULED,
                    "scheduled_at": self.iso(self.next_day),
                },
                appointment,
            ),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "reason")

    def test_unknown_field_is_rejected(self):
        """IT-CIT-067 - Prueba de Integración - unknown field is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown field is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {"status": AppointmentStatus.CONFIRMED, "color": "rojo"},
            ),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(problem["errors"][0]["parameter"], "color")

    def test_reschedule_to_a_past_date_is_rejected(self):
        """IT-CIT-068 - Prueba de Integración - reschedule to a past date is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule to a past date is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )
        yesterday = timezone.localdate() - timedelta(days=1)

        response = self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": self.iso(yesterday),
                "reason": "Horario que ya pasó.",
            },
            appointment,
        )

        self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )

    def test_reschedule_to_an_unpublished_slot_is_rejected(self):
        """IT-CIT-069 - Prueba de Integración - reschedule to an unpublished slot is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusValidationTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule to an unpublished slot is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )

        response = self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": self.iso(self.next_day, hour=15, minute=30),
                "reason": "Horario que no está en la agenda.",
            },
            appointment,
        )

        problem = self.assertProblem(
            response, "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")


# ===== AppointmentRescheduleTests: grupo de pruebas de appointment reschedule =====
class AppointmentRescheduleTests(AppointmentStatusApiTestCase):
    def test_reschedule_moves_the_slot_and_clears_confirmation(self):
        """IT-CIT-070 - Prueba de Integración - reschedule moves the slot and clears confirmation

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentRescheduleTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule moves the slot and clears confirmation.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )

        response = self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": self.iso(self.next_day),
                "reason": "El propietario no está disponible ese día.",
            },
            appointment,
        )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "RESCHEDULED")
        self.assertEqual(response.data["previous_status"], "CONFIRMED")
        self.assertEqual(response.data["scheduled_at"], self.iso(self.next_day))
        self.assertEqual(
            response.data["previous_scheduled_at"], self.iso(self.day, hour=16)
        )

        appointment.refresh_from_db()
        self.assertEqual(appointment.scheduled_at, self.local_at(self.next_day))
        self.assertEqual(appointment.reschedule_count, 1)
        self.assertIsNone(appointment.confirmed_at)
        self.assertEqual(appointment.end_at, self.local_at(self.next_day) + timedelta(hours=1))
        change = AppointmentStatusChange.objects.get()
        self.assertEqual(change.new_scheduled_at, self.local_at(self.next_day))
        self.assertEqual(change.reason, "El propietario no está disponible ese día.")

    def test_reschedule_conflict_returns_409_and_keeps_the_appointment(self):
        """IT-CIT-071 - Prueba de Integración - reschedule conflict returns 409 and keeps the appointment

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentRescheduleTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule conflict returns 409 and keeps the appointment.
        Código HTTP Esperado: 409 Conflict
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 409 Conflict y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )
        self.make_appointment(
            self.next_day,
            hour=16,
            status=AppointmentStatus.CONFIRMED,
            client=make_user("otro-cliente", role=ROLE_CLIENT),
        )

        problem = self.assertProblem(
            self.patch_status(
                self.agent,
                {
                    "status": AppointmentStatus.RESCHEDULED,
                    "scheduled_at": self.iso(self.next_day, hour=16),
                    "reason": "Se intentó mover a un horario ocupado.",
                },
                appointment,
            ),
            "appointment_slot_conflict",
            http_status.HTTP_409_CONFLICT,
        )

        self.assertIn("ya esta ocupado", problem["detail"])
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.CONFIRMED)
        self.assertEqual(appointment.scheduled_at, self.local_at(self.day, 16))
        self.assertFalse(AppointmentStatusChange.objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_cancel_releases_the_time_slot(self):
        """IT-CIT-072 - Prueba de Integración - cancel releases the time slot

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentRescheduleTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: cancel releases the time slot.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        url = f"/api/v1/properties/{self.property.id}/available-slots"
        self.client.force_authenticate(None)

        before = self.client.get(url, {"date": self.day.isoformat()})
        self.assertEqual(before.status_code, http_status.HTTP_200_OK)
        self.assertNotIn(self.iso(self.day), [slot["start_at"] for slot in before.data["slots"]])

        self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.CANCELLED,
                "reason": "El cliente canceló la visita.",
            },
        )

        self.client.force_authenticate(None)
        after = self.client.get(url, {"date": self.day.isoformat()})
        self.assertEqual(after.status_code, http_status.HTTP_200_OK)
        self.assertIn(self.iso(self.day), [slot["start_at"] for slot in after.data["slots"]])

    def test_reschedule_frees_the_previous_slot(self):
        """IT-CIT-073 - Prueba de Integración - reschedule frees the previous slot

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentRescheduleTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule frees the previous slot.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        url = f"/api/v1/properties/{self.property.id}/available-slots"

        self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": self.iso(self.next_day),
                "reason": "Se movió la visita al día siguiente.",
            },
        )

        self.client.force_authenticate(None)
        previous_day = self.client.get(url, {"date": self.day.isoformat()})
        self.assertIn(
            self.iso(self.day),
            [slot["start_at"] for slot in previous_day.data["slots"]],
        )
        new_day = self.client.get(url, {"date": self.next_day.isoformat()})
        self.assertNotIn(
            self.iso(self.next_day),
            [slot["start_at"] for slot in new_day.data["slots"]],
        )


# ===== AppointmentStatusPermissionTests: grupo de pruebas de appointment status permission =====
class AppointmentStatusPermissionTests(AppointmentStatusApiTestCase):
    def test_client_cannot_change_the_status(self):
        """IT-CIT-074 - Prueba de Integración - client cannot change the status

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: client cannot change the status.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(
                self.client_user, {"status": AppointmentStatus.CONFIRMED}
            ),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            problem["required_roles"], [ROLE_AGENT, ROLE_ADMIN]
        )
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    def test_agent_not_assigned_cannot_change_the_status(self):
        """IT-CIT-075 - Prueba de Integración - agent not assigned cannot change the status

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent not assigned cannot change the status.
        Código HTTP Esperado: 403 Forbidden
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.patch_status(
                self.other_agent, {"status": AppointmentStatus.CONFIRMED}
            ),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(problem["required_roles"], [ROLE_AGENT])

    def test_admin_can_change_any_status(self):
        """IT-CIT-076 - Prueba de Integración - admin can change any status

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: admin can change any status.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(
            self.admin, {"status": AppointmentStatus.CONFIRMED}
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_anonymous_user_gets_401(self):
        """IT-CIT-077 - Prueba de Integración - anonymous user gets 401

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: anonymous user gets 401.
        Código HTTP Esperado: 401 Unauthorized
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(None)
        response = self.client.patch(
            f"/api/v1/appointments/{self.appointment.id}/status",
            {"status": AppointmentStatus.CONFIRMED},
            format="json",
        )
        self.assertProblem(
            response, "unauthorized", http_status.HTTP_401_UNAUTHORIZED
        )

    def test_unknown_appointment_returns_404(self):
        """IT-CIT-078 - Prueba de Integración - unknown appointment returns 404

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown appointment returns 404.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(self.agent)
        response = self.client.patch(
            f"/api/v1/appointments/{uuid.uuid4()}/status",
            {"status": AppointmentStatus.CONFIRMED},
            format="json",
        )
        self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )

    def test_agent_list_only_shows_their_own_appointments(self):
        """IT-CIT-079 - Prueba de Integración - agent list only shows their own appointments

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusPermissionTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: agent list only shows their own appointments.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        other_property = make_property(
            self.district, self.other_agent, index=2
        )
        foreign = self.make_appointment(
            self.day,
            hour=16,
            agent=self.other_agent,
            prop=other_property,
        )

        self.client.force_authenticate(self.agent)
        response = self.client.get("/api/v1/appointments")

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]
        self.assertIn(str(self.appointment.id), ids)
        self.assertNotIn(str(foreign.id), ids)


# ===== AppointmentStatusEmailTests: grupo de pruebas de appointment status email =====
class AppointmentStatusEmailTests(AppointmentStatusApiTestCase):
    def test_status_change_notifies_both_parties(self):
        """IT-CIT-080 - Prueba de Integración - status change notifies both parties

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusEmailTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: status change notifies both parties.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02 y RF-SEC-05
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.CANCELLED,
                "reason": "El cliente canceló la visita.",
            },
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

        self.assertEqual(len(mail.outbox), 2)
        recipients = {message.to[0] for message in mail.outbox}
        self.assertEqual(
            recipients, {self.client_user.email, self.agent.email}
        )
        for message in mail.outbox:
            self.assertIn(self.property.title, message.subject)
            self.assertIn("Cancelada", message.body)
            self.assertIn("Pendiente", message.body)
            self.assertIn("El cliente canceló la visita.", message.body)
            self.assertIn("America/Lima", message.body)

    def test_reschedule_email_includes_the_previous_time(self):
        """IT-CIT-081 - Prueba de Integración - reschedule email includes the previous time

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusEmailTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: reschedule email includes the previous time.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-02 y RF-SEC-05
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        appointment = self.make_appointment(
            self.day, hour=16, status=AppointmentStatus.CONFIRMED
        )

        self.patch_status(
            self.agent,
            {
                "status": AppointmentStatus.RESCHEDULED,
                "scheduled_at": self.iso(self.next_day),
                "reason": "Se movió la visita al día siguiente.",
            },
            appointment,
        )

        self.assertEqual(len(mail.outbox), 2)
        for message in mail.outbox:
            self.assertIn("Horario anterior", message.body)
            self.assertIn("Reprogramada", message.body)

    def test_mail_failure_does_not_revert_the_transition(self):
        """IT-CIT-082 - Prueba de Integración - mail failure does not revert the transition

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AppointmentStatusEmailTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: mail failure does not revert the transition.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-02 y RF-SEC-05
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        with self.assertLogs("apps.appointments.emails", level="ERROR"):
            with patch(
                "apps.appointments.emails.send_mail",
                side_effect=RuntimeError("SMTP caído"),
            ):
                response = self.patch_status(
                    self.agent, {"status": AppointmentStatus.CONFIRMED}
                )

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)
