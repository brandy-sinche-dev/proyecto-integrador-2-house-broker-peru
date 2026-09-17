import { useCallback, useEffect, useMemo, useState } from 'react'
import { PropertyCard } from './PropertyCard'
import { FilterSidebar } from './FilterSidebar'
import { emptyFilters } from './filters'
import type { Filters } from './filters'
import { Pagination } from './Pagination'
import { getProperties } from '../../services/properties'
import { getErrorMessage } from '../../services/axios'
import { formatMoney } from './money'
import type { Property } from '../../services/types'
import type { NavTarget, Section } from '../../components/Header'
import './PropertyList.css'

interface PropertyListProps {
  mode: Section
  saved: string[]
  visits: string[]
  onToggleSave: (id: string) => void
  onToggleVisit: (id: string) => void
  onNavigate: (target: NavTarget) => void
}

type Status = 'loading' | 'error' | 'ready'
type Sort = 'recent' | 'price-asc' | 'price-desc' | 'area-desc'
type ViewMode = 'grid3' | 'grid2' | 'list'

const PAGE_SIZE = 6

const TITLES: Record<Section, string> = {
  inicio: 'Propiedades en Perú',
  guardados: 'Mis guardados',
  visitas: 'Mis visitas',
}

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'area-desc', label: 'Mayor área' },
]

const METRAJE_LABEL: Record<Filters['metraje'], string> = {
  '': '',
  small: 'Hasta 80 m²',
  mid: '80–150 m²',
  large: 'Más de 150 m²',
}

const VIEW_MODES: { value: ViewMode; label: string; path: string }[] = [
  { value: 'grid3', label: 'Cuadrícula 3 columnas', path: 'M2 2h4v4H2zM8 2h4v4H8zM14 2h4v4h-4zM2 8h4v4H2zM8 8h4v4H8zM14 8h4v4h-4z' },
  { value: 'grid2', label: 'Cuadrícula 2 columnas', path: 'M2 2h7v4H2zM11 2h7v4h-7zM2 8h7v4H2zM11 8h7v4h-7z' },
  { value: 'list', label: 'Lista', path: 'M2 3h16v3H2zM2 9h16v3H2zM2 15h16v3H2z' },
]

const areaOf = (p: Property) => p.area_construida ?? p.area_total ?? 0

