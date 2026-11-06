"""Pruebas de HTTP de `GET .../available-slots` (RF-CRM-01).

La operación es pública (`security: []` del contrato), así que cada caso
entra sin sesión salvo el que prepara la agenda con el `PUT .../schedules`,
que sí exige ser el agente del inmueble.
"""

import pytest

from datetime import datetime, time, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APITestCase

from apps.properties.models import Weekday
from apps.properties.permissions import ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import (
    make_district,
    make_property,
    make_user,
    make_week,
)

from apps.appointments import services

pytestmark = pytest.mark.integration

LIMA = ZoneInfo("America/Lima")


# ===== AvailableSlotsApiTestCase: grupo de pruebas de available slots =====
class AvailableSlotsApiTestCase(APITestCase):
    """Inmueble con agenda publicada para el día de mañana."""

    def setUp(self):
        self.district = make_district()
        self.agent = make_user("agente", role=ROLE_AGENT)
        self.property = make_property(self.district, self.agent, index=1)
        self.base = f"/api/v1/properties/{self.property.id}"
        self.url = f"{self.base}/available-slots"

        # Mañana: la fecha siempre cabe en el horizonte de 60 días y nunca
        # es pasada, así los tests no dependen de la hora en que corra la suite.
        self.day = timezone.localdate() + timedelta(days=1)
        self.weekday = Weekday(self.day.weekday()).name

        self.publish_week(
            (self.weekday, [("14:00", "15:00"), ("16:00", "17:00")])
        )
        self.client.force_authenticate(None)

    def publish_week(self, *days):
        self.client.force_authenticate(self.agent)
        response = self.client.put(
            f"{self.base}/schedules", make_week(*days), format="json"
        )
        assert response.status_code == http_status.HTTP_200_OK, response.content
        return response

    def get_slots(self, date=None):
        suffix = f"?date={date}" if date else ""
        return self.client.get(self.url + suffix)

    @staticmethod
    def at(day, hour, minute=0):
        """Inicio de una franja local de Lima en el formato UTC del contrato."""
        instant = datetime.combine(day, time(hour, minute), tzinfo=LIMA)
        return (
            instant.astimezone(ZoneInfo("UTC")).isoformat(timespec="seconds").replace(
                "+00:00", "Z"
            )
        )

    def assertProblem(self, response, code, status_code=None):
        if status_code is not None:
            self.assertEqual(response.status_code, status_code)
        problem = response.json()
        self.assertEqual(problem["code"], code)
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/problem+json"
        )
        return problem


