// =============================================================
// Pruebas del cliente HTTP de agendamiento de visitas
// TASK-TEST-CRM-01: disponibilidad, reserva y formato de horarios
// =============================================================
//
// Los endpoints se simulan con `axios-mock-adapter` sobre la instancia real
// de Axios, de modo que las pruebas también atraviesan el interceptor que
// normaliza los errores de la API en `userMessage`.

import MockAdapter from 'axios-mock-adapter'
import api from './axios'
import { createAppointment, formatSlotTime, getAvailableSlots } from './appointments'

const PROPERTY_ID = 'b2c1f5a0-1a2b-4c3d-9e0f-111111111111'
const AVAILABLE_SLOTS_PATH = `/v1/properties/${PROPERTY_ID}/available-slots`
const APPOINTMENTS_PATH = '/v1/appointments'

const availability = {
  property_id: PROPERTY_ID,
  date: '2026-12-10',
  timezone: 'America/Lima',
  total_slots: 2,
  slots: [
    { start_at: '2026-12-10T14:00:00Z', end_at: '2026-12-10T15:00:00Z', duration_minutes: 60 },
    { start_at: '2026-12-10T16:00:00Z', end_at: '2026-12-10T17:00:00Z', duration_minutes: 60 },
  ],
}

const appointment = {
  id: 'a9c1d2e3-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
  status: 'PENDING',
  scheduled_at: '2026-12-10T14:00:00Z',
  duration_minutes: 60,
  reason: null,
  property: {
    id: PROPERTY_ID,
    title: 'Departamento en Miraflores',
    district: 'Miraflores',
    address: 'Av. Larco 123',
  },
  client: { id: 'cliente-1', full_name: 'Cliente de Pruebas', email: 'cliente@test.pe', phone: null },
  agent: { id: 'agente-1', full_name: 'Agente de Pruebas', email: 'agente@test.pe', phone: null },
  created_at: '2026-12-01T10:00:00Z',
  updated_at: '2026-12-01T10:00:00Z',
}

describe('services/appointments', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('getAvailableSlots', () => {
    it('consulta la disponibilidad con la fecha como query param', async () => {
      let sentParams
      mock.onGet(AVAILABLE_SLOTS_PATH).reply((config) => {
        sentParams = config.params
        return [200, availability]
      })

      await expect(getAvailableSlots(PROPERTY_ID, '2026-12-10')).resolves.toEqual(availability)
      expect(sentParams).toEqual({ date: '2026-12-10' })
    })

    it('propaga el mensaje del servidor cuando la propiedad no existe', async () => {
      mock.onGet(AVAILABLE_SLOTS_PATH).reply(404, {
        detail: 'La propiedad solicitada no existe.',
      })

      await expect(getAvailableSlots(PROPERTY_ID, '2026-12-10')).rejects.toMatchObject({
        status: 404,
        userMessage: 'La propiedad solicitada no existe.',
      })
    })
  })

  describe('createAppointment', () => {
    it('envía únicamente la propiedad y el horario elegido', async () => {
      let sentBody
      mock.onPost(APPOINTMENTS_PATH).reply((config) => {
        sentBody = JSON.parse(config.data)
        return [201, appointment]
      })

      await expect(
        createAppointment({ property_id: PROPERTY_ID, scheduled_at: '2026-12-10T14:00:00Z' }),
      ).resolves.toEqual(appointment)

      expect(sentBody).toEqual({
        property_id: PROPERTY_ID,
        scheduled_at: '2026-12-10T14:00:00Z',
      })
    })

    it('normaliza el 409 de una franja ocupada para mostrarlo en la UI', async () => {
      mock.onPost(APPOINTMENTS_PATH).reply(409, {
        detail: 'El horario seleccionado ya fue reservado por otro cliente.',
      })

      await expect(
        createAppointment({ property_id: PROPERTY_ID, scheduled_at: '2026-12-10T14:00:00Z' }),
      ).rejects.toMatchObject({
        status: 409,
        userMessage: 'El horario seleccionado ya fue reservado por otro cliente.',
      })
    })
  })

  describe('formatSlotTime', () => {
    it('convierte un instante UTC a la hora local de Lima', () => {
      expect(formatSlotTime('2026-12-10T14:00:00Z')).toBe('09:00 AM')
      expect(formatSlotTime('2026-12-10T21:00:00Z')).toBe('04:00 PM')
    })

    it('respeta la zona horaria indicada', () => {
      expect(formatSlotTime('2026-12-10T14:00:00Z', 'UTC')).toBe('02:00 PM')
    })

    it('reutiliza el formateador de cada zona horaria', () => {
      const timeZone = 'America/Argentina/Cordoba'
      const spy = jest.spyOn(Intl, 'DateTimeFormat')

      try {
        formatSlotTime('2026-12-10T14:00:00Z', timeZone)
        formatSlotTime('2026-12-10T15:00:00Z', timeZone)

        const createdForZone = spy.mock.calls.filter(
          ([, options]) => options?.timeZone === timeZone,
        )
        expect(createdForZone).toHaveLength(1)
      } finally {
        spy.mockRestore()
      }
    })
  })
})
