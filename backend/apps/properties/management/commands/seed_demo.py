"""Siembra datos de demostración para que el frontend tenga qué mostrar.

Es idempotente: se puede correr varias veces y no duplica filas. Replica la
cartera del modo simulado del frontend (`frontend/src/services/mocks`) para que
la aplicación se vea igual con datos reales o simulados.

    uv run python manage.py seed_demo
"""

from datetime import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.properties.models import (
    District,
    Property,
    PropertySchedule,
    PropertyStatus,
    PropertyType,
    TransactionMode,
    Weekday,
)
from apps.users.models import Role, UserProfile

User = get_user_model()

DEFAULT_PASSWORD = "Housebroker2026."

AGENTS = [
    ("yohan.nato@housebroker.pe", "Yohan Nato", Role.AGENTE),
    ("agente@housebroker.pe", "Agente de Propiedades", Role.AGENTE),
]

ADMINS = [
    ("admin@housebroker.pe", "Administrador HouseBroker", Role.ADMINISTRADOR),
]

DISTRICTS = [
    ("150122", "Miraflores", "Lima"),
    ("150131", "San Isidro", "Lima"),
    ("150140", "Santiago de Surco", "Lima"),
    ("150104", "Barranco", "Lima"),
    ("150114", "La Molina", "Lima"),
    ("150130", "San Borja", "Lima"),
    ("150117", "La Victoria", "Lima"),
    ("150129", "San Miguel", "Lima"),
    ("150108", "Cieneguilla", "Lima"),
    ("150101", "Cercado de Lima", "Lima"),
    ("150103", "Ate", "Lima"),
    ("150119", "Lurín", "Lima"),
    ("150116", "Lince", "Lima"),
    ("150113", "Jesús María", "Lima"),
    ("150107", "Chosica", "Lima"),
    ("150110", "Comas", "Lima"),
    ("150120", "Magdalena del Mar", "Lima"),
    ("150142", "Villa El Salvador", "Lima"),
    ("150141", "Surquillo", "Lima"),
    ("150137", "Punta Hermosa", "Lima"),
    ("150115", "Los Olivos", "Lima"),
]

