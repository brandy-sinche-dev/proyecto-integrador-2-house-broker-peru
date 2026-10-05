// =============================================================
// Pruebas de la capa de disponibilidad de propiedades (RF-PROP-04)
// TASK-FRONT-PROP-04: contrato HTTP + reglas de estado y franjas
// =============================================================
//
// Se ejercitan dos cosas distintas del mismo módulo: las llamadas a la API
// (con `axios-mock-adapter` sobre la instancia real, de modo que también
// pasa por el interceptor de errores) y las reglas puras que evitan el viaje
// de ida y vuelta cuando el dato ya es incorrecto en el formulario.

import MockAdapter from 'axios-mock-adapter'
import api from './axios'
import {
  MAX_SLOTS_PER_DAY,
  allowedTransitions,
  canTransition,
  dayIssues,
  draftFromSchedules,
  draftSlotCount,
  emptyDraft,
  getPropertySchedules,
  isTerminalStatus,
  replacePropertySchedules,
  slotIssue,
  statusRequiresReason,
  toSchedulesInput,
  updatePropertyStatus,
  validateScheduleDays,
  validateStatusChange,
} from './availability'

const PROPERTY_ID = 'b2c1f5a0-1a2b-4c3d-9e0f-111111111111'
const STATUS_PATH = `/v1/properties/${PROPERTY_ID}/status`
const SCHEDULES_PATH = `/v1/properties/${PROPERTY_ID}/schedules`

const statusResult = {
  id: PROPERTY_ID,
  status: 'RESERVADO',
  previous_status: 'DISPONIBLE',
  is_active: true,
  reason: 'El propietario inicio tramite de reserva con seña.',
  changed_by: '7c4a9d21-3b6e-4f80-9a2d-5e7c1b3f8d40',
  changed_at: '2026-09-30T14:20:00Z',
}

const schedulesResponse = {
  property_id: PROPERTY_ID,
  timezone: 'America/Lima',
  total_slots: 2,
  days: [
    { weekday: 'LUNES', slots: [{ id: 'slot-1', start_time: '09:00', end_time: '12:00', is_active: true }] },
    { weekday: 'MARTES', slots: [] },
    { weekday: 'MIERCOLES', slots: [] },
    { weekday: 'JUEVES', slots: [] },
    { weekday: 'VIERNES', slots: [] },
    { weekday: 'SABADO', slots: [{ id: 'slot-2', start_time: '10:00', end_time: '13:00', is_active: true }] },
    { weekday: 'DOMINGO', slots: [] },
  ],
}

const week = (days) => days.map(([weekday, ...slots]) => ({ weekday, slots: slots.map(([start_time, end_time]) => ({ start_time, end_time })) }))

