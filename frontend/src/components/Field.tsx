import type { ReactNode } from 'react'
import './Field.css'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}

export function Field({ label, hint, required, error, className, children }: FieldProps) {
  return (
    <label className={`hfield ${className ?? ''}`}>
      <span className="hfield__label">
        {label}
        {required && <span className="hfield__req">*</span>}
      </span>
      {children}
      {hint && !error && <span className="hfield__hint">{hint}</span>}
      {error && <span className="hfield__error">{error}</span>}
    </label>
  )
}