# ===== AvailableSlotsApiTests: grupo de pruebas de available slots =====
class AvailableSlotsApiTests(AvailableSlotsApiTestCase):
    def test_public_endpoint_returns_free_slots_in_utc(self):
        """IT-CIT-001 - Prueba de Integración - public endpoint returns free slots in utc

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: public endpoint returns free slots in utc.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get_slots(self.day.isoformat())

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"].split(";")[0], "application/json"
        )
        body = response.json()
        self.assertEqual(body["property_id"], str(self.property.id))
        self.assertEqual(body["date"], self.day.isoformat())
        self.assertEqual(body["timezone"], "America/Lima")
        self.assertEqual(body["total_slots"], 2)
        self.assertEqual(
            [slot["start_at"] for slot in body["slots"]],
            [self.at(self.day, 14), self.at(self.day, 16)],
        )
        self.assertEqual(
            [slot["end_at"] for slot in body["slots"]],
            [self.at(self.day, 15), self.at(self.day, 17)],
        )
        self.assertEqual(
            [slot["duration_minutes"] for slot in body["slots"]], [60, 60]
        )

    def test_missing_date_is_rejected(self):
        """IT-CIT-002 - Prueba de Integración - missing date is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: missing date is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get_slots(), "invalid_query_parameter", http_status.HTTP_400_BAD_REQUEST
        )

        self.assertEqual(problem["errors"][0]["parameter"], "date")
        self.assertIn("obligatorio", problem["detail"])

    def test_malformed_date_is_rejected(self):
        """IT-CIT-003 - Prueba de Integración - malformed date is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: malformed date is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        problem = self.assertProblem(
            self.get_slots("08-10-2026"),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(problem["errors"][0]["parameter"], "date")
        self.assertIn("YYYY-MM-DD", problem["errors"][0]["message"])

    def test_past_date_is_rejected(self):
        """IT-CIT-004 - Prueba de Integración - past date is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: past date is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        yesterday = timezone.localdate() - timedelta(days=1)
        problem = self.assertProblem(
            self.get_slots(yesterday.isoformat()),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"], "No se puede consultar disponibilidad de una fecha pasada."
        )
        self.assertIn("anterior a la fecha de hoy", problem["errors"][0]["message"])

    def test_date_beyond_the_sixty_day_horizon_is_rejected(self):
        """IT-CIT-005 - Prueba de Integración - date beyond the sixty day horizon is rejected

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: date beyond the sixty day horizon is rejected.
        Código HTTP Esperado: 400 Bad Request
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        too_far = timezone.localdate() + timedelta(days=services.BOOKING_HORIZON_DAYS + 1)
        problem = self.assertProblem(
            self.get_slots(too_far.isoformat()),
            "invalid_query_parameter",
            http_status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            problem["detail"],
            "La fecha pedida supera el horizonte de 60 dias para agendar visitas.",
        )
        horizon = timezone.localdate() + timedelta(days=services.BOOKING_HORIZON_DAYS)
        self.assertEqual(
            problem["errors"][0]["message"],
            f"La fecha maxima admitida es {horizon.isoformat()}.",
        )

    def test_unknown_property_is_not_found(self):
        """IT-CIT-006 - Prueba de Integración - unknown property is not found

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: unknown property is not found.
        Código HTTP Esperado: 404 Not Found
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 404 Not Found y el efecto se refleja en el estado o la base de datos.
        """
        response = self.client.get(
            f"/api/v1/properties/{uuid4()}/available-slots?date={self.day.isoformat()}"
        )

        problem = self.assertProblem(
            response, "resource_not_found", http_status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            problem["type"], "https://housebroker.pe/errors/resource-not-found"
        )
        self.assertEqual(
            problem["detail"], "No existe una propiedad con el identificador indicado."
        )

    def test_day_without_attention_returns_an_empty_list(self):
        """IT-CIT-007 - Prueba de Integración - day without attention returns an empty list

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: day without attention returns an empty list.
        Código HTTP Esperado: 200 OK
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        response = self.get_slots((self.day + timedelta(days=1)).isoformat())

        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["total_slots"], 0)
        self.assertEqual(body["slots"], [])

    def test_deactivated_slot_is_not_listed(self):
        """IT-CIT-008 - Prueba de Integración - deactivated slot is not listed

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: deactivated slot is not listed.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.property.schedule_slots.filter(start_time__hour=14).update(
            is_active=False
        )

        body = self.get_slots(self.day.isoformat()).json()

        self.assertEqual(body["total_slots"], 1)
        self.assertEqual(
            [slot["start_at"] for slot in body["slots"]], [self.at(self.day, 16)]
        )

    def test_day_with_every_slot_deactivated_returns_an_empty_list(self):
        """IT-CIT-009 - Prueba de Integración - day with every slot deactivated returns an empty list

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: day with every slot deactivated returns an empty list.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        self.property.schedule_slots.update(is_active=False)

        body = self.get_slots(self.day.isoformat()).json()

        self.assertEqual(body["total_slots"], 0)
        self.assertEqual(body["slots"], [])

    def test_slot_taken_by_an_appointment_disappears_from_the_list(self):
        """IT-CIT-010 - Prueba de Integración - slot taken by an appointment disappears from the list

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: slot taken by an appointment disappears from the list.
        Código HTTP Esperado: 201 Created
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        self.client.force_authenticate(make_user("cliente", role=ROLE_CLIENT))
        booking = self.client.post(
            "/api/v1/appointments",
            {
                "property_id": str(self.property.id),
                "scheduled_at": self.at(self.day, 14),
            },
            format="json",
        )
        self.assertEqual(booking.status_code, http_status.HTTP_201_CREATED)

        self.client.force_authenticate(None)
        body = self.get_slots(self.day.isoformat()).json()

        self.assertEqual(body["total_slots"], 1)
        self.assertEqual([slot["start_at"] for slot in body["slots"]], [self.at(self.day, 16)])

    def test_hours_already_passed_on_the_requested_day_are_filtered(self):
        # El filtro de vencidas es cálculo, no error: la respuesta sigue
        # siendo `200` y solo deja de ofrecer la franja que ya pasó.
        """IT-CIT-011 - Prueba de Integración - hours already passed on the requested day are filtered

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Citas / AvailableSlotsApiTests.
        Propósito del Escenario: Comprueba el comportamiento descrito por la prueba: hours already passed on the requested day are filtered.
        Código HTTP Esperado: N/A
        Requisito: RF-CRM-01
        Resultado Esperado: La respuesta devuelve N/A y el efecto se refleja en el estado o la base de datos.
        """
        now = datetime.combine(self.day, time(15, 30), tzinfo=LIMA)

        free = services.available_slots(self.property, self.day, now=now)

        self.assertEqual(
            [slot.start_at for slot in free],
            [
                datetime.combine(self.day, time(16, 0), tzinfo=LIMA).astimezone(
                    ZoneInfo("UTC")
                )
            ],
        )
