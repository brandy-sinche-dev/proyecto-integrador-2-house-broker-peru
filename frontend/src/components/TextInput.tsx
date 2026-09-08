import type { InputHTMLAttributes } from 'react'
import './TextInput.css'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function TextInput({ invalid, className, ...props }: TextInputProps) {
  return <input className={`hinput ${invalid ? 'hinput--invalid' : ''} ${className ?? ''}`} {...props} />
}
