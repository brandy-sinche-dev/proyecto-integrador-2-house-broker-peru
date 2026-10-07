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
  return (
    <div className="lprompt" role="presentation" onClick={onClose}>
      <div
        className="lprompt__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lprompt-title"
        aria-describedby="lprompt-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="lprompt__close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <h2 id="lprompt-title">Inicia sesión para guardar favoritos</h2>
        <p id="lprompt-desc">Guardamos tu elección: al entrar, el inmueble quedará marcado para ti.</p>
        <div className="lprompt__actions">
          <button type="button" className="lprompt__primary" onClick={onLogin}>
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