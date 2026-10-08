import { useEffect, useRef } from 'react'
import './LoginPrompt.css'

interface LoginPromptProps {
  onClose: () => void
  onLogin: () => void
}

/**
 * Aviso de HU-PROP-05 CA-3: un usuario anónimo que toca el corazón no puede
 * guardar. Guardamos el intento y ofrecemos ir al login; al volver con sesión
 * activa el inmueble se marca automáticamente.
 */
export function LoginPrompt({ onClose, onLogin }: LoginPromptProps) {
  const loginButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const trigger = document.activeElement
    loginButton.current?.focus()
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <div className="lprompt" role="presentation" onClick={onClose}>
      <div
        className="lprompt__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lprompt-title"
        aria-describedby="lprompt-desc"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }
          if (e.key !== 'Tab') return
          const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }}
      >
        <button type="button" className="lprompt__close" aria-label="Cerrar" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
        <h2 id="lprompt-title">Inicia sesión para guardar favoritos</h2>
        <p id="lprompt-desc">Guardamos tu elección: al entrar, el inmueble quedará marcado para ti.</p>
        <div className="lprompt__actions">
          <button ref={loginButton} type="button" className="lprompt__primary" onClick={onLogin}>
            Iniciar sesión
          </button>
          <button type="button" className="lprompt__ghost" onClick={onClose}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
