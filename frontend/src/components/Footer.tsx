import './Footer.css'

export function Footer() {
  return (
    <footer className="hft">
      <div className="hft__inner">
        <div className="hft__left">
          <span className="hft__brand">House Broker Perú</span>
          <span className="hft__note">© 2026 · Todos los derechos reservados</span>
        </div>
        <nav className="hft__links" aria-label="Enlaces legales">
          <a href="mailto:legal@housebroker.pe">Términos y condiciones</a>
          <a href="mailto:legal@housebroker.pe">Privacidad</a>
          <a href="mailto:legal@housebroker.pe">Libro de reclamaciones</a>
        </nav>
      </div>
    </footer>
  )
}
