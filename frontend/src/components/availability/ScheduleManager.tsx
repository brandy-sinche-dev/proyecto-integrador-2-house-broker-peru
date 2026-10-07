import { useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../Button'
import { getErrorMessage } from '../../services/axios'
import {
  dayIssues,
  draftFromSchedules,
  draftSlotCount,
  MAX_SLOTS_PER_DAY,
  replacePropertySchedules,
  slotIssue,
  toSchedulesInput,
  validateScheduleDays,
  type ScheduleDraft,
} from '../../services/availability'
import {
  PROPERTY_STATUS_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type PropertySchedules,
  type PropertyStatus,
  type TimeSlotInput,
  type Weekday,
  type WeekdayScheduleInput,
} from '../../services/types'
import './ScheduleManager.css'

interface ScheduleManagerProps {
  propertyId: string
  schedules: PropertySchedules | null
  status: PropertyStatus
  onSaved: (schedules: PropertySchedules) => void
}

const EMPTY_SLOT: TimeSlotInput = { start_time: '', end_time: '' }

/** Compara dos configuraciones semanales por días, orden y horas. */
function sameSchedule(a: WeekdayScheduleInput[], b: WeekdayScheduleInput[]): boolean {
  if (a.length !== b.length) return false
  return a.every((day, index) => {
    const other = b[index]
    if (day.weekday !== other.weekday || day.slots.length !== other.slots.length) return false
    return day.slots.every(
      (slot, i) => slot.start_time === other.slots[i].start_time && slot.end_time === other.slots[i].end_time,
    )
  })
}

/**
 * Gestor de franjas de visita (RF-PROP-04 / `PUT .../schedules`).
 *
 * La semana se edita como un borrador completo y se envía de una sola vez: el
 * endpoint es un reemplazo idempotente, así que no tiene sentido mandar franjas
 * sueltas mientras el usuario sigue moviendo horas.
 *
 * Un día marcado es un día con franjas y un día sin marcar es un día sin
 * atención, que es como el contrato los espera: los días vacíos se omiten del
 * cuerpo en lugar de declararse con `slots: []`.
 *
 * El borrador solo se realinea con `schedules` cuando el padre le pasa una
 * agenda nueva; mientras tanto manda lo que el agente está escribiendo, incluso
 * si el `PUT` falla, para que pueda corregir y reintentar sin rehacer la semana.
 */
export function ScheduleManager({ propertyId, schedules, status, onSaved }: ScheduleManagerProps) {
  const headingId = useId()
  const messageId = `${headingId}-message`
  const dayControls = useRef<Partial<Record<Weekday, HTMLInputElement | null>>>({})
  const [collapsed, setCollapsed] = useState<Partial<Record<Weekday, boolean>>>({})

  const [draft, setDraft] = useState<ScheduleDraft>(() => draftFromSchedules(schedules))
  const [syncedFrom, setSyncedFrom] = useState(schedules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Cuando el padre vuelve a traer la agenda (tras guardar, tras un refresco)
  // el borrador se realinea con ella. Se ajusta durante el render en lugar de
  // en un efecto, por el mismo motivo que en `PropertyStatusSelector`: sin
  // esto habría un render intermedio con el borrador viejo y el botón de
  // guardar deshabilitado solo a medias.
  if (syncedFrom !== schedules) {
    setSyncedFrom(schedules)
    setDraft(draftFromSchedules(schedules))
    setCollapsed({})
    setError(null)
    setNotice(null)
  }

  const input = useMemo(() => toSchedulesInput(draft), [draft])
  const issues = useMemo(() => validateScheduleDays(input), [input])
  const total = draftSlotCount(draft)

  // Un borrador sin cambios respecto de lo que devolvió el `GET` no se envía:
  // el `PUT` es un reemplazo completo, así que mandarlo sin motivo reescribe
  // filas que ya estaban bien.
  const pristine = useMemo(
    () => sameSchedule(toSchedulesInput(draftFromSchedules(schedules)), input),
    [schedules, input],
  )

  const setSlot = (weekday: Weekday, index: number, patch: Partial<TimeSlotInput>) => {
    setDraft((prev) => ({
      ...prev,
      [weekday]: prev[weekday].map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    }))
    setError(null)
    setNotice(null)
  }

  const addSlot = (weekday: Weekday) => {
    setCollapsed((prev) => ({ ...prev, [weekday]: false }))
    setDraft((prev) => ({ ...prev, [weekday]: [...prev[weekday], { ...EMPTY_SLOT }] }))
    setError(null)
    setNotice(null)
  }

  const removeSlot = (weekday: Weekday, index: number) => {
    dayControls.current[weekday]?.focus()
    setDraft((prev) => {
      const remaining = prev[weekday].filter((_, i) => i !== index)
      return {
        ...prev,
        [weekday]: remaining.length === 0 ? [] : remaining,
      }
    })
    setError(null)
    setNotice(null)
  }

  const toggleDay = (weekday: Weekday, checked: boolean) => {
    setCollapsed((prev) => ({ ...prev, [weekday]: false }))
    setDraft((prev) => ({ ...prev, [weekday]: checked ? [{ ...EMPTY_SLOT }] : [] }))
    setError(null)
    setNotice(null)
  }

  const clearAll = () => {
    setDraft(draftFromSchedules(null))
    setError(null)
    setNotice(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving || issues.length > 0) return

    setSaving(true)
    setError(null)
    setNotice(null)

    replacePropertySchedules(propertyId, { days: input })
      .then((result) => {
        setDraft(draftFromSchedules(result))
        setNotice(`Agenda guardada con ${result.total_slots} franjas semanales.`)
        onSaved(result)
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No se pudo guardar la agenda de visitas.'))
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const canBook = status === 'DISPONIBLE'
  const generalIssues = issues.filter((issue) => issue.day === null).map((issue) => issue.message)

  return (
    <section className="hslots" aria-labelledby={headingId}>
      <header className="hslots__head">
        <h2 className="hslots__title" id={headingId}>
          Agenda de visitas
        </h2>
        <p className="hslots__sub">
          Marca los días que atiendes y define la hora de inicio y de fin de cada franja.
          Las horas se interpretan en {schedules?.timezone ?? 'America/Lima'}.
        </p>
        {!canBook && (
          <p className="hslots__notice">
            El inmueble está en estado «{PROPERTY_STATUS_LABELS[status]}»: la agenda se puede
            guardar, pero no admits visitas hasta volver a «{PROPERTY_STATUS_LABELS.DISPONIBLE}».
          </p>
        )}
      </header>

      <form onSubmit={submit} noValidate>
        <ul className="hslots__days">
          {WEEKDAYS.map((weekday) => {
            const slots = draft[weekday]
            const dayLabel = WEEKDAY_LABELS[weekday]
            const dayProblems = dayIssues(issues, weekday)
            const checkboxId = `${headingId}-${weekday}`
            const problemsId = `${checkboxId}-problems`
            const listId = `${checkboxId}-slots`
            const expanded = !collapsed[weekday]
            return (
              <li key={weekday} className={`hslots__day ${slots.length > 0 ? 'hslots__day--on' : ''}`}>
                <div className="hslots__day-head">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    role="switch"
                    ref={(node) => { dayControls.current[weekday] = node }}
                    aria-checked={slots.length > 0}
                    className="hslots__day-check"
                    checked={slots.length > 0}
                    aria-describedby={dayProblems.length > 0 ? problemsId : undefined}
                    onChange={(e) => toggleDay(weekday, e.target.checked)}
                  />
                  <label className="hslots__day-label" htmlFor={checkboxId}>
                    {dayLabel}
                  </label>
                  <span className="hslots__day-count">
                    {slots.length === 0 ? 'Sin atención' : `${slots.length} franja${slots.length === 1 ? '' : 's'}`}
                  </span>
                  {slots.length > 0 && (
                    <button
                      type="button"
                      className="hslots__add"
                      aria-expanded={expanded}
                      aria-controls={listId}
                      onClick={() => setCollapsed((prev) => ({ ...prev, [weekday]: expanded }))}
                    >
                      Franjas de {dayLabel}
                    </button>
                  )}
                  {slots.length > 0 && (
                    <button
                      type="button"
                      className="hslots__add"
                      disabled={saving || slots.length >= MAX_SLOTS_PER_DAY}
                      onClick={() => addSlot(weekday)}
                    >
                      + Agregar franja
                    </button>
                  )}
                </div>

                {dayProblems.length > 0 && (
                  <ul className="hslots__problems" id={problemsId}>
                    {dayProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}

                {slots.length > 0 && (
                  <ul className="hslots__list" id={listId} aria-label={`Franjas de ${dayLabel}`} hidden={!expanded}>
                    {slots.map((slot, index) => {
                      const problem = slotIssue(issues, weekday, index)
                      const startId = `${checkboxId}-s${index}`
                      const endId = `${checkboxId}-e${index}`
                      const problemId = `${startId}-problem`
                      const position = `Franja ${index + 1} de ${dayLabel}`
                      return (
                        <li key={index} className="hslots__slot">
                          <div className="hslots__times">
                            <label className="hslots__time" htmlFor={startId}>
                              <span className="hslots__time-label">Inicio</span>
                              <input
                                id={startId}
                                type="time"
                                className={`hslots__time-input ${problem ? 'hslots__time-input--invalid' : ''}`}
                                value={slot.start_time}
                                aria-label={`${position}: hora de inicio`}
                                aria-invalid={problem ? true : undefined}
                                aria-describedby={problem ? problemId : undefined}
                                onChange={(e) => setSlot(weekday, index, { start_time: e.target.value })}
                              />
                            </label>

                            <span className="hslots__dash" aria-hidden="true">
                              –
                            </span>

                            <label className="hslots__time" htmlFor={endId}>
                              <span className="hslots__time-label">Fin</span>
                              <input
                                id={endId}
                                type="time"
                                className={`hslots__time-input ${problem ? 'hslots__time-input--invalid' : ''}`}
                                value={slot.end_time}
                                aria-label={`${position}: hora de fin`}
                                aria-invalid={problem ? true : undefined}
                                aria-describedby={problem ? problemId : undefined}
                                onChange={(e) => setSlot(weekday, index, { end_time: e.target.value })}
                              />
                            </label>

                            <button
                              type="button"
                              className="hslots__remove"
                              disabled={saving}
                              onClick={() => removeSlot(weekday, index)}
                            >
                              <span aria-hidden="true">×</span>
                              <span className="hslots__sr">
                                Quitar {position}
                              </span>
                            </button>
                          </div>
                          {problem && (
                            <p className="hslots__problem" id={problemId} role="alert">
                              {problem}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <p className="hslots__summary" aria-live="polite" aria-atomic="true">
          {total === 0
            ? 'El inmueble todavía no tiene franjas: no se pueden agendar visitas.'
            : `${total} franja${total === 1 ? '' : 's'} en la semana.`}
        </p>

        {generalIssues.map((problem) => (
          <p className="hslots__error" role="alert" key={problem}>
            {problem}
          </p>
        ))}

        <p className="hslots__feedback" id={messageId} role="status" aria-live="polite" aria-atomic="true">
          {error ? <span className="hslots__feedback-error">{error}</span> : notice}
        </p>

        <div className="hslots__actions">
          <Button type="button" variant="neutral" disabled={total === 0 || saving} onClick={clearAll}>
            Quitar toda la agenda
          </Button>
          <Button type="submit" disabled={saving || issues.length > 0 || pristine}>
            {saving ? 'Guardando…' : 'Guardar agenda'}
          </Button>
        </div>
      </form>
    </section>
  )
}
