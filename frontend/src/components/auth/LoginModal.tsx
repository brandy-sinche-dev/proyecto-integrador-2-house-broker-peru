import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  // Reset form when opened or when switching modes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setError('')
      setShowPassword(false)
      setMode('login')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const loggedUser = await signIn(email, password)
        onClose()
        if (loggedUser.role === 'ADMINISTRADOR') {
          navigate('/admin', { replace: true })
        } else if (loggedUser.role === 'AGENTE') {
          navigate('/agente', { replace: true })
        } else {
          navigate(from, { replace: true })
        }
      } else {
        // En modo registro, hacemos sign up y automáticamente sign in en la app real
        // Aquí asumimos que tienes un signUp en AuthContext, o simplemente lo mockeamos
        if (signUp) {
          await signUp({ full_name: name, email, password, phone })
        }
        // Asumiendo que signUp loguea al usuario o te pide loguearte. Mock directo:
        await signIn(email, password)
        onClose()
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? (mode === 'login' ? 'Credenciales incorrectas o error en el servidor.' : 'Error al registrar la cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault()
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white', zIndex: 10 }}
          aria-label="Cerrar"
        >&times;</button>

        <div style={{ textAlign: 'center', backgroundColor: 'var(--brand-bronze-deep, #562B05)', padding: '2rem 1rem 1.5rem 1rem' }}>
          <img src="/logo.png" alt="House Broker Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--brand-cream, #fbf9f8)', fontWeight: 600 }}>
            {mode === 'login' ? '¡Bienvenido a HOUSE BROKER!' : 'Únete a HOUSE BROKER'}
          </h2>
        </div>
        
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Nombres completos</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                    style={{ width: '100%', padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Teléfono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="999 888 777"
                    required
                    style={{ width: '100%', padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@email.com"
                required
                style={{ width: '100%', padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <a href="#" style={{ fontSize: '12px', color: '#d97706', textDecoration: 'none', fontWeight: 500 }}>Recuperar contraseña</a>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '0.5rem', padding: '0.875rem', 
                backgroundColor: 'var(--brand-gold, #cfa861)', color: 'var(--brand-bronze-deep, #562B05)', 
                border: 'none', borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', fontSize: '15px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (mode === 'login' ? 'Ingresando...' : 'Creando cuenta...') : (mode === 'login' ? 'Ingresar' : 'Crear cuenta')}
            </button>
            
            {mode === 'login' && (
              <button 
                type="button"
                onClick={onClose}
                style={{ 
                  padding: '0.875rem', 
                  backgroundColor: 'transparent', color: '#d97706', 
                  border: 'none', borderRadius: '8px', 
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Continuar como invitado
              </button>
            )}

            <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                {mode === 'login' ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
                <a href="#" onClick={toggleMode} style={{ color: '#d97706', textDecoration: 'none', fontWeight: 600 }}>
                  {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
