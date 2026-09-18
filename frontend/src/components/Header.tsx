import './Header.css'

export type Section = 'inicio' | 'guardados' | 'visitas'
export type NavTarget = Section | 'concierge'

interface HeaderProps {
  current: Section
  conciergeOpen: boolean
  savedCount: number
  visitsCount: number
  onNavigate: (target: NavTarget) => void
}

const NAV: { id: NavTarget; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'guardados', label: 'Guardados' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'concierge', label: 'Concierge IA' },
]

export function Header({ current, conciergeOpen, savedCount, visitsCount, onNavigate }: HeaderProps) {
  const counts: Partial<Record<NavTarget, number>> = {
    guardados: savedCount,
    visitas: visitsCount,
  }

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <div className="hdr__left">
          <button type="button" className="hdr__brand" onClick={() => onNavigate('inicio')}>
            <span className="hdr__mark" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M10 2 2 8h1.6v8a1.4 1.4 0 0 0 1.4 1.4h3V13h4v4.4h3A1.4 1.4 0 0 0 16.4 16V8H18L10 2Z" fill="currentColor" />
              </svg>
            </span>
            <span className="hdr__word">
              <span className="hdr__name">House Broker</span>
              <span className="hdr__country">Perú</span>
            </span>
          </button>

          <nav className="hdr__nav" aria-label="Navegación principal">
            {NAV.map((item) => {
              const active = item.id === 'concierge' ? conciergeOpen : current === item.id
              const badge = counts[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`hdr__link ${active ? 'hdr__link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                  {badge != null && badge > 0 && <span className="hdr__count">{badge}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="hdr__right">
          <a className="hdr__cta" href="mailto:asesores@housebroker.pe">
            Contactar asesor
          </a>
          <div className="hdr__agent">
            <span className="hdr__agent-avatar" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M10 10.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Zm0 1.6c-3.3 0-6 1.9-6 4.2v.6h12v-.6c0-2.3-2.7-4.2-6-4.2Z" fill="currentColor" />
              </svg>
            </span>
            <span className="hdr__agent-label">Agente Inmobiliario</span>
          </div>
        </div>
      </div>
    </header>
  )
}
