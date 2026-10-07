import type { AxiosHeaders, AxiosRequestConfig } from 'axios'
import {
  allowedTransitions,
  canTransition,
  REASON_MIN_LENGTH,
  statusRequiresReason,
  validateScheduleDays,
} from '../availability'
import {
  PROPERTY_STATUSES,
  WEEKDAYS,
  type PropertySchedules,
  type PropertySchedulesInput,
  type PropertyStatus,
  type PropertyStatusInput,
  type PropertyStatusResult,
  type ScheduleSlot,
  type Weekday,
} from '../types'
import { findProperty, managementAccessError, patchPropertyStatus } from './properties'
import { readSessionUser } from '../session'

type Config = AxiosRequestConfig

type Reply =
  | [number, PropertyStatusResult | PropertySchedules]
  | [number, { message: string; errors?: string[] }]

/**
 * Agenda inicial de la cartera simulada. Solo algunos días tienen franjas, para
 * poder demostrar el panel tanto con datos como sin ellos.
 */
const INITIAL_DAYS: Partial<Record<Weekday, [string, string][]>> = {
  LUNES: [
    ['09:00', '12:00'],
    ['14:00', '18:00'],
  ],
  MIERCOLES: [['10:00', '13:00']],
  SABADO: [['10:00', '13:00']],
}

let scheduleStore = new Map<string, PropertySchedules>()

const buildSchedules = (propertyId: string): PropertySchedules => {
  const days = WEEKDAYS.map((weekday) => ({
    weekday,
    slots: (INITIAL_DAYS[weekday] ?? []).map(([start_time, end_time]): ScheduleSlot => ({
      id: crypto.randomUUID(),
      start_time,
      end_time,
      is_active: true,
    })),
  }))
  return {
    property_id: propertyId,
    timezone: 'America/Lima',
    total_slots: days.reduce((total, day) => total + day.slots.length, 0),
    days,
  }
}

const getHeaders = (config: Config): Record<string, string> => {
  const headers = config.headers as unknown as AxiosHeaders | undefined
  if (headers?.toJSON) return headers.toJSON() as Record<string, string>
  return {}
}

const getBody = <T,>(config: Config): T | null => {
  if (!config.data) return null
  try {
    return JSON.parse(config.data) as T
  } catch {
    return null
  }
}

const isForceError = (header?: string | number | string[]) =>
  /^[45]\d{2}$/.test(String(header ?? ''))

const replyError = (status: number, message: string, errors?: string[]): Reply => [
  status,
  { message, errors },
]

const notFound = (id: string): Reply => replyError(404, `Propiedad con id "${id}" no encontrada.`)

/** Estado vigente en el almacén, para no tener que llevar un segundo registro. */
const statusOf = (id: string): PropertyStatus => findProperty(id)?.status ?? 'DISPONIBLE'

export const patchPropertyStatusInMock = (config: Config, id: string): Reply => {
  const denied = managementAccessError(id)
  if (denied) return denied
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  if (!findProperty(id)) return notFound(id)

  const body = getBody<PropertyStatusInput>(config)
  if (!body || !PROPERTY_STATUSES.includes(body.status)) {
    return replyError(400, `El campo 'status' admite los valores ${PROPERTY_STATUSES.join(', ')}.`)
  }

  const previousStatus = statusOf(id)
  if (!canTransition(previousStatus, body.status)) {
    return replyError(
      400,
      `No se puede pasar de '${previousStatus}' a '${body.status}'.`,
      allowedTransitions(previousStatus).map((status) => `Solo se admite '${status}'.`),
    )
  }

  const reason = body.reason?.trim() ?? ''
  if (statusRequiresReason(body.status) && reason.length < REASON_MIN_LENGTH) {
    return replyError(400, 'El campo \'reason\' es obligatorio para esta transición.')
  }

  patchPropertyStatus(id, body.status)

  const result: PropertyStatusResult = {
    id,
    status: body.status,
    previous_status: previousStatus,
    is_active: body.status !== 'SUSPENDIDO',
    reason: reason === '' ? null : reason,
    changed_by: readSessionUser()!.id,
    changed_at: new Date().toISOString(),
  }
  return [200, result]
}

export const getPropertySchedulesInMock = (config: Config, id: string): Reply => {
  const denied = managementAccessError(id)
  if (denied) return denied
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  if (!findProperty(id)) return notFound(id)

  const existing = scheduleStore.get(id)
  if (existing) return [200, existing]

  const created = buildSchedules(id)
  scheduleStore.set(id, created)
  return [200, created]
}

export const replacePropertySchedulesInMock = (config: Config, id: string): Reply => {
  const denied = managementAccessError(id)
  if (denied) return denied
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  if (!findProperty(id)) return notFound(id)

  const body = getBody<PropertySchedulesInput>(config)
  if (!body || !Array.isArray(body.days)) {
    return replyError(400, 'El cuerpo debe incluir el array \'days\'.')
  }

  const issues = validateScheduleDays(body.days)
  if (issues.length > 0) {
    const messages = issues.map((issue) => issue.message)
    return replyError(400, messages[0], messages)
  }

  const previous = scheduleStore.get(id)
  const replaced: PropertySchedules = {
    property_id: id,
    timezone: 'America/Lima',
    total_slots: body.days.reduce((total, day) => total + day.slots.length, 0),
    days: WEEKDAYS.map((weekday) => {
      const incoming = body.days.find((day) => day.weekday === weekday)
      const previousSlots = previous?.days.find((day) => day.weekday === weekday)?.slots ?? []
      return {
        weekday,
        // El `id` de una franja es estable entre reemplazos: se reutiliza el de
        // la franja anterior que empieza a la misma hora, para no romper las
        // citas que ya la referencian.
        slots: (incoming?.slots ?? []).map((slot) => {
          const reused = previousSlots.find((previousSlot) => previousSlot.start_time === slot.start_time)
          return {
            id: reused?.id ?? crypto.randomUUID(),
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_active: true,
          }
        }),
      }
    }),
  }

  scheduleStore.set(id, replaced)
  return [200, replaced]
}

export const resetAvailabilityStore = () => {
  scheduleStore = new Map<string, PropertySchedules>()
}
