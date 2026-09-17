import type { Property } from '../../services/types'
import { formatMoney } from './money'
import './PropertyCard.css'

interface PropertyCardProps {
  property: Property
  saved: boolean
  visit: boolean
  onToggleSave: (id: string) => void
  onToggleVisit: (id: string) => void
}

const TYPE_LABEL: Record<string, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

const OP_LABEL: Record<string, string> = {
  VENTA: 'En venta',
  ALQUILER: 'En alquiler',
}

function IconPin() {
  return (
    <svg className="hpc__pin" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.2A1.7 1.7 0 1 1 8 4.3a1.7 1.7 0 0 1 0 3.4Z" fill="currentColor" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="m2.5 7.2 3 3 6-6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 20 18" aria-hidden="true">
      <path d="M10 16.4S2.6 11.8 2.6 6.9A3.8 3.8 0 0 1 10 4.5a3.8 3.8 0 0 1 7.4 2.4c0 4.9-7.4 9.5-7.4 9.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 2h2.2l1 2.4-1.3 1a8 8 0 0 0 3.7 3.7l1-1.3L12 8.8V11a1 1 0 0 1-1.1 1A9.5 9.5 0 0 1 2 3.1 1 1 0 0 1 3 2Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 3.5h10v9H2zM2 6h10M4.5 2v2.5M9.5 2v2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PropertyCard({ property, saved, visit, onToggleSave, onToggleVisit }: PropertyCardProps) {
  const specs: { key: string; value: string; label: string }[] = []
  if (property.dormitorios != null) specs.push({ key: 'dorm', value: String(property.dormitorios), label: 'DORM.' })
  if (property.banos != null) specs.push({ key: 'banos', value: String(property.banos), label: 'BAÑOS' })
  if (property.area_total != null) specs.push({ key: 'area', value: String(property.area_total), label: 'M²' })
  if (property.estacionamientos != null) specs.push({ key: 'coch', value: String(property.estacionamientos), label: 'COCH.' })

  const typeLabel = TYPE_LABEL[property.property_type] ?? property.property_type

  let primaryBadge: { text: string; variant: string }
  if (property.operacion_type) {
    primaryBadge = {
      text: OP_LABEL[property.operacion_type] ?? property.operacion_type,
      variant: property.destacado ? 'gold' : 'bronze',
    }
  } else primaryBadge = { text: typeLabel, variant: 'muted' }

  const glassBadge = property.destacado ? 'DESTACADO' : property.negociable ? 'NEGOCIABLE' : null

  return (
    <article className="hpc">
      <div className={`hpc__media hpc__media--${property.property_type.toLowerCase()}`}>
        <div className="hpc__badges">
          <span className={`hpc__badge hpc__badge--${primaryBadge.variant}`}>{primaryBadge.text}</span>
          {glassBadge && (
            <span className="hpc__badge hpc__badge--glass">
              <IconCheck />
              {glassBadge}
            </span>
          )}
        </div>

        <button
          type="button"
          className={`hpc__icon-btn ${saved ? 'is-saved' : ''}`}
          onClick={() => onToggleSave(property.id)}
          aria-pressed={saved}
          aria-label={saved ? `Quitar ${property.title} de guardados` : `Guardar ${property.title}`}
        >
          <IconHeart />
        </button>

        <span className="hpc__overlay">{typeLabel.toUpperCase()}</span>
      </div>

      <div className="hpc__body">
        <div className="hpc__main">
          <p className="hpc__price">{formatMoney(property.price, property.moneda)}</p>
          {property.mantenimiento != null && (
            <p className="hpc__maint">
              Mantenimiento: {formatMoney(property.mantenimiento, property.moneda)} / mes
            </p>
          )}
          <h3 className="hpc__title">{property.title}</h3>
          <p className="hpc__address">
            <IconPin />
            {property.address}
          </p>
        </div>

        {specs.length > 0 && (
          <ul className="hpc__specs" aria-label="Características de la propiedad">
            {specs.map((s) => (
              <li key={s.key} className="hpc__spec">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="hpc__actions">
          <button
            type="button"
            className={`hpc__cta hpc__cta--ghost ${visit ? 'is-on' : ''}`}
            aria-pressed={visit}
            onClick={() => onToggleVisit(property.id)}
          >
            <IconCalendar />
            {visit ? 'Visita agendada' : 'Agendar visita'}
          </button>
          <a className="hpc__cta hpc__cta--primary" href="mailto:asesores@housebroker.pe">
            <IconPhone />
            Contactar
          </a>
        </div>
      </div>
    </article>
  )
}
