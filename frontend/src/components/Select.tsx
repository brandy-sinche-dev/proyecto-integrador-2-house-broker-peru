import type { SelectHTMLAttributes } from 'react'
import './Select.css'

interface Option {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[]
  placeholder?: string
  invalid?: boolean
}

export function Select({ options, placeholder, invalid, className, ...props }: SelectProps) {
  return (
    <select className={`hselect ${invalid ? 'hselect--invalid' : ''} ${className ?? ''}`} {...props}>
      {placeholder !== undefined && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
