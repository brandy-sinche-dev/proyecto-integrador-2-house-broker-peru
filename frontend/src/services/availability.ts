// =============================================================
// Capa de disponibilidad de propiedades (RF-PROP-04)
// TASK-FRONT-PROP-04: cliente HTTP de estados y franjas + reglas
// de negocio espejadas del contrato (openapi_spec.yaml v1.3.0)
// =============================================================
//
// Aquí viven dos cosas que no conviene separar:
//
//   1. Las llamadas HTTP de los endpoints del tag `Disponibilidad`.
//   2. Las reglas de transición de estado y validación de franjas.
//
// Las reglas se replican en el cliente a propósito: el backend sigue siendo
// la autoridad y responde `400`/`409` si algo se cuela, pero validar antes
// de enviar evita el viaje de ida y vuelta para un error que el usuario ya
// puede corregir sin salir del formulario.

import api from './axios'
import {
  PROPERTY_STATUS_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type PropertySchedules,
  type PropertySchedulesInput,
  type PropertyStatus,
  type PropertyStatusInput,
  type PropertyStatusResult,
  type TimeSlotInput,
  type Weekday,
  type WeekdayScheduleInput,
} from './types'

const resource = (id: string) => `/v1/properties/${id}`

export const updatePropertyStatus = (id: string, input: PropertyStatusInput) =>
  api.patch<PropertyStatusResult>(`${resource(id)}/status`, input).then((r) => r.data)

export const getPropertySchedules = (id: string) =>
  api.get<PropertySchedules>(`${resource(id)}/schedules`).then((r) => r.data)

export const replacePropertySchedules = (id: string, input: PropertySchedulesInput) =>
  api.put<PropertySchedules>(`${resource(id)}/schedules`, input).then((r) => r.data)

// -------------------------------------------------------------
// Reglas de transición de estado
// -------------------------------------------------------------

/**
 * Destinos permitidos desde cada estado. `VENDIDO` y `ALQUILADO` son
 * terminales: solo se sale de ellos hacia `SUSPENDIDO`.
 */
const STATUS_TRANSITIONS: Record<PropertyStatus, readonly PropertyStatus[]> = {
  DISPONIBLE: ['RESERVADO', 'SUSPENDIDO'],
  RESERVADO: ['DISPONIBLE', 'ALQUILADO', 'SUSPENDIDO'],
  ALQUILADO: ['SUSPENDIDO'],
  VENDIDO: ['SUSPENDIDO'],
  SUSPENDIDO: ['DISPONIBLE'],
}

/** Estados en los que no se puede volver a un estado operativo anterior. */
const TERMINAL_STATUSES: readonly PropertyStatus[] = ['ALQUILADO', 'VENDIDO']

/** Estados que son decisiones comerciales y exigen motivo para auditarse. */
const REASON_REQUIRED_STATUSES: readonly PropertyStatus[] = [
  'RESERVADO',
  'ALQUILADO',
  'VENDIDO',
  'SUSPENDIDO',
]

export const REASON_MIN_LENGTH = 5
export const REASON_MAX_LENGTH = 500

export const SLOT_MIN_MINUTES = 30
export const SLOT_MAX_MINUTES = 8 * 60
export const MAX_SLOTS_PER_DAY = 6
export const MAX_SLOTS_PER_WEEK = 28

export const allowedTransitions = (from: PropertyStatus): readonly PropertyStatus[] =>
  STATUS_TRANSITIONS[from]

export const canTransition = (from: PropertyStatus, to: PropertyStatus): boolean =>
  STATUS_TRANSITIONS[from].includes(to)

export const isTerminalStatus = (status: PropertyStatus): boolean =>
  TERMINAL_STATUSES.includes(status)

export const statusRequiresReason = (status: PropertyStatus): boolean =>
  REASON_REQUIRED_STATUSES.includes(status)

export interface StatusChangeIssue {
  field: 'status' | 'reason'
  message: string
}

/**
 * Motivo por el que una transición no puede aplicarse, pensado para mostrarse
 * tal cual bajo el control que falló. Devuelve `[]` cuando el cambio es válido.
 */
