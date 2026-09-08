import './Hero.css'

interface HeroProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function Hero({ title, subtitle, children }: HeroProps) {
  return (
    <section className="hhero">
      <div className="hhero__inner">
        <p className="hhero__eyebrow">HouseBroker Perú</p>
        <h1 className="hhero__title">{title}</h1>
        {subtitle && <p className="hhero__subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}