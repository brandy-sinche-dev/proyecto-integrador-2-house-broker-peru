"""Pruebas Pytest de la gestión del inmueble (HU-PROP-01 / RF-PROP-04).

Cubren alta, edición, baja lógica, máquina de estados y agenda semanal, con
especial atención a los roles (`401`/`403`) y a las transiciones inválidas.
"""

import pytest
from rest_framework import status

from apps.properties.models import (
    Property,
    PropertySchedule,
    PropertyStatus,
    PropertyStatusChange,
)
from apps.properties.permissions import ROLE_ADMIN, ROLE_AGENT, ROLE_CLIENT
from apps.properties.tests.helpers import (
    make_district,
    make_property,
    make_user,
    make_week,
)

pytestmark = pytest.mark.django_db

CATALOG = "/api/v1/properties"


@pytest.fixture
def district(db):
    return make_district()


@pytest.fixture
def agent(db):
    return make_user("agente", role=ROLE_AGENT)


@pytest.fixture
def other_agent(db):
    return make_user("otro-agente", role=ROLE_AGENT)


@pytest.fixture
def client_user(db):
    return make_user("cliente", role=ROLE_CLIENT)


@pytest.fixture
def admin(db):
    return make_user("admin", role=ROLE_ADMIN)


@pytest.fixture
def prop(district, agent):
    return make_property(district, agent, index=1)


def property_payload(**overrides):
    payload = {
        "title": "Departamento frente al parque",
        "price": "250000.00",
        "moneda": "PEN",
        "mode": "VENTA",
        "address": "Av. Larco 123, Miraflores",
        "property_type": "DEPARTAMENTO",
        "area_total": "120.00",
        "area_construida": "95.00",
        "dormitorios": 2,
        "banos": 2,
        "estacionamientos": 1,
        "destacado": False,
        "negociable": True,
    }
    payload.update(overrides)
    return payload


def url(prop):
    return f"{CATALOG}/{prop.id}"


def status_url(prop):
    return f"{url(prop)}/status"


def schedules_url(prop):
    return f"{url(prop)}/schedules"


