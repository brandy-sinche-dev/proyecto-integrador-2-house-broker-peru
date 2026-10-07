import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import './Header.css'

export type Section = 'inicio' | 'guardados' | 'visitas'
export type NavTarget = Section | 'concierge'

interface HeaderProps {
  current: Section
  conciergeOpen: boolean
  savedCount: number
  visitsCount: number
  onNavigate: (target: NavTarget) => void
  onOpenLogin: () => void
}

const NAV: { id: NavTarget; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'guardados', label: 'Guardados' },
  { id: 'visitas', label: 'Visitas' },
]

export function Header({ current, conciergeOpen, savedCount, visitsCount, onNavigate, onOpenLogin }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const counts: Partial<Record<NavTarget, number>> = {
    guardados: savedCount,
    visitas: visitsCount,
  }

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <div className="hdr__left">
          <button type="button" className="hdr__brand" onClick={() => onNavigate('inicio')} style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="House Broker Perú Logo" style={{ height: '48px', objectFit: 'contain' }} />
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

          {!user ? (
            <button 
              onClick={onOpenLogin}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--brand-gold)',
                color: 'var(--brand-bronze-deep)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginLeft: '1rem',
                transition: 'background 0.2s'
              }}
            >
              Iniciar Sesión
            </button>
          ) : (
            <div className="hdr__agent" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-cream)' }}>
              <span className="hdr__agent-avatar" aria-hidden="true" style={{ background: 'var(--brand-gold)', color: 'var(--brand-bronze-deep)' }}>
                <svg viewBox="0 0 20 20">
                  <path d="M10 10.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Zm0 1.6c-3.3 0-6 1.9-6 4.2v.6h12v-.6c0-2.3-2.7-4.2-6-4.2Z" fill="currentColor" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{user.full_name}</span>
                <span style={{ fontSize: '10px', color: 'var(--brand-gold-light)' }}>{user.role}</span>
              </div>
              <button 
                onClick={() => {
                  if (user.role === 'ADMINISTRADOR') navigate('/admin')
                  else if (user.role === 'AGENTE') navigate('/agente')
                  else navigate('/')
                }}
                style={{
                  background: 'none', border: '1px solid var(--brand-cream)', color: 'var(--brand-cream)', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', cursor: 'pointer', marginLeft: '5px'
                }}
              >
                Panel
              </button>
              <button 
                onClick={logout}
                style={{
                  background: 'none', border: 'none', textDecoration: 'underline', color: '#ffdea7', fontSize: '10px', cursor: 'pointer', marginLeft: '5px'
                }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
