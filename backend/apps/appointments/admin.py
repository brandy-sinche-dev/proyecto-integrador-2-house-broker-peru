from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "scheduled_at",
        "duration_minutes",
        "status",
        "property",
        "client",
        "agent",
        "source",
        "created_at",
    )
    list_filter = ("status", "source")
    search_fields = ("property__title", "client__username", "agent__username")
    raw_id_fields = ("property", "client", "agent", "schedule_slot", "rescheduled_from")
    # La agenda la escribe el servicio con sus reglas de solapamiento: desde
    # el admin una cita directa saltaría la validación de `services`.
    readonly_fields = ("end_at", "created_at", "updated_at")