# (title, price, moneda, mode, address, tipo, distrito, área_total,
#  área_construida, dorm, baños, estac, negociable, destacado, mantenimiento,
#  is_active)
PROPERTIES = [
    ("Departamento amoblado en Miraflores", 150000, "PEN", TransactionMode.VENTA,
     "Av. Larco 456, Miraflores", PropertyType.DEPARTAMENTO, "Miraflores",
     85, 70, 3, 2, 1, True, True, None, True),
    ("Casa de playa en Punta Hermosa", 320000, "PEN", TransactionMode.VENTA,
     "Jr. Los Delfines 120, Punta Hermosa", PropertyType.CASA, "Punta Hermosa",
     180, 150, 4, 3, 2, False, False, 320, True),
    ("Oficina corporativa en San Isidro", 2350, "USD", TransactionMode.ALQUILER,
     "Av. Canaval y Moreyra 320, San Isidro", PropertyType.OFICINA, "San Isidro",
     220, 200, None, None, 4, None, False, None, True),
    ("Terreno agrícola en La Molina Alta", 95000, "PEN", TransactionMode.VENTA,
     "Camino Real km 2, La Molina", PropertyType.TERRENO, "La Molina",
     2500, None, None, None, 0, None, False, None, True),
    ("Departamento duplex en Barranco", 230000, "PEN", TransactionMode.VENTA,
     "Av. Pedro de Osma 210, Barranco", PropertyType.DEPARTAMENTO, "Barranco",
     120, 110, 4, 3, 0, True, False, 185, True),
    ("Casa multifamiliar en Los Olivos", 2020, "PEN", TransactionMode.ALQUILER,
     "Av. Universitaria 1450, Los Olivos", PropertyType.CASA, "Los Olivos",
     320, 280, 5, 4, 2, None, False, None, False),
    ("Local comercial en Gamarra", 410000, "PEN", TransactionMode.VENTA,
     "Av. Aviación 2310, La Victoria", PropertyType.OFICINA, "La Victoria",
     None, None, None, None, 0, None, False, None, True),
    ("Terreno urbano en San Juan de Lurigancho", 78000, "PEN", TransactionMode.VENTA,
     "Calle Los Huertos 350, SJL", PropertyType.TERRENO, "Cercado de Lima",
     None, None, None, None, 0, None, False, None, True),
    ("Penthouse con vista al mar en San Miguel", 560000, "USD", TransactionMode.VENTA,
     "Av. La Marina 890, San Miguel", PropertyType.DEPARTAMENTO, "San Miguel",
     None, None, None, None, 0, None, True, None, True),
    ("Casa campestre en Cieneguilla", 265000, "PEN", TransactionMode.VENTA,
     "Av. Nueva Toledo 45, Cieneguilla", PropertyType.CASA, "Cieneguilla",
     None, None, None, None, 0, None, False, None, True),
    ("Suite de oficina en el Centro de Lima", 3900, "PEN", TransactionMode.ALQUILER,
     "Jr. de la Unión 400, Cercado de Lima", PropertyType.OFICINA, "Cercado de Lima",
     None, None, None, None, 0, None, False, None, False),
    ("Terreno en zona industrial de Ate", 132000, "PEN", TransactionMode.VENTA,
     "Av. Los Pinos 900, Ate", PropertyType.TERRENO, "Ate",
     None, None, None, None, 0, None, False, None, True),
    ("Departamento minimalista en Surco", 205000, "PEN", TransactionMode.VENTA,
     "Av. Benavides 5010, Santiago de Surco", PropertyType.DEPARTAMENTO,
     "Santiago de Surco", None, None, None, None, 0, None, False, None, True),
    ("Casa con jardín en San Borja", 470000, "USD", TransactionMode.VENTA,
     "Av. San Luis 1200, San Borja", PropertyType.CASA, "San Borja",
     None, None, None, None, 0, None, True, None, True),
    ("Oficina de coworking en Miraflores", 4310, "PEN", TransactionMode.ALQUILER,
     "Calle Las Begonias 430, Miraflores", PropertyType.OFICINA, "Miraflores",
     None, None, None, None, 0, None, False, None, True),
    ("Terreno con proyecto en Lurín", 168000, "PEN", TransactionMode.VENTA,
     "Antigua Panamericana Sur km 28, Lurín", PropertyType.TERRENO, "Lurín",
     None, None, None, None, 0, None, False, None, True),
    ("Departamento para estudiante en Lince", 3450, "PEN", TransactionMode.ALQUILER,
     "Av. Petit Thouars 2385, Lince", PropertyType.DEPARTAMENTO, "Lince",
     None, None, None, None, 0, None, False, None, True),
    ("Casa en condominio de Chacarilla", 620000, "USD", TransactionMode.VENTA,
     "Calle Monterrey 380, Surco", PropertyType.CASA, "Santiago de Surco",
     None, None, None, None, 0, None, True, None, False),
    ("Consultorio médico en Jesús María", 2960, "PEN", TransactionMode.ALQUILER,
     "Av. Brasil 1050, Jesús María", PropertyType.OFICINA, "Jesús María",
     None, None, None, None, 0, None, False, None, True),
    ("Terreno en Chosica con vista", 85000, "PEN", TransactionMode.VENTA,
     "Carretera Central km 34, Chosica", PropertyType.TERRENO, "Chosica",
     None, None, None, None, 0, None, False, None, True),
    ("Departamento tipo estudio en Los Olivos", 3160, "PEN", TransactionMode.ALQUILER,
     "Av. Angélica Gamarra 800, Los Olivos", PropertyType.DEPARTAMENTO, "Los Olivos",
     None, None, None, None, 0, None, False, None, True),
    ("Casa de dos pisos en Comas", 240000, "PEN", TransactionMode.VENTA,
     "Av. Túpac Amaru 4390, Comas", PropertyType.CASA, "Comas",
     None, None, None, None, 0, None, False, None, True),
    ("Oficina administrativa en Magdalena", 2520, "PEN", TransactionMode.ALQUILER,
     "Jr. Salaverry 580, Magdalena del Mar", PropertyType.OFICINA, "Magdalena del Mar",
     None, None, None, None, 0, None, False, None, True),
    ("Terreno residencial en Villa El Salvador", 69000, "PEN", TransactionMode.VENTA,
     "Av. Pastor Sevilla 220, VES", PropertyType.TERRENO, "Villa El Salvador",
     None, None, None, None, 0, None, False, None, True),
    ("Departamento con pool en Surquillo", 2190, "PEN", TransactionMode.ALQUILER,
     "Av. Angamos Este 2410, Surquillo", PropertyType.DEPARTAMENTO, "Surquillo",
     None, None, None, None, 0, None, True, None, False),
]