function IconSearch() {
  return (
    <svg className="hsearch__icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m11 11 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2.5 4.5h13v11h-13zM2.5 8h13M6 2.5V6M12 2.5V6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg viewBox="0 0 22 22" aria-hidden="true">
      <path d="M3 3h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V15H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function PropertyList({ mode, saved, visits, onToggleSave, onToggleVisit, onNavigate }: PropertyListProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [view, setView] = useState<ViewMode>('grid3')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>(() => emptyFilters(0, 0))

  const fetchData = useCallback(() => {
    getProperties()
      .then((data) => {
        const active = data.filter((p) => p.is_active)
        setProperties(active)
        const prices = active.map((p) => p.price)
        const min = prices.length ? Math.min(...prices) : 0
        const max = prices.length ? Math.max(...prices) : 0
        setFilters(emptyFilters(min, max || 1))
        setStatus('ready')
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No se pudieron cargar las propiedades.'))
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const bounds = useMemo(() => {
    const prices = properties.map((p) => p.price)
    const min = prices.length ? Math.min(...prices) : 0
    const max = prices.length ? Math.max(...prices) : 0
    return { min, max: max || 1 }
  }, [properties])

  const reload = () => {
    setStatus('loading')
    setError(null)
    fetchData()
  }

  const clearFilters = () => {
    setQuery('')
    setFilters(emptyFilters(bounds.min, bounds.max))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = properties.filter((p) => {
      if (mode === 'guardados' && !saved.includes(p.id)) return false
      if (mode === 'visitas' && !visits.includes(p.id)) return false
      if (filters.operacion && p.operacion_type !== filters.operacion) return false
      if (p.price < filters.priceMin || p.price > filters.priceMax) return false
      if (filters.metraje) {
        const a = areaOf(p)
        if (filters.metraje === 'small' && a > 80) return false
        if (filters.metraje === 'mid' && (a <= 80 || a > 150)) return false
        if (filters.metraje === 'large' && a <= 150) return false
      }
      if (filters.habitaciones != null && (p.dormitorios ?? 0) < filters.habitaciones) return false
      if (filters.negociable && !p.negociable) return false
      if (filters.destacado && !p.destacado) return false
      if (filters.cochera && !(p.estacionamientos && p.estacionamientos > 0)) return false
      if (q && !`${p.title} ${p.address} ${p.property_type}`.toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'area-desc') sorted.sort((a, b) => areaOf(b) - areaOf(a))
    else sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return sorted
  }, [properties, query, sort, mode, saved, visits, filters])

  const resetKey = `${mode}\u0000${query}\u0000${sort}\u0000${JSON.stringify(filters)}`
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (mode !== 'inicio')
    chips.push({ key: 'mode', label: mode === 'guardados' ? 'Solo guardados' : 'Solo mis visitas', onRemove: () => onNavigate('inicio') })
  if (query.trim()) chips.push({ key: 'q', label: `“${query.trim()}”`, onRemove: () => setQuery('') })
  if (filters.operacion)
    chips.push({
      key: 'op',
      label: filters.operacion === 'VENTA' ? 'Venta' : 'Alquiler',
      onRemove: () => setFilters((f) => ({ ...f, operacion: '' })),
    })
  if (filters.priceMin !== bounds.min || filters.priceMax !== bounds.max)
    chips.push({
      key: 'price',
      label: `${formatMoney(filters.priceMin)} – ${formatMoney(filters.priceMax)}`,
      onRemove: () => setFilters((f) => ({ ...f, priceMin: bounds.min, priceMax: bounds.max })),
    })
  if (filters.metraje)
    chips.push({ key: 'm2', label: METRAJE_LABEL[filters.metraje], onRemove: () => setFilters((f) => ({ ...f, metraje: '' })) })
  if (filters.habitaciones != null)
    chips.push({
      key: 'rooms',
      label: `${filters.habitaciones}+ habitaciones`,
      onRemove: () => setFilters((f) => ({ ...f, habitaciones: null })),
    })
  if (filters.negociable) chips.push({ key: 'neg', label: 'Negociable', onRemove: () => setFilters((f) => ({ ...f, negociable: false })) })
  if (filters.destacado) chips.push({ key: 'dest', label: 'Destacado', onRemove: () => setFilters((f) => ({ ...f, destacado: false })) })
  if (filters.cochera) chips.push({ key: 'coch', label: 'Con cochera', onRemove: () => setFilters((f) => ({ ...f, cochera: false })) })

  const hasFilters = chips.length > 0

  const emptyTitle =
    mode === 'guardados' ? 'Aún no guardaste propiedades' : mode === 'visitas' ? 'No tienes visitas agendadas' : hasFilters ? 'Sin resultados' : 'Sin propiedades disponibles'
  const emptySub =
    mode === 'guardados'
      ? 'Toca el corazón de un inmueble para verlo aquí.'
      : mode === 'visitas'
        ? 'Agenda una visita desde cualquier ficha y aparecerá aquí.'
        : hasFilters
          ? 'Ajusta los filtros o intenta otra búsqueda.'
          : 'Vuelve pronto, estamos actualizando el catálogo.'

  return (
    <>
      <section className="hsearch" aria-label="Búsqueda de propiedades">
        <div className="hsearch__inner">
          <form className="hsearch__row" onSubmit={(e) => e.preventDefault()} role="search">
            <div className="hsearch__bar">
              <IconSearch />
              <input
                type="search"
                className="hsearch__input"
                aria-label="Buscar propiedades"
                placeholder="San Isidro & Miraflores, Lima"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="hsearch__submit">
                Buscar
              </button>
            </div>

            <div className="hsearch__actions">
              <button type="button" className="hsearch__saved" onClick={() => onNavigate('visitas')}>
                <IconCalendar />
                <span>Visitas</span>
                <span className="hsearch__badge">{visits.length}</span>
              </button>
              <button type="button" className="hsearch__publish" onClick={() => onNavigate('concierge')}>
                <IconChat />
                <span>Concierge IA</span>
              </button>
            </div>
          </form>

          <div className="hsearch__chips">
            {chips.map((c) => (
              <span key={c.key} className="hsearch__chip">
                {c.label}
                <button type="button" className="hsearch__chip-x" onClick={c.onRemove} aria-label={`Quitar filtro ${c.label}`}>
                  <svg viewBox="0 0 10 10" aria-hidden="true">
                    <path d="m2 2 6 6M8 2 2 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
            {hasFilters && (
              <button type="button" className="hsearch__clear" onClick={clearFilters}>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="hmain">
        {status === 'loading' && (
          <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hprops__skeleton" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="hprops__state">
            <span className="hprops__state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="hprops__state-title">Ups, algo salió mal</p>
            <p className="hprops__state-sub">{error}</p>
            <div className="hprops__state-actions">
              <button type="button" className="hprops__retry" onClick={reload}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="hprops__control">
              <div className="hprops__heading">
                <span className="hprops__accent" aria-hidden="true" />
                <div>
                  <h1 className="hprops__title">{TITLES[mode]}</h1>
                  <p className="hprops__subtitle">
                    {filtered.length} {filtered.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
                  </p>
                </div>
              </div>

              <div className="hprops__controls">
                <label className="hprops__sort">
                  <svg viewBox="0 0 14 10" aria-hidden="true">
                    <path d="M1 1.5h12M3 5h8M5 8.5h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="hprops__sort-label">Ordenar por</span>
                  <select
                    className="hprops__sort-select"
                    aria-label="Ordenar propiedades"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="hprops__views" role="group" aria-label="Vista">
                  {VIEW_MODES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      className={`hprops__view ${view === v.value ? 'is-active' : ''}`}
                      aria-pressed={view === v.value}
                      aria-label={v.label}
                      onClick={() => setView(v.value)}
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d={v.path} fill="currentColor" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hprops__layout">
              <FilterSidebar
                filters={filters}
                bounds={bounds}
                currency="S/."
                onApply={setFilters}
                onClear={() => setFilters(emptyFilters(bounds.min, bounds.max))}
              />

              <div className="hprops__results">
                {filtered.length === 0 ? (
                  <div className="hprops__state">
                    <span className="hprops__state-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <path d="M9.5 21v-6h5v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="hprops__state-title">{emptyTitle}</p>
                    <p className="hprops__state-sub">{emptySub}</p>
                    <div className="hprops__state-actions">
                      {hasFilters ? (
                        <button type="button" className="hprops__retry" onClick={clearFilters}>
                          Limpiar filtros
                        </button>
                      ) : (
                        <button type="button" className="hprops__retry" onClick={() => onNavigate('inicio')}>
                          Ver propiedades
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`hprops__grid hprops__grid--${view}`}>
                      {paginated.map((p) => (
                        <PropertyCard
                          key={p.id}
                          property={p}
                          saved={saved.includes(p.id)}
                          visit={visits.includes(p.id)}
                          onToggleSave={onToggleSave}
                          onToggleVisit={onToggleVisit}
                        />
                      ))}
                    </div>
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={filtered.length}
                      pageSize={PAGE_SIZE}
                      onChange={setPage}
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
