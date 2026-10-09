import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export type Section = 'inicio' | 'propiedades' | 'guardados' | 'visitas'
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
  { id: 'propiedades', label: 'Propiedades' },
  { id: 'guardados', label: 'Guardados' },
  { id: 'visitas', label: 'Visitas' },
]

export function Header({ current, conciergeOpen, savedCount, visitsCount, onNavigate, onOpenLogin }: HeaderProps) {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const counts: Partial<Record<NavTarget, number>> = {
    guardados: savedCount,
    visitas: visitsCount,
  }

  const handleNav = (id: NavTarget) => {
    onNavigate(id)
    setMobileMenuOpen(false)
  }

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <div className="hdr__left">
          <button type="button" className="hdr__brand" onClick={() => handleNav('inicio')}>
            <img src="/logo.png" alt="House Broker Perú Logo" style={{ height: '48px', objectFit: 'contain' }} />
          </button>

          <nav className="hdr__nav-desktop" aria-label="Navegación principal">
            {NAV.map((item) => {
              const active = item.id === 'concierge' ? conciergeOpen : current === item.id
              const badge = counts[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`hdr__link ${active ? 'hdr__link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => handleNav(item.id)}
                >
                  {item.label}
                  {badge != null && badge > 0 && <span className="hdr__count">{badge}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="hdr__right">
          <a className="hdr__cta hdr__desktop-only" href="mailto:asesores@housebroker.pe">
            Contactar asesor
          </a>

          {!user ? (
            <button 
              className="hdr__desktop-only"
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
            <div style={{ position: 'relative' }} className="hdr__desktop-only">
              <div 
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-cream)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span aria-hidden="true" style={{ background: 'var(--brand-gold)', color: 'var(--brand-bronze-deep)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" style={{ width: '20px', height: '20px' }}>
                    <path d="M10 10.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Zm0 1.6c-3.3 0-6 1.9-6 4.2v.6h12v-.6c0-2.3-2.7-4.2-6-4.2Z" fill="currentColor" />
                  </svg>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{user.full_name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '10px', color: 'var(--brand-gold-light)' }}>{user.role}</span>
                </div>
              </div>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: '160px', zIndex: 50
                }}>
                  {['ADMINISTRADOR', 'AGENTE'].includes(user.role) && (
                    <button 
                      onClick={() => {
                        setMenuOpen(false)
                        navigate(user.role === 'ADMINISTRADOR' ? '/admin' : '/agente')
                      }}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                      Ir al Panel
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/ajustes')
                    }}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    Configuración
                  </button>
                  <button 
                    onClick={() => {
                      setMenuOpen(false)
                      signOut()
                      navigate('/')
                    }}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button 
            className="hdr__hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil (Dropdown overlay) */}
      {mobileMenuOpen && (
        <div className="hdr__mobile-menu">
          <nav className="hdr__mobile-nav">
            {NAV.map((item) => {
              const active = item.id === 'concierge' ? conciergeOpen : current === item.id
              const badge = counts[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`hdr__mobile-link ${active ? 'hdr__mobile-link--active' : ''}`}
                  onClick={() => handleNav(item.id)}
                >
                  {item.label}
                  {badge != null && badge > 0 && <span className="hdr__count" style={{marginLeft: '8px'}}>{badge}</span>}
                </button>
              )
            })}
          </nav>

          <div className="hdr__mobile-actions">
            <a className="hdr__mobile-cta" href="mailto:asesores@housebroker.pe">
              Contactar asesor
            </a>

            {!user ? (
              <button 
                className="hdr__mobile-btn-primary"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenLogin()
                }}
              >
                Iniciar Sesión
              </button>
            ) : (
              <div className="hdr__mobile-user-section">
                <div className="hdr__mobile-user-info">
                  <span className="hdr__mobile-avatar">
                    <svg viewBox="0 0 20 20" style={{ width: '20px', height: '20px' }}>
                      <path d="M10 10.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Zm0 1.6c-3.3 0-6 1.9-6 4.2v.6h12v-.6c0-2.3-2.7-4.2-6-4.2Z" fill="currentColor" />
                    </svg>
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{user.full_name?.split(' ')[0]}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.role}</div>
                  </div>
                </div>
                
                {['ADMINISTRADOR', 'AGENTE'].includes(user.role) && (
                  <button 
                    className="hdr__mobile-user-action"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(user.role === 'ADMINISTRADOR' ? '/admin' : '/agente')
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Ir al Panel
                  </button>
                )}
                <button 
                  className="hdr__mobile-user-action"
                  style={{ color: '#dc2626' }}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                    navigate('/')
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
