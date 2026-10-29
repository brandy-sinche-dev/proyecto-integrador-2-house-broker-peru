// =============================================================
// Capa de agendamiento de visitas (RF-CRM-01)
// TASK-TEST-CRM-01: cliente HTTP de disponibilidad y reserva
// =============================================================
//
// `GET .../available-slots` es público y devuelve solo las horas libres; el
// `start_at` de cada una es exactamente el `scheduled_at` que espera el
// `POST /appointments`. No se recalcula ni se ajusta la hora en el cliente:
// si la franja se ocupó entre la consulta y el envío, el servidor responde
// `409` y el modal lo muestra como error de reserva.

import api from './axios'
import type { Appointment, AppointmentCreateInput, AvailableSlots } from './types'

const resource = (id: string) => `/v1/properties/${id}`

export const getAvailableSlots = (propertyId: string, date: string) =>
  api
    .get<AvailableSlots>(`${resource(propertyId)}/available-slots`, { params: { date } })
    .then((response) => response.data)

export const createAppointment = (input: AppointmentCreateInput) =>
  api.post<Appointment>('/v1/appointments', input).then((response) => response.data)

const slotTimeFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  })

/**
 * `'2026-12-10T14:00:00Z'` -> `'09:00 AM'` en la zona del inmueble. Se usa el
 * mismo formato de 12 horas que ya mostraba el selector de horarios.
 */
export const formatSlotTime = (iso: string, timeZone = 'America/Lima'): string =>
  slotTimeFormatter(timeZone).format(new Date(iso))