describe('services/availability', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('updatePropertyStatus (PATCH .../status)', () => {
    it('envía el estado y el motivo, y devuelve el estado anterior', async () => {
      let sent
      mock.onPatch(STATUS_PATH).reply((config) => {
        sent = JSON.parse(config.data)
        return [200, statusResult]
      })

      await expect(
        updatePropertyStatus(PROPERTY_ID, { status: 'RESERVADO', reason: 'El propietario inicio tramite de reserva con seña.' }),
      ).resolves.toEqual(statusResult)

      expect(sent).toEqual({ status: 'RESERVADO', reason: 'El propietario inicio tramite de reserva con seña.' })
    })

    it('omite el motivo cuando el estado no lo exige', async () => {
      let sent
      mock.onPatch(STATUS_PATH).reply((config) => {
        sent = JSON.parse(config.data)
        return [200, { ...statusResult, status: 'DISPONIBLE', previous_status: 'SUSPENDIDO', reason: null }]
      })

      await updatePropertyStatus(PROPERTY_ID, { status: 'DISPONIBLE', reason: undefined })

      expect('reason' in sent).toBe(false)
    })

    it('rechaza la promesa con el mensaje del servidor ante un 409', async () => {
      mock.onPatch(STATUS_PATH).reply(409, {
        detail: 'No se puede suspender el inmueble porque tiene 2 visitas confirmadas.',
      })

      await expect(updatePropertyStatus(PROPERTY_ID, { status: 'SUSPENDIDO' })).rejects.toMatchObject({
        status: 409,
        userMessage: 'No se puede suspender el inmueble porque tiene 2 visitas confirmadas.',
      })
    })
  })

  describe('getPropertySchedules (GET .../schedules)', () => {
    it('devuelve los siete días con el total de franjas', async () => {
      mock.onGet(SCHEDULES_PATH).reply(200, schedulesResponse)

      await expect(getPropertySchedules(PROPERTY_ID)).resolves.toEqual(schedulesResponse)
    })
  })

  describe('replacePropertySchedules (PUT .../schedules)', () => {
    it('envía únicamente los días con franjas', async () => {
      let sent
      mock.onPut(SCHEDULES_PATH).reply((config) => {
        sent = JSON.parse(config.data)
        return [200, schedulesResponse]
      })

      await replacePropertySchedules(PROPERTY_ID, {
        days: [{ weekday: 'LUNES', slots: [{ start_time: '09:00', end_time: '12:00' }] }],
      })

      expect(sent).toEqual({ days: [{ weekday: 'LUNES', slots: [{ start_time: '09:00', end_time: '12:00' }] }] })
    })

    it('propaga el detalle de una franja solapada', async () => {
      mock.onPut(SCHEDULES_PATH).reply(400, { detail: 'Las franjas 09:00-12:00 y 11:00-13:00 se solapan.' })

      await expect(replacePropertySchedules(PROPERTY_ID, { days: [] })).rejects.toMatchObject({
        status: 400,
        userMessage: 'Las franjas 09:00-12:00 y 11:00-13:00 se solapan.',
      })
    })
  })

  describe('transiciones de estado', () => {
    it('permite volver a DISPONIBLE desde RESERVADO y SUSPENDIDO', () => {
      expect(canTransition('RESERVADO', 'DISPONIBLE')).toBe(true)
      expect(canTransition('SUSPENDIDO', 'DISPONIBLE')).toBe(true)
    })

    it('trata ALQUILADO y VENDIDO como estados terminales', () => {
      expect(isTerminalStatus('VENDIDO')).toBe(true)
      expect(isTerminalStatus('ALQUILADO')).toBe(true)
      expect(isTerminalStatus('DISPONIBLE')).toBe(false)
      expect(canTransition('VENDIDO', 'DISPONIBLE')).toBe(false)
      expect(allowedTransitions('VENDIDO')).toEqual(['SUSPENDIDO'])
    })

    it('exige motivo para las decisiones auditables y no para volver a DISPONIBLE', () => {
      expect(statusRequiresReason('RESERVADO')).toBe(true)
      expect(statusRequiresReason('SUSPENDIDO')).toBe(true)
      expect(statusRequiresReason('ALQUILADO')).toBe(true)
      expect(statusRequiresReason('VENDIDO')).toBe(true)
      expect(statusRequiresReason('DISPONIBLE')).toBe(false)
    })

    it('rechaza una transición que el servidor no admite y lo explica', () => {
      expect(validateStatusChange('DISPONIBLE', 'VENDIDO')).toEqual([
        { field: 'status', message: 'No se puede pasar de Disponible a Vendido.' },
      ])
    })

    it('menciona el estado terminal en el mensaje de un estado no reversible', () => {
      const [issue] = validateStatusChange('ALQUILADO', 'RESERVADO')
      expect(issue.message).toMatch(/Alquilado es un estado terminal/)
    })

    it('pide un motivo de al menos 5 caracteres al reservar', () => {
      expect(validateStatusChange('DISPONIBLE', 'RESERVADO')).toEqual([
        { field: 'reason', message: 'Describe el motivo del cambio a Reservado (mínimo 5 caracteres).' },
      ])
      expect(validateStatusChange('DISPONIBLE', 'RESERVADO', 'Ya').map((i) => i.field)).toEqual(['reason'])
      expect(validateStatusChange('DISPONIBLE', 'RESERVADO', 'Reserva con seña')).toEqual([])
    })

    it('acepta volver a DISPONIBLE sin motivo y limita el largo del opcional', () => {
      expect(validateStatusChange('SUSPENDIDO', 'DISPONIBLE')).toEqual([])
      const [issue] = validateStatusChange('SUSPENDIDO', 'DISPONIBLE', 'x'.repeat(501))
      expect(issue).toEqual({ field: 'reason', message: 'El motivo no puede superar los 500 caracteres.' })
    })
  })

  describe('validateScheduleDays', () => {
    it('acepta una semana bien formada', () => {
      const days = week([
        ['LUNES', ['09:00', '12:00'], ['14:00', '18:00']],
        ['SABADO', ['10:00', '13:00']],
      ])
      expect(validateScheduleDays(days)).toEqual([])
    })

    it('rechaza horas fuera del patrón HH:MM', () => {
      const [issue] = validateScheduleDays(week([['LUNES', ['9:00', '12:00']]]))
      expect(issue).toEqual({
        day: 'LUNES',
        slotIndex: 0,
        field: 'start_time',
        message: 'La hora de inicio debe tener el formato HH:MM en 24 horas.',
      })
    })

    it('rechaza una hora de fin anterior a la de inicio', () => {
      const [issue] = validateScheduleDays(week([['LUNES', ['18:00', '12:00']]]))
      expect(issue.field).toBe('end_time')
      expect(issue.message).toBe('La hora de inicio 18:00 debe ser anterior a la de fin 12:00.')
    })

    it('exige una duración mínima de 30 minutos y máxima de 8 horas', () => {
      const [corta] = validateScheduleDays(week([['LUNES', ['09:00', '09:15']]]))
      expect(corta.message).toBe('La franja dura 15 minutos y el mínimo es 30.')

      const [larga] = validateScheduleDays(week([['LUNES', ['09:00', '18:00']]]))
      expect(larga.message).toBe('La franja dura 540 minutos y el máximo es 480.')
    })

    it('detecta el solapamiento pero acepta las franjas contiguas', () => {
      const [solapada] = validateScheduleDays(
        week([['LUNES', ['09:00', '12:00'], ['11:00', '13:00']]]),
      )
      expect(solapada).toEqual({
        day: 'LUNES',
        slotIndex: 1,
        field: 'start_time',
        message: 'Se solapa con la franja 09:00–12:00.',
      })

      expect(validateScheduleDays(week([['LUNES', ['09:00', '12:00'], ['12:00', '15:00']]]))).toEqual([])
    })

    it('detecta el solapamiento aunque las franjas vengan desordenadas', () => {
      const issues = validateScheduleDays(
        week([['MIERCOLES', ['15:00', '18:00'], ['10:00', '13:00'], ['12:00', '16:00']]]),
      )
      // Ordenadas por inicio quedan 10:00-13:00, 12:00-16:00 y 15:00-18:00, así
      // que las dos últimas chocan: cada franja culpable se reporta una vez.
      expect(issues.map((issue) => issue.slotIndex)).toEqual([2, 0])
      expect(issues[0].message).toBe('Se solapa con la franja 10:00–13:00.')
      expect(issues[1].message).toBe('Se solapa con la franja 12:00–16:00.')
    })

    it('rechaza un día repetido', () => {
      const [issue] = validateScheduleDays(week([['LUNES', ['09:00', '12:00']], ['LUNES', ['14:00', '18:00']]]))
      expect(issue).toEqual({
        day: 'LUNES',
        slotIndex: null,
        field: 'days',
        message: 'Lunes está duplicado: agrupa sus franjas en una sola entrada.',
      })
    })

    it('rechaza un día sin franjas, más de 6 franjas y más de 28 en la semana', () => {
      const [vacio] = validateScheduleDays([{ weekday: 'MARTES', slots: [] }])
      expect(vacio.message).toBe('Declara al menos una franja de Martes o quita el día de la semana.')

      const many = Array.from({ length: MAX_SLOTS_PER_DAY + 1 }, (_, i) => [
        `${String(6 + i).padStart(2, '0')}:00`,
        `${String(6 + i).padStart(2, '0')}:30`,
      ])
      const [tope] = validateScheduleDays(week([['LUNES', ...many]]))
      expect(tope.message).toBe(`Lunes tiene ${MAX_SLOTS_PER_DAY + 1} franjas y el máximo es ${MAX_SLOTS_PER_DAY}.`)

      // 4 días x 7 franjas más 1 del viernes = 29, por encima del tope.
      const full = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES']
      const seven = Array.from({ length: 7 }, (_, i) => [
        `${String(6 + i * 2).padStart(2, '0')}:00`,
        `${String(6 + i * 2).padStart(2, '0')}:30`,
      ])
      const issues = validateScheduleDays(
        week([...full.map((d) => [d, ...seven]), ['VIERNES', ...seven.slice(0, 1)]]),
      )
      // El tope semanal se informa después de los avisos por día, así que se
      // localiza por `day === null` en lugar de por posición.
      const semana = issues.find((issue) => issue.day === null)
      expect(semana.field).toBe('days')
      expect(semana.message).toMatch(/La semana tiene 29 franjas y el máximo es 28\./)
    })
  })

  describe('lectura de incidencias', () => {
    const issues = validateScheduleDays(week([['LUNES', ['09:00', '12:00'], ['11:00', '13:00']], ['SABADO', ['10:00', '13:00']]]))

    it('devuelve el primer problema de una franja', () => {
      expect(slotIssue(issues, 'LUNES', 1)).toBe('Se solapa con la franja 09:00–12:00.')
      expect(slotIssue(issues, 'LUNES', 0)).toBeUndefined()
    })

    it('devuelve los problemas que pertenecen al día, no a una franja', () => {
      expect(dayIssues(issues, 'LUNES')).toEqual([])
      expect(dayIssues(validateScheduleDays([{ weekday: 'MARTES', slots: [] }]), 'MARTES')).toHaveLength(1)
    })
  })

  describe('borrador de la semana', () => {
    it('parte de una semana vacía', () => {
      const draft = emptyDraft()
      expect(draftSlotCount(draft)).toBe(0)
      expect(draft.DOMINGO).toEqual([])
      expect(Object.keys(draft)).toHaveLength(7)
    })

    it('lleva la respuesta del GET al borrador y descarta las franjas inactivas', () => {
      const draft = draftFromSchedules({
        ...schedulesResponse,
        days: [
          {
            weekday: 'LUNES',
            slots: [
              { id: 'a', start_time: '09:00', end_time: '12:00', is_active: true },
              { id: 'b', start_time: '15:00', end_time: '17:00', is_active: false },
            ],
          },
          { weekday: 'MARTES', slots: [] },
          { weekday: 'MIERCOLES', slots: [] },
          { weekday: 'JUEVES', slots: [] },
          { weekday: 'VIERNES', slots: [] },
          { weekday: 'SABADO', slots: [] },
          { weekday: 'DOMINGO', slots: [] },
        ],
      })

      expect(draft.LUNES).toEqual([{ start_time: '09:00', end_time: '12:00' }])
      expect(draftSlotCount(draft)).toBe(1)
    })

    it('devuelve una semana vacía cuando no hay respuesta', () => {
      expect(draftSlotCount(draftFromSchedules(null))).toBe(0)
    })

    it('omite del cuerpo los días sin franjas y los ordena de lunes a domingo', () => {
      const draft = draftFromSchedules(null)
      draft.SABADO = [{ start_time: '10:00', end_time: '13:00' }]
      draft.LUNES = [{ start_time: '09:00', end_time: '12:00' }]

      expect(toSchedulesInput(draft)).toEqual([
        { weekday: 'LUNES', slots: [{ start_time: '09:00', end_time: '12:00' }] },
        { weekday: 'SABADO', slots: [{ start_time: '10:00', end_time: '13:00' }] },
      ])
    })
  })
})