import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type Variant = 'primary' | 'neutral' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={`hbtn hbtn--${variant} hbtn--${size} ${className ?? ''}`} {...props} />
}