# ===== TestPropertyCrud: grupo de pruebas de property crud =====
class TestPropertyCrud:
    @pytest.mark.integration
    def test_anonymous_create_returns_401(self, api, assert_problem):
        """IT-PROP-158 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Permisos 401: exige autenticación para crear propiedades.
        Código HTTP Esperado: 401 Unauthorized.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        response = api.post(CATALOG, property_payload(), format="json")

        assert_problem(response, "unauthorized", status.HTTP_401_UNAUTHORIZED)

    @pytest.mark.integration
    def test_client_create_returns_403(self, api, authenticate, client_user, assert_problem):
        """IT-PROP-159 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Permisos 403: restringe el alta a AGENTE y ADMINISTRADOR.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)

        response = api.post(CATALOG, property_payload(), format="json")

        problem = assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)
        assert problem["required_roles"] == [ROLE_AGENT, ROLE_ADMIN]
        assert Property.objects.count() == 0

    @pytest.mark.integration
    def test_agent_create_returns_201_with_server_side_fields(
        self, api, authenticate, district, agent
    ):
        """IT-PROP-160 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Camino feliz: crea la propiedad con código, agente, distrito y estado calculados en el servidor.
        Código HTTP Esperado: 201 Created.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 201 Created y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(CATALOG, property_payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED, response.content
        prop = Property.objects.get()
        assert prop.code == "PROP-00001"
        assert prop.agent == agent
        assert prop.created_by == agent
        assert prop.district == district
        assert prop.status == PropertyStatus.DISPONIBLE
        assert response["Location"].endswith(f"{CATALOG}/{prop.id}")
        assert response.json()["is_bookable"] is True

    @pytest.mark.integration
    def test_create_with_an_unknown_district_returns_400(
        self, api, authenticate, agent, assert_problem
    ):
        """IT-PROP-161 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Error 400: rechaza una dirección cuyo distrito no se puede resolver.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            CATALOG, property_payload(address="Calle Los Pinos 123"), format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "address"
        assert Property.objects.count() == 0

    @pytest.mark.integration
    def test_create_with_an_invalid_price_returns_400(
        self, api, authenticate, agent, assert_problem
    ):
        """IT-PROP-162 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Error 400: rechaza un precio por debajo del mínimo permitido.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            CATALOG, property_payload(price="0.00001"), format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert any(error["parameter"] == "price" for error in problem["errors"])

    @pytest.mark.integration
    def test_create_with_an_unknown_field_returns_400(
        self, api, authenticate, agent, assert_problem
    ):
        """IT-PROP-163 - Prueba de Integración — PropertyViewSet.create.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.create.
        Propósito del Escenario: Error 400: rechaza campos fuera del contrato de alta.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.post(
            CATALOG, property_payload(campo_extra="x"), format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "campo_extra"

    @pytest.mark.integration
    def test_owner_agent_can_update_and_district_is_re_resolved(
        self, api, authenticate, district, agent, prop
    ):
        """IT-PROP-164 - Prueba de Integración — PropertyViewSet.update.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.update.
        Propósito del Escenario: Camino feliz: el agente dueño edita y el distrito se vuelve a resolver.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.put(
            url(prop),
            property_payload(title="Título actualizado", address="Av. Larco 456, Miraflores"),
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.content
        prop.refresh_from_db()
        assert prop.title == "Título actualizado"
        assert prop.district == district
        assert response.json()["title"] == "Título actualizado"

    @pytest.mark.integration
    def test_non_owner_agent_cannot_update(
        self, api, authenticate, other_agent, prop, assert_problem
    ):
        """IT-PROP-165 - Prueba de Integración — PropertyViewSet.update.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.update.
        Propósito del Escenario: Permisos 403: impide que otro agente edite una propiedad ajena.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(other_agent)

        response = api.put(url(prop), property_payload(), format="json")

        assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)

    @pytest.mark.integration
    def test_admin_can_update_any_property(
        self, api, authenticate, admin, prop
    ):
        """IT-PROP-166 - Prueba de Integración — PropertyViewSet.update.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.update.
        Propósito del Escenario: Camino feliz: el administrador edita cualquier propiedad.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(admin)

        response = api.put(
            url(prop), property_payload(title="Editado por admin"), format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        prop.refresh_from_db()
        assert prop.title == "Editado por admin"

    @pytest.mark.integration
    def test_delete_is_a_soft_delete(self, api, authenticate, agent, prop):
        """IT-PROP-167 - Prueba de Integración — PropertyViewSet.destroy.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.destroy.
        Propósito del Escenario: Camino feliz: aplica baja lógica y retira la propiedad del catálogo.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.delete(url(prop))

        assert response.status_code == status.HTTP_200_OK, response.content
        prop.refresh_from_db()
        assert prop.is_active is False
        assert prop.deleted_at is not None
        assert api.get(url(prop)).status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_management_action_can_read_a_suspended_property(
        self, api, authenticate, district, agent
    ):
        """IT-PROP-168 - Prueba de Integración — PropertyViewSet.management.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.management.
        Propósito del Escenario: Camino feliz: la vista de gestión sí puede leer una propiedad suspendida.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        suspended = make_property(
            district, agent, index=2, status=PropertyStatus.SUSPENDIDO
        )
        authenticate(agent)

        response = api.get(f"{url(suspended)}/management")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == PropertyStatus.SUSPENDIDO


# ===== TestPropertyStatus: grupo de pruebas de property status =====
class TestPropertyStatus:
    @pytest.mark.integration
    def test_available_to_reserved_records_the_change(
        self, api, authenticate, agent, prop
    ):
        """IT-PROP-169 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Camino feliz: aplica DISPONIBLE→RESERVADO y registra el historial.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.patch(
            status_url(prop),
            {"status": PropertyStatus.RESERVADO, "reason": "Reserva con seña"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.content
        body = response.json()
        assert body["status"] == PropertyStatus.RESERVADO
        assert body["previous_status"] == PropertyStatus.DISPONIBLE
        assert body["is_active"] is True
        assert body["reason"] == "Reserva con seña"
        assert PropertyStatusChange.objects.filter(property=prop).count() == 1

    @pytest.mark.integration
    def test_auditable_transition_requires_a_reason(
        self, api, authenticate, agent, prop, assert_problem
    ):
        """IT-PROP-170 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Error 400: exige motivo en las transiciones auditables.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.patch(
            status_url(prop), {"status": PropertyStatus.RESERVADO}, format="json"
        )

        problem = assert_problem(
            response, "invalid_query_parameter", status.HTTP_400_BAD_REQUEST
        )
        assert problem["errors"][0]["parameter"] == "reason"

    @pytest.mark.integration
    def test_transition_outside_the_matrix_returns_400(
        self, api, authenticate, agent, prop, assert_problem
    ):
        """IT-PROP-171 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Error 400: rechaza una transición fuera de la matriz y conserva el estado.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.patch(
            status_url(prop),
            {"status": PropertyStatus.VENDIDO, "reason": "Venta directa"},
            format="json",
        )

        assert_problem(
            response, "invalid_property_transition", status.HTTP_400_BAD_REQUEST
        )
        prop.refresh_from_db()
        assert prop.status == PropertyStatus.DISPONIBLE

    @pytest.mark.integration
    def test_suspend_hides_it_from_the_catalog_and_resume_restores_it(
        self, api, authenticate, agent, prop
    ):
        """IT-PROP-172 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Regla de negocio: suspender oculta del catálogo y reanudar restaura la visibilidad.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        suspended = api.patch(
            status_url(prop),
            {"status": PropertyStatus.SUSPENDIDO, "reason": "Retiro temporal"},
            format="json",
        )
        assert suspended.status_code == status.HTTP_200_OK
        assert suspended.json()["is_active"] is False
        assert api.get(CATALOG).json()["count"] == 0

        resumed = api.patch(
            status_url(prop), {"status": PropertyStatus.DISPONIBLE}, format="json"
        )
        assert resumed.status_code == status.HTTP_200_OK, resumed.content
        assert resumed.json()["is_active"] is True
        assert api.get(CATALOG).json()["count"] == 1

    @pytest.mark.integration
    def test_terminal_status_cannot_be_changed_to_sold(
        self, api, authenticate, district, agent, assert_problem
    ):
        """IT-PROP-173 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Error 400: impide mover un estado terminal a otro estado.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        rented = make_property(
            district, agent, index=2, status=PropertyStatus.ALQUILADO
        )
        authenticate(agent)

        response = api.patch(
            status_url(rented),
            {"status": PropertyStatus.VENDIDO, "reason": "Intento de cierre"},
            format="json",
        )

        problem = assert_problem(
            response, "invalid_property_transition", status.HTTP_400_BAD_REQUEST
        )
        assert "terminales" in problem["detail"]

    @pytest.mark.integration
    def test_client_cannot_change_the_status(
        self, api, authenticate, client_user, prop, assert_problem
    ):
        """IT-PROP-174 - Prueba de Integración — PropertyViewSet.status.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.status.
        Propósito del Escenario: Permisos 403: el rol CLIENTE no puede cambiar el estado.
        Código HTTP Esperado: 403 Forbidden.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)

        response = api.patch(
            status_url(prop), {"status": PropertyStatus.RESERVADO, "reason": "Reserva"},
            format="json",
        )

        assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)


# ===== TestPropertySchedules: grupo de pruebas de property schedules =====
class TestPropertySchedules:
    @pytest.mark.integration
    def test_put_replaces_the_week_and_get_returns_all_days(
        self, api, authenticate, agent, prop
    ):
        """IT-PROP-175 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Camino feliz: PUT reemplaza la semana y GET devuelve los siete días.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        saved = api.put(
            schedules_url(prop),
            make_week(
                ("LUNES", [("09:00", "10:00"), ("10:00", "11:00")]),
                ("MARTES", [("15:00", "17:00")]),
            ),
            format="json",
        )

        assert saved.status_code == status.HTTP_200_OK, saved.content
        body = saved.json()
        assert body["total_slots"] == 3
        assert len(body["days"]) == 7
        assert body["timezone"] == "America/Lima"

        fetched = api.get(schedules_url(prop))
        assert fetched.status_code == status.HTTP_200_OK
        assert fetched.json()["total_slots"] == 3

    @pytest.mark.integration
    def test_replacement_keeps_the_id_of_an_unchanged_slot_and_deactivates_the_rest(
        self, api, authenticate, agent, prop
    ):
        """IT-PROP-176 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Regla de negocio: conserva el id de un slot sin cambios y desactiva los retirados.
        Código HTTP Esperado: 200 OK.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 200 OK y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)
        first = api.put(
            schedules_url(prop),
            make_week(("LUNES", [("09:00", "10:00")])),
            format="json",
        ).json()
        monday = next(day for day in first["days"] if day["weekday"] == "LUNES")
        slot_id = monday["slots"][0]["id"]

        second = api.put(
            schedules_url(prop),
            make_week(
                ("LUNES", [("09:00", "10:00")]),
                ("MARTES", [("11:00", "12:00")]),
            ),
            format="json",
        ).json()
        monday_again = next(day for day in second["days"] if day["weekday"] == "LUNES")
        assert monday_again["slots"][0]["id"] == slot_id

        api.put(
            schedules_url(prop),
            make_week(("MARTES", [("11:00", "12:00")])),
            format="json",
        )
        old_slot = PropertySchedule.objects.get(pk=slot_id)
        assert old_slot.is_active is False

    @pytest.mark.integration
    def test_bad_time_format_returns_400(
        self, api, authenticate, agent, prop, assert_problem
    ):
        """IT-PROP-177 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Error 400: rechaza horarios que no cumplen el formato HH:MM.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.put(
            schedules_url(prop),
            make_week(("LUNES", [("9:00", "10:00")])),
            format="json",
        )

        problem = assert_problem(
            response, "invalid_time_range", status.HTTP_400_BAD_REQUEST
        )
        assert (
            problem["errors"][0]["parameter"]
            == "days[0].slots[0].start_time"
        )

    @pytest.mark.integration
    def test_overlapping_slots_return_schedule_overlap(
        self, api, authenticate, agent, prop, assert_problem
    ):
        """IT-PROP-178 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Error 400: rechaza slots solapados con el código schedule_overlap.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)

        response = api.put(
            schedules_url(prop),
            make_week(("LUNES", [("09:00", "10:30"), ("10:00", "11:00")])),
            format="json",
        )

        assert_problem(response, "schedule_overlap", status.HTTP_400_BAD_REQUEST)

    @pytest.mark.integration
    def test_more_than_six_slots_per_day_returns_400(
        self, api, authenticate, agent, prop, assert_problem
    ):
        """IT-PROP-179 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Error 400: limita la agenda a seis slots por día.
        Código HTTP Esperado: 400 Bad Request.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 400 Bad Request y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(agent)
        slots = [(f"{hour:02d}:00", f"{hour + 1:02d}:00") for hour in range(8, 15)]

        response = api.put(
            schedules_url(prop), make_week(("LUNES", slots)), format="json"
        )

        assert_problem(
            response, "invalid_time_range", status.HTTP_400_BAD_REQUEST
        )

    @pytest.mark.integration
    def test_only_agents_and_admins_can_edit_the_schedule(
        self, api, authenticate, client_user, prop, assert_problem
    ):
        """IT-PROP-180 - Prueba de Integración — PropertyViewSet.schedules.

        Tipo de Prueba: [Prueba de Integración] Endpoint HTTP.
        Módulo y Entidad: Propiedades / PropertyViewSet.schedules.
        Propósito del Escenario: Permisos 403/401: bloquea al CLIENTE y exige autenticación al anónimo.
        Código HTTP Esperado: 403 Forbidden y 401 Unauthorized.
        Requisito: RF-PROP-04
        Resultado Esperado: La respuesta devuelve 403 Forbidden y 401 Unauthorized y el efecto se refleja en el estado o la base de datos.
        """
        authenticate(client_user)
        response = api.put(
            schedules_url(prop),
            make_week(("LUNES", [("09:00", "10:00")])),
            format="json",
        )
        assert_problem(response, "forbidden", status.HTTP_403_FORBIDDEN)

        api.force_authenticate(None)
        response = api.put(
            schedules_url(prop),
            make_week(("LUNES", [("09:00", "10:00")])),
            format="json",
        )
        assert_problem(response, "unauthorized", status.HTTP_401_UNAUTHORIZED)
