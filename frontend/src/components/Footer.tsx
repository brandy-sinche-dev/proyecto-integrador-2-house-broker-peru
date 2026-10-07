import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          {/* Col 1: Logo */}
          <div className="footer__col footer__col--brand">
            <img src="/logo.png" alt="House Broker Perú Logo" className="footer__logo" />
          </div>

          {/* Col 2: Contáctanos */}
          <div className="footer__col">
            <h4 className="footer__title">Contáctanos</h4>
            
            <div className="footer__contact-item">
              {/* Teléfono fijo / normal */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <a href="tel:968614624" className="footer__link" style={{ margin: 0 }}>968 614 624</a>
            </div>

            <div className="footer__contact-item">
              {/* WhatsApp */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <a href="https://wa.me/51908941175" target="_blank" rel="noreferrer" className="footer__link" style={{ margin: 0 }}>+51 908 941 175</a>
            </div>

            <div className="footer__contact-item">
              {/* Correo */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <a href="mailto:info@housebrokerperu.com" className="footer__link" style={{ margin: 0 }}>info@housebrokerperu.com</a>
            </div>
          </div>

          {/* Col 3: Invierte */}
          <div className="footer__col">
            <h4 className="footer__title">Invierte con nosotros</h4>
            <a href="#" className="footer__link">Vender tu inmueble</a>
            <a href="#" className="footer__link">Quiero ser inversionista</a>
          </div>

          {/* Col 4: Partners / Respaldo */}
          <div className="footer__col footer__col--partners">
            <div className="footer__partner">
              <h4 className="footer__partner-title" style={{ fontSize: '1.25rem', fontFamily: 'serif' }}>CoDIP</h4>
              <span className="footer__partner-desc">Confederación de Desarrolladores Inmobiliarios del Perú</span>
            </div>
            <div className="footer__partner" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--brand-cream)', padding: '0.25rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>
                <strong style={{ fontSize: '1.25rem' }}>DCI</strong>
                <span style={{ fontSize: '0.6rem', lineHeight: 1 }}>DEFENSORÍA<br/>DEL CLIENTE<br/>INMOBILIARIO</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer__divider"></div>

        <div className="footer__bottom">
          <div className="footer__legal-links">
            <a href="#" className="footer__legal-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Libro de Reclamaciones
            </a>
            <a href="#" className="footer__legal-link">Políticas de cookies</a>
            <a href="#" className="footer__legal-link">Políticas de privacidad</a>
            <a href="#" className="footer__legal-link">Términos y condiciones</a>
          </div>
          
          <div className="footer__socials">
            {/* Facebook */}
            <a href="#" className="footer__social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            {/* Youtube */}
            <a href="#" className="footer__social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
            {/* Instagram */}
            <a href="#" className="footer__social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            {/* Linkedin */}
            <a href="#" className="footer__social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
