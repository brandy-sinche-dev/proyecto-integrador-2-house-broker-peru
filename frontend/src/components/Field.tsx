import {
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import './Field.css'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}

/**
 * Rótulo de formulario accesible: inyecta `id`, `aria-required`,
 * `aria-invalid` y `aria-describedby` en el control hijo para que los
 * mensajes de ayuda/error queden asociados y los anuncie el lector de pantalla.
 */
export function Field({ label, hint, required, error, className, children }: FieldProps) {
  const baseId = useId()
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  const extra: Record<string, unknown> = {
    id: baseId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
  }
  for (const key of Object.keys(extra)) {
    if (extra[key] === undefined) delete extra[key]
  }

  let control: ReactNode = children
  if (isValidElement(control)) {
    control = cloneElement(control as ReactElement<Record<string, unknown>>, extra)
  }

  return (
    <label className={`hfield ${className ?? ''}`}>
      <span className="hfield__label">
        {label}
        {required && <span className="hfield__req">*</span>}
      </span>
      {control}
      {hint && !error && (
        <span id={hintId} className="hfield__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="hfield__error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}