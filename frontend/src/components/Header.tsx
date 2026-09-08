import type { ReactNode } from 'react'
import './Header.css'

interface HeaderProps {
  onNavigate: (view: 'list' | 'form') => void
  current: 'list' | 'form'
  children?: ReactNode
}

export function Header({ onNavigate, current, children }: HeaderProps) {
  return (
    <header className="hdr">
      <div className="hdr__inner">
        <button type="button" className="hdr__brand" onClick={() => onNavigate('list')}>
          <svg className="hdr__mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3 3 12h2v11a2 2 0 0 0 2 2h4V16h10v9h4a2 2 0 0 0 2-2V12h2L16 3Z" fill="currentColor" />
          </svg>
          <span className="hdr__word">
            <span className="hdr__name">HouseBroker</span>
            <span className="hdr__tagline">Inmobiliaria</span>
          </span>
        </button>

        <nav className="hdr__nav">
          <button
            type="button"
            className={`hdr__link ${current === 'list' ? 'hdr__link--active' : ''}`}
            onClick={() => onNavigate('list')}
          >
            Propiedades
          </button>
          <button
            type="button"
            className={`hdr__link ${current === 'form' ? 'hdr__link--active' : ''}`}
            onClick={() => onNavigate('form')}
          >
            Registrar
          </button>
        </nav>

        {children}
      </div>
    </header>
  )
}