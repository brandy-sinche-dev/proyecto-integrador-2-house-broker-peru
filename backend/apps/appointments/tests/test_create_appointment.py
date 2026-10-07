"""Pruebas de HTTP de `POST /api/v1/appointments` (RF-CRM-01 y RF-SEC-05).

Cada caso entra por la URL real porque lo que se quiere fijar es el contrato
que consume el formulario de reserva: código, `type`/`title` del sobre
`application/problem+json`, cabecera `Location`, efecto observable en la
agenda y correos emitidos.
"""

from datetime import datetime, time, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.core import mail
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.properties.models import PropertyStatus, Weekday
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import (
    make_district,
    make_property,
    make_user,
    make_week,
)

from apps.appointments.models import Appointment, AppointmentSource, AppointmentStatus

LIMA = ZoneInfo("America/Lima")
UTC = ZoneInfo("UTC")


class AppointmentApiTestCase(APITestCase):
    """Inmueble con agenda de mañana, su agente y un cliente."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.client_user = make_user("cliente", role=ROLE_CLIENT)
        self.property = make_property(self.district, self.agent, index=1)
        self.url = "/api/v1/appointments"

        self.day = timezone.localdate() + timedelta(days=1)
        self.weekday = Weekday(self.day.weekday()).name
        self.publish_week(
            self.property, (self.weekday, [("14:00", "15:00"), ("16:00", "17:00")])
        )

    def publish_week(self, prop, *days):
        """Publica la agenda de `prop` como su agente, como en el flujo real."""
        self.client.force_authenticate(self.agent)
        response = self.client.put(
            f"/api/v1/properties/{prop.id}/schedules", make_week(*days), format="json"
        )
        assert response.status_code == http_status.HTTP_200_OK, response.content
        self.client.force_authenticate(None)
        return response

    def at(self, hour, minute=0, day=None):
        """Instante UTC de una hora local de Lima, en formato del contrato."""
        day = day or self.day
        instant = datetime.combine(day, time(hour, minute), tzinfo=LIMA)
        return instant.astimezone(UTC).isoformat(timespec="seconds").replace(
            "+00:00", "Z"
        )

    def book(self, user=None, **overrides):
        payload = {
            "property_id": str(self.property.id),
            "scheduled_at": self.at(14),
        }
        payload.update(overrides)
        if user is not None:
            self.client.force_authenticate(user)
        return self.client.post(self.url, payload, format="json")

    def assertProblem(self, response, code, status_code):
        self.assertEqual(response.status_code, status_code)
        problem = response.json()
        self.assertEqual(problem["code"], code)
        self.assertEqual(
            problem["status"], status_code, f"el `status` del sobre debe coincidir: {problem}"
        )
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/problem+json"
        )
        return problem


class AppointmentPermissionTests(AppointmentApiTestCase):
    def test_anonymous_is_rejected_with_401(self):
        problem = self.assertProblem(
            self.book(), "unauthorized", http_status.HTTP_401_UNAUTHORIZED
        )

        self.assertEqual(
            problem["type"], "https://housebroker.pe/errors/unauthorized"
        )
        self.assertEqual(Appointment.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_client_cannot_book_on_behalf_of_someone_else(self):
        other = make_user("otro", role=ROLE_CLIENT)

        problem = self.assertProblem(
            self.book(self.client_user, client_id=str(other.id)),
            "forbidden",
            http_status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            problem["detail"],
            "Un cliente no puede registrar citas en nombre de otro usuario.",
        )
        self.assertEqual(Appointment.objects.count(), 0)

    def test_get_on_the_collection_is_not_part_of_this_task(self):
        # El listado es `TASK-BACK-CRM-02` (#97): hasta entonces el router
        # responde `405` con el sobre de error en vez de un `404` de Django.
        self.client.force_authenticate(self.client_user)

        problem = self.assertProblem(
            self.client.get(self.url),
            "method_not_allowed",
            http_status.HTTP_405_METHOD_NOT_ALLOWED,
        )

        self.assertEqual(
            problem["type"], "https://housebroker.pe/errors/method-not-allowed"
        )


class AppointmentCreationTests(AppointmentApiTestCase):
    def test_client_books_for_himself(self):
        response = self.book(self.client_user)

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/json"
        )
        body = response.json()
        appointment = Appointment.objects.get()

        self.assertEqual(str(appointment.id), body["id"])
        self.assertIn(
            f"{self.url}/{appointment.id}", response["Location"]
        )
        self.assertEqual(response["Location"], f"http://testserver{self.url}/{appointment.id}")
        self.assertEqual(body["status"], AppointmentStatus.PENDING)
        self.assertEqual(body["scheduled_at"], self.at(14))
        self.assertEqual(body["duration_minutes"], 60)
        self.assertIsNone(body["reason"])
        self.assertEqual(body["created_at"], body["updated_at"])

        self.assertEqual(body["property"]["id"], str(self.property.id))
        self.assertEqual(body["property"]["title"], self.property.title)
        self.assertEqual(body["property"]["district"], self.district.name)
        self.assertEqual(body["property"]["address"], self.property.address)

        self.assertEqual(body["client"]["id"], str(self.client_user.id))
        self.assertEqual(body["client"]["email"], self.client_user.email)
        self.assertEqual(body["agent"]["id"], str(self.agent.id))
        self.assertEqual(body["agent"]["email"], self.agent.email)

        self.assertEqual(appointment.client_id, self.client_user.id)
        self.assertEqual(appointment.agent_id, self.agent.id)
        self.assertEqual(appointment.status, AppointmentStatus.PENDING)
        self.assertEqual(appointment.source, AppointmentSource.CLIENT_WEB)
        self.assertEqual(appointment.end_at, appointment.scheduled_at + timedelta(minutes=60))

    def test_agent_books_on_behalf_of_a_client(self):
        response = self.book(self.agent, client_id=str(self.client_user.id))

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        appointment = Appointment.objects.get()
        self.assertEqual(appointment.client_id, self.client_user.id)
        self.assertEqual(appointment.agent_id, self.agent.id)
        self.assertEqual(appointment.source, AppointmentSource.AGENT)
        self.assertEqual(response.json()["client"]["id"], str(self.client_user.id))

    def test_admin_can_register_a_visit_too(self):
        admin = make_user("admin", role=ROLE_ADMIN)

        response = self.book(admin, client_id=str(self.client_user.id))

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(
            Appointment.objects.get().source, AppointmentSource.ADMIN
        )

    def test_agent_without_client_id_is_rejected(self):
        problem = self.assertProblem(
            self.book(self.agent),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "client_id")
        self.assertEqual(Appointment.objects.count(), 0)

    def test_unknown_property_is_not_found(self):
        problem = self.assertProblem(
            self.book(self.client_user, property_id="00000000-0000-4000-8000-000000000000"),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )

        self.assertEqual(
            problem["detail"], "No existe una propiedad con el identificador indicado."
        )

    def test_unknown_client_id_is_not_found(self):
        problem = self.assertProblem(
            self.book(
                self.agent, client_id="00000000-0000-4000-8000-000000000000"
            ),
            "resource_not_found",
            http_status.HTTP_404_NOT_FOUND,
        )

        self.assertEqual(Appointment.objects.count(), 0)


class AppointmentValidationTests(AppointmentApiTestCase):
    def test_property_that_cannot_be_visited_is_rejected(self):
        self.property.status = PropertyStatus.VENDIDO
        self.property.save(update_fields=["status"])

        problem = self.assertProblem(
            self.book(self.client_user),
            "property_not_bookable",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["type"], "https://housebroker.pe/errors/property-not-bookable"
        )
        self.assertEqual(problem["title"], "Propiedad no agendable")
        self.assertEqual(
            problem["detail"],
            "La propiedad esta en estado 'VENDIDO' y no admite nuevas visitas.",
        )
        self.assertEqual(problem["errors"][0]["parameter"], "property_id")
        self.assertEqual(Appointment.objects.count(), 0)

    def test_unpublished_property_is_rejected(self):
        self.property.status = PropertyStatus.SUSPENDIDO
        self.property.is_active = False
        self.property.save(update_fields=["status", "is_active"])

        problem = self.assertProblem(
            self.book(self.client_user),
            "property_not_bookable",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "La propiedad no esta publicada y no admite nuevas visitas.",
        )

    def test_hour_outside_the_schedule_is_rejected(self):
        problem = self.assertProblem(
            self.book(self.client_user, scheduled_at=self.at(20)),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")
        self.assertIn(
            "Los horarios disponibles para el", problem["errors"][0]["message"]
        )
        self.assertIn("14:00 y 16:00", problem["errors"][0]["message"])

    def test_hour_inside_a_slot_but_not_on_its_start_is_rejected(self):
        problem = self.assertProblem(
            self.book(self.client_user, scheduled_at=self.at(14, 30)),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")
        self.assertEqual(Appointment.objects.count(), 0)

    def test_missing_scheduled_at_is_rejected(self):
        problem = self.assertProblem(
            self.book(self.client_user, scheduled_at=None),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")

    def test_past_visit_is_rejected(self):
        # `self.day` es mañana, así que la referencia es hoy y no el día
        # anterior a la agenda, que caería dentro del horizonte.
        yesterday = timezone.localdate() - timedelta(days=1)
        problem = self.assertProblem(
            self.book(self.client_user, scheduled_at=self.at(14, day=yesterday)),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"], "No se puede agendar una visita en una fecha pasada."
        )
        self.assertEqual(problem["errors"][0]["parameter"], "scheduled_at")

    def test_visit_beyond_the_sixty_day_horizon_is_rejected(self):
        far = self.day + timedelta(days=61)
        problem = self.assertProblem(
            self.book(self.client_user, scheduled_at=self.at(14, day=far)),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "La fecha pedida supera el horizonte de 60 dias para agendar visitas.",
        )

    def test_unknown_field_is_rejected_instead_of_ignored(self):
        problem = self.assertProblem(
            self.book(self.client_user, motivo="Prefiero la tarde"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual([error["parameter"] for error in problem["errors"]], ["motivo"])


class AppointmentConflictTests(AppointmentApiTestCase):
    def test_second_reservation_of_the_same_slot_conflicts(self):
        first = self.book(self.client_user)
        self.assertEqual(first.status_code, http_status.HTTP_201_CREATED)

        other = make_user("cliente-2", role=ROLE_CLIENT)
        problem = self.assertProblem(
            self.book(other),
            "appointment_slot_conflict",
            http_status.HTTP_409_CONFLICT,
        )

        self.assertEqual(
            problem["type"],
            "https://housebroker.pe/errors/appointment-slot-conflict",
        )
        self.assertEqual(problem["title"], "Conflicto de horario de cita")
        self.assertEqual(problem["instance"], self.url)
        self.assertIn("ya esta ocupado", problem["detail"])

        self.assertEqual(Appointment.objects.count(), 1)
        # El correo solo sale si la cita llegó a crearse.
        self.assertEqual(len(mail.outbox), 2)

    def test_overlapping_slot_of_the_same_agent_conflicts(self):
        first = self.book(self.client_user)
        self.assertEqual(first.status_code, http_status.HTTP_201_CREATED)

        # Otra propiedad, mismo agente y misma agenda: la visita lo agotaría,
        # aunque el inmueble esté libre.
        other_property = make_property(self.district, self.agent, index=2)
        self.publish_week(
            other_property, (self.weekday, [("14:00", "15:00"), ("16:00", "17:00")])
        )
        response = self.book(
            self.client_user, property_id=str(other_property.id)
        )

        self.assertProblem(
            response, "appointment_slot_conflict", http_status.HTTP_409_CONFLICT
        )
        self.assertEqual(Appointment.objects.count(), 1)

    def test_cancelled_appointment_frees_the_slot(self):
        booked = self.book(self.client_user)
        appointment = Appointment.objects.get(id=booked.json()["id"])
        appointment.status = AppointmentStatus.CANCELLED
        appointment.save(update_fields=["status"])

        response = self.book(make_user("cliente-2", role=ROLE_CLIENT))

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 2)


class AppointmentEmailTests(AppointmentApiTestCase):
    def test_both_parties_are_notified_after_the_reservation(self):
        response = self.book(self.client_user)

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 2)

        client_mail, agent_mail = mail.outbox
        self.assertEqual(client_mail.to, [self.client_user.email])
        self.assertEqual(agent_mail.to, [self.agent.email])
        self.assertIn(self.property.title, client_mail.subject)
        self.assertIn(self.property.title, agent_mail.subject)
        self.assertIn("pendiente", client_mail.body)
        self.assertIn(str(Appointment.objects.get().id), agent_mail.body)
        self.assertIn("America/Lima", client_mail.body)

    def test_mail_failure_does_not_revoke_the_appointment(self):
        with self.assertLogs("apps.appointments.emails", level="ERROR"):
            with patch(
                "apps.appointments.emails.send_mail",
                side_effect=OSError("buzón no disponible"),
            ):
                response = self.book(self.client_user)

        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(Appointment.objects.get().status, AppointmentStatus.PENDING)


class AppointmentUrlTests(AppointmentApiTestCase):
    def test_trailing_slash_variant_redirects_to_the_canonical_url(self):
        response = self.client.post(
            f"{self.url}/",
            {"property_id": str(self.property.id), "scheduled_at": self.at(14)},
            format="json",
        )

        self.assertEqual(response.status_code, http_status.HTTP_301_MOVED_PERMANENTLY)
        self.assertEqual(response["Location"], self.url)
        self.assertEqual(Appointment.objects.count(), 0)
