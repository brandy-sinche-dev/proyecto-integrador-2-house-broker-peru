import { Button } from '../../components/Button'
import { StatusBadge } from '../../components/StatusBadge'
import type { Property } from '../../services/types'
import './PropertyCard.css'

interface PropertyCardProps {
  property: Property
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
}

const TYPE_LABEL: Record<string, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value)
}

export function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  return (
    <article className="hpc">
      <div className={`hpc__media hpc__media--${property.property_type.toLowerCase()}`}>
        <span className="hpc__type-badge">{TYPE_LABEL[property.property_type] ?? property.property_type}</span>
        <span className="hpc__price">{formatPrice(property.price)}</span>
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
          <Button size="sm" variant="neutral" onClick={() => onEdit(property)}>
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(property)}>
            Eliminar
          </Button>
        </div>
      </div>
    </article>
  )
}