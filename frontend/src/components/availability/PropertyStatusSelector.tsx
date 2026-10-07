import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../Button'
import { getErrorMessage } from '../../services/axios'
import {
  allowedTransitions,
  statusRequiresReason,
  updatePropertyStatus,
  validateStatusChange,
} from '../../services/availability'
import {
  PROPERTY_STATUSES,
  PROPERTY_STATUS_HINTS,
  PROPERTY_STATUS_LABELS,
  type PropertyStatus,
  type PropertyStatusResult,
} from '../../services/types'
import './PropertyStatusSelector.css'

interface PropertyStatusSelectorProps {
  propertyId: string
  status: PropertyStatus
  onChanged: (result: PropertyStatusResult) => void
}

/**
 * Selector de estado operativo del inmueble (RF-PROP-04).
 *
 * Se presenta como un grupo de opciones excluyentes porque el estado es un
 * enum de un solo valor: radios con un único tab stop y navegación por flechas.
 *
 * Decisión de patrón: radiogroup y NO role="switch". Un switch es un toggle
 * binario on/off (una sola opción); aquí hay 5 estados mutuamente excluyentes
 * (Disponible, Reservado, Alquilado, Vendido, Suspendido) y el rol correcto
 * para elegir exactamente uno entre varios es el patrón radiogroup del
 * WAI-ARIA Authoring Practices Guide (APG): radios con roving tabindex,
 * flechas circulares y aria-checked. La agrupación en role="switch" solo
 * aplicaría si cada estado se pudiera activar/desactivar de forma
 * independiente, lo cual no es el caso.
 *
 * El estado vigente solo se cambia cuando el backend confirma el `PATCH`. Un
 * fallo devuelve el selector al estado que el servidor reconoce y muestra el
 * motivo, de modo que la pantalla nunca muestra un estado que el servidor no
 * tiene.
 */
