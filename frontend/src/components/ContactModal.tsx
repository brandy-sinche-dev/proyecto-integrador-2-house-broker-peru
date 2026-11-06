import React, { useState, useEffect } from 'react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setPhone('')
      setMessage('Hola, deseo asesoría para comprar/alquilar una propiedad.')
      setSent(false)
      setLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulación de envío de lead a CRM / API
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 600)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        {/* Cabecera del modal */}
        <div
          style={{
            backgroundColor: 'var(--brand-bronze-deep, #562B05)',
            padding: '1.5rem',
            color: 'var(--brand-cream, #fbf9f8)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: '14px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '26px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
              }}
            />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-gold, #e9c484)', fontWeight: 600 }}>
              Asesores disponibles ahora
            </span>
          </div>
          <h2 id="contact-modal-title" style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
            Contacta con un Asesor
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            HouseBroker Perú — Atención personalizada inmediata
          </p>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  fontSize: '28px',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-bronze-deep, #562B05)', fontSize: '1.2rem' }}>
                ¡Solicitud enviada con éxito!
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5 }}>
                Gracias por comunicarte con nosotros, <strong>{name || 'cliente'}</strong>. Un asesor inmobiliario te escribirá o llamará a la brevedad al número <strong>{phone}</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: 'var(--brand-bronze-deep, #562B05)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Entendido
              </button>
            </div>
          ) : (
            <>
              {/* Canales Directos Inmediatos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <a
                  href="https://wa.me/51908941175?text=Hola,%20deseo%20información%20y%20asesoría%20sobre%20propiedades%20en%20HouseBroker%20Perú."
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#25D366',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" />
                  </svg>
                  Chatear por WhatsApp (+51 908 941 175)
                </a>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a
                    href="tel:968614624"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    📞 Llamar: 968 614 624
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('asesores@housebroker.pe')
                      alert('Correo asesores@housebroker.pe copiado al portapapeles.')
                    }}
                    style={{
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Copiar correo al portapapeles"
                  >
                    📋 Copiar correo
                  </button>
                </div>
              </div>

              {/* Separador */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                <span style={{ padding: '0 0.75rem', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  O déjanos tus datos
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              </div>

              {/* Formulario de captura rápida */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
                    Tu nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 999 888 777"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
                    Mensaje o consulta
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--brand-gold, #e9c484)',
                    color: 'var(--brand-bronze-deep, #562B05)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Enviando solicitud...' : 'Solicitar que un asesor me contacte'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
