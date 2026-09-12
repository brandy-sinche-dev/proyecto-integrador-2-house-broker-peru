import { Button } from '../../components/Button'
import { StatusBadge } from '../../components/StatusBadge'
import type { Moneda, Property } from '../../services/types'
import { PROPERTY_TYPE_LABELS, TRANSACTION_MODE_LABELS } from '../../services/types'
import './PropertyCard.css'

interface PropertyCardProps {
  property: Property
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
  confirming?: boolean
  onConfirmDelete?: () => void
  onCancelDelete?: () => void
}

function formatPrice(value: number, moneda: Moneda) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(value)
}

export function PropertyCard({ property, onEdit, onDelete, confirming, onConfirmDelete, onCancelDelete }: PropertyCardProps) {
  return (
    <article className="hpc">
      <div className={`hpc__media hpc__media--${property.property_type.toLowerCase()}`}>
        <div className="hpc__media-badges">
          <span className="hpc__type-badge">{PROPERTY_TYPE_LABELS[property.property_type]}</span>
          <span className={`hpc__mode-badge hpc__mode-badge--${property.mode.toLowerCase()}`}>
            En {TRANSACTION_MODE_LABELS[property.mode].toLowerCase()}
          </span>
        </div>
        <span className="hpc__price">{formatPrice(property.price, property.moneda)}</span>
        <svg className="hpc__media-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 6 5 18h4v18a3 3 0 0 0 3 3h8V27h8v12h8a3 3 0 0 0 3-3V18h4L24 6Z" fill="currentColor" />
        </svg>
      </div>

      <div className="hpc__body">
        <div className="hpc__title-row">
          <h3 className="hpc__title">{property.title}</h3>
          <StatusBadge active={property.is_active} />
        </div>
        <p className="hpc__address">{property.address}</p>
        <div className="hpc__actions">
          {confirming ? (
            <>
              <Button size="sm" variant="neutral" onClick={onConfirmDelete} aria-label={`Confirmar eliminación de ${property.title}`}>Confirmar</Button>
              <Button size="sm" variant="ghost" onClick={onCancelDelete} aria-label="Cancelar eliminación">Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="neutral" onClick={() => onEdit(property)} aria-label={`Editar propiedad ${property.title}`}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(property)} aria-label={`Eliminar propiedad ${property.title}`}>
                Eliminar
              </Button>
            </>
          )}
        </div>
        {confirming && <p className="hpc__confirm-text">¿Eliminar esta propiedad?</p>}
      </div>
    </article>
  )
}