WEEKDAY_SLOTS = {
    Weekday.LUNES: [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))],
    Weekday.MARTES: [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))],
    Weekday.MIERCOLES: [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))],
    Weekday.JUEVES: [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))],
    Weekday.VIERNES: [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))],
    Weekday.SABADO: [(time(9, 0), time(13, 0))],
}


class Command(BaseCommand):
    help = "Siembra usuarios, distritos, propiedades y agendas de demostración."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help="Contraseña de los usuarios de demostración.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]

        admin = self._ensure_user(ADMINS[0], password)
        agents = [self._ensure_user(entry, password) for entry in AGENTS]
        clients = [
            self._ensure_user(
                ("cliente@housebroker.pe", "Cliente Demo", Role.CLIENTE), password
            )
        ]
        agent = agents[0]

        districts = self._ensure_districts()
        created = 0

        for index, row in enumerate(PROPERTIES, start=1):
            (title, price, moneda, mode, address, ptype, district_name, area_total,
             area_built, bedrooms, bathrooms, parking, negotiable, featured,
             maintenance, is_active) = row

            code = f"HB-{index:04d}"
            status = (
                PropertyStatus.DISPONIBLE if is_active else PropertyStatus.SUSPENDIDO
            )

            prop, was_created = Property.objects.get_or_create(
                code=code,
                defaults={
                    "title": title,
                    "price": price,
                    "currency": moneda,
                    "mode": mode,
                    "property_type": ptype,
                    "address": address,
                    "district": districts[district_name],
                    "area_total": area_total,
                    "area_built": area_built,
                    "bedrooms": bedrooms,
                    "bathrooms": bathrooms,
                    "parking_spaces": parking,
                    "is_negotiable": negotiable,
                    "is_featured": featured,
                    "maintenance_fee": maintenance,
                    "is_active": is_active,
                    "status": status,
                    "agent": agent,
                    "created_by": admin,
                },
            )
            if was_created:
                created += 1
                self._ensure_schedules(prop)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed listo: {created} propiedades nuevas "
                f"({Property.objects.count()} en total), "
                f"{District.objects.count()} distritos, "
                f"{User.objects.count()} usuarios."
            )
        )
        emails = [entry[0] for entry in ADMINS + AGENTS] + [u.email for u in clients]
        self.stdout.write(
            f"Credenciales demo (contraseña '{password}'): " + ", ".join(emails)
        )

    def _ensure_user(self, entry, password):
        email, full_name, role = entry
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": full_name[:150],
                "is_staff": role == Role.ADMINISTRADOR,
                "is_superuser": role == Role.ADMINISTRADOR,
            },
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
        profile = getattr(user, "profile", None)
        if profile is None:
            UserProfile.objects.create(user=user, full_name=full_name, role=role)
        else:
            profile.full_name = full_name
            profile.role = role
            profile.save(update_fields=["full_name", "role"])
        return user

    def _ensure_districts(self):
        result = {}
        for ubigeo, name, province in DISTRICTS:
            district, _ = District.objects.update_or_create(
                ubigeo=ubigeo,
                defaults={"name": name, "province": province, "department": "Lima"},
            )
            result[name] = district
        return result

    def _ensure_schedules(self, prop):
        for weekday, slots in WEEKDAY_SLOTS.items():
            for start, end in slots:
                PropertySchedule.objects.get_or_create(
                    property=prop,
                    weekday=weekday,
                    start_time=start,
                    defaults={"end_time": end},
                )
