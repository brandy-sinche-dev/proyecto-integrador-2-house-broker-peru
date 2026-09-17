import type { NavTarget } from './Header'
import './AssistantWidget.css'

interface AssistantWidgetProps {
  open: boolean
  savedCount: number
  visitsCount: number
  onToggle: () => void
  onNavigate: (target: NavTarget) => void
}

export function AssistantWidget({ open, savedCount, visitsCount, onToggle, onNavigate }: AssistantWidgetProps) {
  const teaser =
    savedCount > 0 || visitsCount > 0
      ? `Tienes ${savedCount} guardado${savedCount === 1 ? '' : 's'} y ${visitsCount} visita${visitsCount === 1 ? '' : 's'} agendada${visitsCount === 1 ? '' : 's'}.`
      : 'Cuéntame qué buscas y te propongo opciones.'

  return (
    <div className="hai">
      {open && (
        <section className="hai__panel" role="dialog" aria-label="Concierge IA">
          <header className="hai__panel-head">
            <span className="hai__dot" aria-hidden="true" />
            <strong className="hai__panel-title">Concierge IA</strong>
            <button type="button" className="hai__close" onClick={onToggle} aria-label="Cerrar Concierge IA">
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="m2 2 8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="hai__messages">
            <p className="hai__bubble">¡Hola! Soy tu Concierge IA de House Broker Perú.</p>
            <p className="hai__bubble">
              {savedCount > 0 || visitsCount > 0
                ? `Veo que guardaste ${savedCount} inmueble${savedCount === 1 ? '' : 's'} y agendaste ${visitsCount} visita${visitsCount === 1 ? '' : 's'}. ¿Quieres que coordine algo más?`
                : 'Dime zona, presupuesto y número de dormitorios, y te armo una selección al instante.'}
            </p>
          </div>

          <div className="hai__quick">
            <button type="button" onClick={() => onNavigate('guardados')}>
              Ver guardados
            </button>
            <button type="button" onClick={() => onNavigate('visitas')}>
              Mis visitas
            </button>
          </div>
        </section>
      )}

      <div className="hai__dock">
        <div className="hai__card">
          <span className="hai__title">
            <span className="hai__dot" aria-hidden="true" />
            Concierge IA
          </span>
          <span className="hai__msg">{teaser}</span>
        </div>
        <button
          type="button"
          className="hai__btn"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Abrir Concierge IA"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 3h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8.5L4.8 17v-3H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}