export function validateStatusChange(
  from: PropertyStatus,
  to: PropertyStatus,
  reason = '',
): StatusChangeIssue[] {
  const issues: StatusChangeIssue[] = []

  if (!canTransition(from, to)) {
    issues.push({
      field: 'status',
      message: isTerminalStatus(from)
        ? `${PROPERTY_STATUS_LABELS[from]} es un estado terminal: solo admite pasar a ${PROPERTY_STATUS_LABELS.SUSPENDIDO}.`
        : `No se puede pasar de ${PROPERTY_STATUS_LABELS[from]} a ${PROPERTY_STATUS_LABELS[to]}.`,
    })
    return issues
  }

  const trimmed = reason.trim()
  if (statusRequiresReason(to)) {
    if (trimmed.length < REASON_MIN_LENGTH) {
      issues.push({
        field: 'reason',
        message: `Describe el motivo del cambio a ${PROPERTY_STATUS_LABELS[to]} (mínimo ${REASON_MIN_LENGTH} caracteres).`,
      })
    }
  } else if (trimmed.length > REASON_MAX_LENGTH) {
    issues.push({
      field: 'reason',
      message: `El motivo no puede superar los ${REASON_MAX_LENGTH} caracteres.`,
    })
  }

  return issues
}

// -------------------------------------------------------------
// Reglas de franjas horarias
// -------------------------------------------------------------

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const isValidTime = (value: string): boolean => TIME_PATTERN.test(value)

/** `'09:30'` -> 570. No usar con valores que no pasan `isValidTime`. */
const toMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export interface ScheduleIssue {
  /** `null` cuando el problema afecta a la semana entera y no a un día. */
  day: Weekday | null
  /** Índice de la franja dentro del día, o `null` si el problema es del día. */
  slotIndex: number | null
  field: 'days' | 'slots' | 'start_time' | 'end_time'
  message: string
}

interface ComparableSlot {
  slot: TimeSlotInput
  index: number
  start: number
  end: number
}

/**
 * Valida la configuración semanal completa con las reglas del `PUT
 * .../schedules`: formato `HH:MM`, `start_time` anterior a `end_time`,
 * duración entre 30 minutos y 8 horas, sin solapamiento dentro del día, sin
 * días duplicados y con los topes de 6 franjas por día y 28 por semana.
 */
