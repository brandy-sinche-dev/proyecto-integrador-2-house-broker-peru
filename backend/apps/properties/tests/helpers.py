"""Factories mínimas compartidas por los tests de `apps.properties`.

No es una factoría de propósito general: solo lo que la suite necesita para no
repetir el mismo `objects.create` de cinco líneas en cada caso.
"""

from django.contrib.auth import get_user_model

from apps.properties.models import District, Property, PropertyImage, PropertyStatus

User = get_user_model()


def make_district(ubigeo="150131", name="Miraflores"):
    return District.objects.create(ubigeo=ubigeo, name=name, province="Lima")


def make_user(username, role=None, staff=False, superuser=False):
    """Usuario de pruebas con el rol del JWT ya inyectado en la instancia.

    `django.contrib.auth.User` todavía no tiene columna `role`: el usuario
    propio de `docs/database/migrations-and-seeding.md` §3 llega más adelante.
    Hasta entonces los tests la fijan en la instancia, que es exactamente lo
    que lee `permissions._role_of()`, así que el día que exista la columna estos
    helpers pasan a `create_user(role=...)` sin tocar las pruebas.
    """
    user = User.objects.create_user(
        username=username, email=f"{username}@housebroker.pe", password="secret123"
    )
    if role:
        user.role = role
    if staff or superuser:
        user.is_staff = staff or superuser
        user.is_superuser = superuser
        user.save(update_fields=["is_staff", "is_superuser"])
    return user


def make_property(
    district,
    agent=None,
    index=1,
    status=PropertyStatus.DISPONIBLE,
    images=0,
    **overrides,
):
    """Inmueble con lo mínimo que exige el modelo.

    `is_active` se deriva del estado salvo que se pase explícitamente, porque la
    regla de cascada (`SUSPENDIDO` ⇒ `is_active=False`) la impone un `CHECK` de
    la base y un test que se saltara el servicio no podría crear un suspendido
    activo.
    """
    is_active = overrides.pop("is_active", status != PropertyStatus.SUSPENDIDO)
    prop = Property.objects.create(
        code=overrides.pop("code", f"PROP-{index:05d}"),
        title=overrides.pop("title", f"Propiedad {index}"),
        price=overrides.pop("price", 100000),
        currency=overrides.pop("currency", "PEN"),
        mode=overrides.pop("mode", "VENTA"),
        property_type=overrides.pop("property_type", "DEPARTAMENTO"),
        status=status,
        agent=agent,
        district=district,
        address=overrides.pop("address", f"Av. Siempre Viva {index}"),
        is_active=is_active,
        **overrides,
    )
    for order in range(images):
        PropertyImage.objects.create(
            property=prop,
            storage_key=f"propiedades/{index}/{order}.jpg",
            sort_order=order,
            is_cover=order == 0,
        )
    return prop


def make_week(*days):
    """Cuerpo de `PUT .../schedules` a partir de pares `(día, franjas)`."""
    return {
        "days": [
            {
                "weekday": weekday,
                "slots": [
                    {"start_time": start, "end_time": end} for start, end in slots
                ],
            }
            for weekday, slots in days
        ]
    }