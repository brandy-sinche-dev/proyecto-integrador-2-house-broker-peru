import { memo } from 'react'
import type { Property, TransactionMode } from '../../services/types'
import { formatMoney } from './money'
import { FavoriteButton } from './FavoriteButton'
import './PropertyCard.css'

interface PropertyCardProps {
  property: Property
  saved: boolean
  visit: boolean
  onToggleSave: (id: string) => void
  onToggleVisit: (id: string) => void
  onOpen?: (id: string) => void
}

const TYPE_LABEL: Record<string, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

const OP_LABEL: Record<TransactionMode, string> = {
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

export const PropertyCard = memo(function PropertyCard({
  property,
  saved,
  visit,
  onToggleSave,
  onToggleVisit,
  onOpen,
}: PropertyCardProps) {
  const specs: { key: string; value: string; label: string }[] = []
  if (property.dormitorios != null) specs.push({ key: 'dorm', value: String(property.dormitorios), label: 'DORM.' })
  if (property.banos != null) specs.push({ key: 'banos', value: String(property.banos), label: 'BAÑOS' })
  if (property.area_total != null) specs.push({ key: 'area', value: String(property.area_total), label: 'M²' })
  if (property.estacionamientos != null) specs.push({ key: 'coch', value: String(property.estacionamientos), label: 'COCH.' })

  const typeLabel = TYPE_LABEL[property.property_type] ?? property.property_type

  const primaryBadge = {
    text: OP_LABEL[property.mode] ?? property.mode,
    variant: property.destacado ? 'gold' : 'bronze',
  }

  const glassBadge = property.destacado ? 'DESTACADO' : property.negociable ? 'NEGOCIABLE' : null

  const cover =
    property.images?.find((img) => img.es_principal)?.url ??
    property.images?.[0]?.url ??
    property.link_galeria

  return (
    <article className="hpc">
      <div className={`hpc__media hpc__media--${property.property_type.toLowerCase()}`}>
        {cover && (
          <img
            className="hpc__img"
            src={cover}
            alt={`Vista de ${property.title}`}
            width={640}
            height={256}
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="hpc__badges">
          <span className={`hpc__badge hpc__badge--${primaryBadge.variant}`}>{primaryBadge.text}</span>
          {glassBadge && (
            <span className="hpc__badge hpc__badge--glass">
              <IconCheck />
              {glassBadge}
            </span>
          )}
        </div>

        <FavoriteButton
          saved={saved}
          propertyTitle={property.title}
          onToggle={() => onToggleSave(property.id)}
        />

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
          <h3 className="hpc__title">
            {onOpen ? (
              <button type="button" className="hpc__title-btn" onClick={() => onOpen(property.id)}>
                {property.title}
              </button>
            ) : (
              property.title
            )}
          </h3>
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
})