export function PropertyStatusSelector({ propertyId, status, onChanged }: PropertyStatusSelectorProps) {
  const groupId = useId()
  const reasonId = `${groupId}-reason`
  const reasonIssueId = `${reasonId}-error`
  const messageId = `${groupId}-message`
  const options = useRef<Partial<Record<PropertyStatus, HTMLButtonElement | null>>>({})

  const [current, setCurrent] = useState<PropertyStatus>(status)
  const [target, setTarget] = useState<PropertyStatus>(status)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [syncedFrom, setSyncedFrom] = useState<PropertyStatus>(status)

  // Si el padre vuelve a traer el estado del servidor (otra pestaña, un
  // refresco del panel) el selector se realinea y se descarta el motivo, que
  // solo tenía sentido para la transición que se estaba evaluando. Se ajusta
  // durante el render en vez de en un efecto: es el patrón que ya usa
  // `PropertyList` con su clave de reinicio, y evita un render intermedio que
  // todavía mostraría el estado viejo.
  if (syncedFrom !== status) {
    setSyncedFrom(status)
    setCurrent(status)
    setTarget(status)
    setReason('')
    setError(null)
    setNotice(null)
  }

  const issues = validateStatusChange(current, target, reason)
  // Sin un destino distinto no hay transición solicitada que anunciar como error.
  const statusIssue = target !== current ? issues.find((issue) => issue.field === 'status')?.message : undefined
  const reasonIssue = issues.find((issue) => issue.field === 'reason')?.message
  const needsReason = statusRequiresReason(target)
  const dirty = target !== current || (needsReason && reason.trim() !== '')
  const message = error ?? notice
  const enabled = PROPERTY_STATUSES.filter((value) => allowedTransitions(current).includes(value))
  // El estado vigente puede estar deshabilitado: Tab entra al primer destino válido.
  const tabStop = enabled.includes(target) ? target : enabled[0]

  const choose = (next: PropertyStatus) => {
    setTarget(next)
    setError(null)
    setNotice(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving || issues.length > 0) return

    setSaving(true)
    setError(null)
    setNotice(null)

    updatePropertyStatus(propertyId, { status: target, reason: reason.trim() || undefined })
      .then((result) => {
        setCurrent(result.status)
        setTarget(result.status)
        setReason('')
        setNotice(`Estado actualizado a ${PROPERTY_STATUS_LABELS[result.status]}.`)
        onChanged(result)
      })
      .catch((err) => {
        // El contrato devuelve `previous_status` justamente para esto: si la
        // escritura falla, la vista vuelve al último estado que el servidor
        // reconoce en lugar de dejar un estado optimista que nunca existió.
        setTarget(current)
        setReason('')
        setError(getErrorMessage(err, 'No se pudo actualizar el estado del inmueble.'))
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <section className="hstate" aria-labelledby={groupId}>
      <header className="hstate__head">
        <h2 className="hstate__title" id={groupId}>
          Estado del inmueble
        </h2>
        <p className="hstate__sub">
          Define en qué etapa comercial está. Los estados que no son posibles desde
          «{PROPERTY_STATUS_LABELS[current]}» aparecen desactivados.
        </p>
      </header>

      <form onSubmit={submit} noValidate>
        <div className="hstate__options" role="radiogroup" aria-labelledby={groupId}>
          {PROPERTY_STATUSES.map((value) => {
            const allowed = allowedTransitions(current).includes(value)
            const selected = target === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                ref={(node) => { options.current[value] = node }}
                tabIndex={value === tabStop ? 0 : -1}
                aria-checked={selected}
                aria-label={PROPERTY_STATUS_LABELS[value]}
                aria-describedby={`${groupId}-${value}-hint`}
                disabled={!allowed}
                className={`hstate__option ${selected ? 'hstate__option--on' : ''} ${
                  !allowed ? 'hstate__option--off' : ''
                }`}
                onClick={() => choose(value)}
                onKeyDown={(event) => {
                  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return
                  event.preventDefault()
                  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
                  const next = enabled[(enabled.indexOf(value) + step + enabled.length) % enabled.length]
                  if (next) {
                    choose(next)
                    options.current[next]?.focus()
                  }
                }}
              >
                <span className="hstate__option-name">{PROPERTY_STATUS_LABELS[value]}</span>
                <span className="hstate__option-hint" id={`${groupId}-${value}-hint`}>
                  {PROPERTY_STATUS_HINTS[value]}
                  {value === current && <span> Estado actual.</span>}
                </span>
                {value === current && <span className="hstate__option-lock">Estado actual</span>}
              </button>
            )
          })}
        </div>

        {statusIssue && (
          <p className="hstate__issue" role="alert">
            {statusIssue}
          </p>
        )}

        <div className="hstate__reason">
          <label className="hstate__reason-label" htmlFor={reasonId}>
            Motivo del cambio
            {needsReason && <span className="hstate__req" aria-hidden="true">*</span>}
          </label>
          <textarea
            id={reasonId}
            className={`hstate__reason-input ${reasonIssue ? 'hstate__reason-input--invalid' : ''}`}
            rows={2}
            value={reason}
            required={needsReason}
            aria-required={needsReason || undefined}
            aria-invalid={reasonIssue ? true : undefined}
            aria-describedby={reasonIssue ? reasonIssueId : undefined}
            placeholder={
              needsReason
                ? 'Describe la decisión para que quede registrada en la auditoría.'
                : 'Opcional.'
            }
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
              setNotice(null)
            }}
          />
          {reasonIssue && (
            <span className="hstate__issue" id={reasonIssueId} role="alert">
              {reasonIssue}
            </span>
          )}
        </div>

        <p className="hstate__feedback" id={messageId} role="status" aria-live="polite" aria-atomic="true">
          {error ? <span className="hstate__feedback-error">{message}</span> : message}
        </p>

        <div className="hstate__actions">
          <Button
            type="button"
            variant="neutral"
            disabled={!dirty || saving}
            onClick={() => {
              setTarget(current)
              setReason('')
              setError(null)
              setNotice(null)
            }}
          >
            Descartar
          </Button>
          <Button type="submit" disabled={!dirty || saving || issues.length > 0}>
            {saving ? 'Guardando…' : 'Guardar estado'}
          </Button>
        </div>
      </form>
    </section>
  )
}
