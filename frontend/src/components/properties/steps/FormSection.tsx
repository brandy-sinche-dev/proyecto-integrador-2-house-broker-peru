import type { ReactNode } from 'react'

interface FormSectionProps {
  step: number
  title: string
  subtitle?: string
  children: ReactNode
}

export function FormSection({ step, title, subtitle, children }: FormSectionProps) {
  return (
    <section className="hsection">
      <header className="hsection__head">
        <span className="hsection__step">{step}</span>
        <div>
          <h2 className="hsection__title">{title}</h2>
          {subtitle && <p className="hsection__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="hsection__body">{children}</div>
    </section>
  )
}