import heroImage from '../assets/hero.png'
import './Hero.css'

interface HeroProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function Hero({ title, subtitle, children }: HeroProps) {
  return (
    <section className="hhero">
      <span className="hhero__grain" aria-hidden="true" />
      <div className="hhero__inner">
        <div className="hhero__copy">
          <p className="hhero__eyebrow">HouseBroker Perú</p>
          <h1 className="hhero__title">{title}</h1>
          {subtitle && <p className="hhero__subtitle">{subtitle}</p>}
          {children}
          <ul className="hhero__stats">
            <li>
              <strong>+120</strong>
              <span>Inmuebles</span>
            </li>
            <li>
              <strong>4</strong>
              <span>Categorías</span>
            </li>
            <li>
              <strong>100%</strong>
              <span>Asesorado</span>
            </li>
          </ul>
        </div>

        <figure className="hhero__figure">
          <div className="hhero__frame">
            <img src={heroImage} alt="Fachada de un inmueble premium en Lima" />
          </div>
          <figcaption className="hhero__badge">
            <span className="hhero__badge-dot" aria-hidden="true" />
            Venta &amp; Alquiler
          </figcaption>
        </figure>
      </div>
    </section>
  )
}