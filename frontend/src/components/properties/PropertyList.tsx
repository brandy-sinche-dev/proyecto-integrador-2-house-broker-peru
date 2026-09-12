import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { PropertyCard } from './PropertyCard'
import { getProperties, deleteProperty } from '../../services/properties'
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES, TRANSACTION_MODE_LABELS, TRANSACTION_MODES } from '../../services/types'
import type { Property } from '../../services/types'
import './PropertyList.css'

interface PropertyListProps {
  onNew: () => void
  onEdit: (property: Property) => void
}

type Status = 'loading' | 'error' | 'ready'

export function PropertyList({ onNew, onEdit }: PropertyListProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [modeFilter, setModeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    getProperties()
      .then((data) => {
        setProperties(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err?.message ?? 'No se pudieron cargar las propiedades.')
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const reload = () => {
    setStatus('loading')
    setError(null)
    fetchData()
  }

  const handleDeleteRequest = (property: Property) => {
    setConfirmingId(property.id)
  }

  const handleConfirmDelete = () => {
    if (!confirmingId) return
    setStatus('loading')
    setError(null)
    setConfirmingId(null)
    deleteProperty(confirmingId)
      .then(reload)
      .catch((err) => {
        setError(err?.message ?? 'No se pudo eliminar la propiedad.')
        setStatus('error')
      })
  }

  const handleCancelDelete = () => {
    setConfirmingId(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return properties.filter((p) => {
      if (typeFilter && p.property_type !== typeFilter) return false
      if (modeFilter && p.mode !== modeFilter) return false
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'inactive' && p.is_active) return false
      if (
        q &&
        !(`${p.title} ${p.address} ${p.property_type}`.toLowerCase().includes(q))
      )
        return false
      return true
    })
  }, [properties, query, typeFilter, modeFilter, statusFilter])

  const hasFilters = Boolean(query.trim() || typeFilter || modeFilter || statusFilter)

  return (
    <div className="hprops">
      <div className="hprops__toolbar">
        <div className="hprops__search">
          <svg className="hprops__search-icon" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m11 11 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Buscar propiedades"
            className="hprops__search-input"
            placeholder="Buscar por título, distrito o tipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="hprops__filters">
          <select
            className="hprops__select"
            aria-label="Filtrar por tipo de propiedad"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tipo: todos</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            className="hprops__select"
            aria-label="Filtrar por modalidad de la propiedad"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="">Modalidad: todas</option>
            {TRANSACTION_MODES.map((m) => (
              <option key={m} value={m}>
                {TRANSACTION_MODE_LABELS[m]}
              </option>
            ))}
          </select>
          <select
            className="hprops__select"
            aria-label="Filtrar por estado de la propiedad"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Estado: todos</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setTypeFilter(''); setModeFilter(''); setStatusFilter('') }}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="hprops__skeleton" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="hprops__state">
          <p className="hprops__state-title">Ups, algo salió mal</p>
          <p className="hprops__state-sub">{error}</p>
          <div className="hprops__state-actions">
            <Button variant="neutral" onClick={reload}>Reintentar</Button>
          </div>
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className="hprops__state">
          <p className="hprops__state-title">{hasFilters ? 'Sin resultados' : 'Sin propiedades registradas'}</p>
          <p className="hprops__state-sub">
            {hasFilters ? 'Ajusta los filtros o intenta otra búsqueda.' : 'Agrega la primera propiedad para comenzar.'}
          </p>
          <div className="hprops__state-actions">
            {hasFilters ? (
              <Button variant="neutral" onClick={() => { setQuery(''); setTypeFilter(''); setModeFilter(''); setStatusFilter('') }}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={onNew}>Nueva propiedad</Button>
            )}
          </div>
        </div>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <>
          <p className="hprops__count">
            {filtered.length} {filtered.length === 1 ? 'propiedad' : 'propiedades'}
          </p>
          <div className="hprops__grid">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onEdit={onEdit}
                onDelete={handleDeleteRequest}
                confirming={confirmingId === p.id}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}