export function validateScheduleDays(days: WeekdayScheduleInput[]): ScheduleIssue[] {
  const issues: ScheduleIssue[] = []
  const seen = new Set<Weekday>()
  let total = 0

  for (const day of days) {
    if (seen.has(day.weekday)) {
      issues.push({
        day: day.weekday,
        slotIndex: null,
        field: 'days',
        message: `${WEEKDAY_LABELS[day.weekday]} está duplicado: agrupa sus franjas en una sola entrada.`,
      })
      continue
    }
    seen.add(day.weekday)

    if (day.slots.length === 0) {
      issues.push({
        day: day.weekday,
        slotIndex: null,
        field: 'slots',
        message: `Declara al menos una franja de ${WEEKDAY_LABELS[day.weekday]} o quita el día de la semana.`,
      })
    }
    if (day.slots.length > MAX_SLOTS_PER_DAY) {
      issues.push({
        day: day.weekday,
        slotIndex: null,
        field: 'slots',
        message: `${WEEKDAY_LABELS[day.weekday]} tiene ${day.slots.length} franjas y el máximo es ${MAX_SLOTS_PER_DAY}.`,
      })
    }
    total += day.slots.length

    const comparable: ComparableSlot[] = []

    day.slots.forEach((slot, index) => {
      const validStart = isValidTime(slot.start_time)
      const validEnd = isValidTime(slot.end_time)

      if (!validStart) {
        issues.push({
          day: day.weekday,
          slotIndex: index,
          field: 'start_time',
          message: 'La hora de inicio debe tener el formato HH:MM en 24 horas.',
        })
      }
      if (!validEnd) {
        issues.push({
          day: day.weekday,
          slotIndex: index,
          field: 'end_time',
          message: 'La hora de fin debe tener el formato HH:MM en 24 horas.',
        })
      }
      if (!validStart || !validEnd) return

      const start = toMinutes(slot.start_time)
      const end = toMinutes(slot.end_time)

      if (start >= end) {
        issues.push({
          day: day.weekday,
          slotIndex: index,
          field: 'end_time',
          message: `La hora de inicio ${slot.start_time} debe ser anterior a la de fin ${slot.end_time}.`,
        })
        return
      }

      const duration = end - start
      if (duration < SLOT_MIN_MINUTES) {
        issues.push({
          day: day.weekday,
          slotIndex: index,
          field: 'end_time',
          message: `La franja dura ${duration} minutos y el mínimo es ${SLOT_MIN_MINUTES}.`,
        })
      }
      if (duration > SLOT_MAX_MINUTES) {
        issues.push({
          day: day.weekday,
          slotIndex: index,
          field: 'end_time',
          message: `La franja dura ${duration} minutos y el máximo es ${SLOT_MAX_MINUTES}.`,
        })
      }

      comparable.push({ slot, index, start, end })
    })

    // El intervalo es semiabierto `[start, end)`: 09:00-12:00 y 12:00-15:00
    // son contiguas, así que solo se reporta solapamiento real.
    comparable.sort((a, b) => a.start - b.start)
    for (let i = 1; i < comparable.length; i += 1) {
      const previous = comparable[i - 1]
      const current = comparable[i]
      if (current.start < previous.end) {
        issues.push({
          day: day.weekday,
          slotIndex: current.index,
          field: 'start_time',
          message: `Se solapa con la franja ${previous.slot.start_time}–${previous.slot.end_time}.`,
        })
      }
    }
  }

  if (total > MAX_SLOTS_PER_WEEK) {
    issues.push({
      day: null,
      slotIndex: null,
      field: 'days',
      message: `La semana tiene ${total} franjas y el máximo es ${MAX_SLOTS_PER_WEEK}.`,
    })
  }

  return issues
}

/** Primer problema declarado para una franja concreta, si lo hay. */
export function slotIssue(issues: ScheduleIssue[], day: Weekday, slotIndex: number): string | undefined {
  return issues.find((issue) => issue.day === day && issue.slotIndex === slotIndex)?.message
}

/** Problemas que no pertenecen a una franja concreta: días y topes semanales. */
export function dayIssues(issues: ScheduleIssue[], day: Weekday): string[] {
  return issues
    .filter((issue) => issue.day === day && issue.slotIndex === null)
    .map((issue) => issue.message)
}

// -------------------------------------------------------------
// Borrador editable de la semana
// -------------------------------------------------------------

/**
 * Semana en edición, indexada por día. Un día sin franjas es una lista vacía,
 * y como las claves son los propios `Weekday` un día no puede repetirse: la
 * regla de duplicados queda garantizada por la estructura del borrador.
 */
export type ScheduleDraft = Record<Weekday, TimeSlotInput[]>

export const emptyDraft = (): ScheduleDraft => {
  const draft = {} as ScheduleDraft
  for (const weekday of WEEKDAYS) draft[weekday] = []
  return draft
}

/** Pasa la respuesta del `GET` al borrador, descartando las franjas inactivas. */
export function draftFromSchedules(schedules: PropertySchedules | null): ScheduleDraft {
  const draft = emptyDraft()
  if (!schedules) return draft
  for (const day of schedules.days) {
    if (!WEEKDAYS.includes(day.weekday)) continue
    draft[day.weekday] = day.slots
      .filter((slot) => slot.is_active)
      .map(({ start_time, end_time }) => ({ start_time, end_time }))
  }
  return draft
}

/** Días con franjas, en orden de lunes a domingo. Los vacíos se omiten. */
export const toSchedulesInput = (draft: ScheduleDraft): WeekdayScheduleInput[] =>
  WEEKDAYS
    .map((weekday) => ({ weekday, slots: draft[weekday] }))
    .filter((day) => day.slots.length > 0)

export const draftSlotCount = (draft: ScheduleDraft): number =>
  WEEKDAYS.reduce((total, weekday) => total + draft[weekday].length, 0)