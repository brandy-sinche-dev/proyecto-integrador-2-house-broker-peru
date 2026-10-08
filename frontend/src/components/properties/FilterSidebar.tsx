import { useState, useEffect, useId } from 'react'
import { formatMoney } from './money'
import type { Filters } from './filters'
import './FilterSidebar.css'

interface FilterSidebarProps {
  filters: Filters
  bounds: { min: number; max: number }
  currency?: string // Ignorado, ahora usamos draft.moneda
  onApply: (filters: Filters) => void
  onClear: () => void
}

const METRAJE: { value: Filters['metraje']; label: string; description: string }[] = [
  { value: 'small', label: '≤ 80', description: 'Hasta 80 m²' },
  { value: 'mid', label: '80–150', description: 'Entre 80 y 150 m²' },
  { value: 'large', label: '+150', description: 'Más de 150 m²' },
]

const HABITACIONES = [1, 2, 3, 4, 5]

const CARACTERISTICAS: { key: 'negociable' | 'destacado' | 'cochera'; label: string }[] = [
  { key: 'negociable', label: 'Negociable' },
  { key: 'destacado', label: 'Destacado' },
  { key: 'cochera', label: 'Con cochera' },
]

export function FilterSidebar({ filters, bounds, onApply, onClear }: FilterSidebarProps) {
  const [draft, setDraft] = useState<Filters>(filters)
  const uid = useId()

  useEffect(() => {
    setDraft(filters)
  }, [filters])

  const clampPrice = (next: Filters): Filters => ({
    ...next,
    priceMin: Math.min(next.priceMin, next.priceMax),
    priceMax: Math.max(next.priceMin, next.priceMax),
  })

  const set = (patch: Partial<Filters>) => setDraft((prev) => clampPrice({ ...prev, ...patch }))

  const minPct = ((draft.priceMin - bounds.min) / (bounds.max - bounds.min || 1)) * 100
  const maxPct = ((draft.priceMax - bounds.min) / (bounds.max - bounds.min || 1)) * 100

  // Fallback visual si no han seleccionado moneda, por defecto asumimos PEN para el texto
  const displayCurrency = draft.moneda || 'PEN'
  const currencySymbol = displayCurrency === 'USD' ? '$' : 'S/.'

  return (
    <aside className="hfs" aria-label="Filtros de búsqueda">
      <header className="hfs__head">
        <span className="hfs__head-icon" aria-hidden="true">
          <svg viewBox="0 0 18 12">
            <path d="M1 1.5h16M3.5 6h11M6.5 10.5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="hfs__title">Filtros</h2>
        <button type="button" className="hfs__clear" onClick={onClear} aria-label="Limpiar todos los filtros">
          Limpiar
        </button>
      </header>

      {/* 1. MODALIDAD Y MONEDA */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="hfs__group" style={{ flex: 1 }}>
          <div className="hfs__label">Modalidad</div>
          <div className="hfs__segmented" role="group" aria-label="Modalidad">
            {(['VENTA', 'ALQUILER'] as const).map((op) => (
              <button
                key={op}
                type="button"
                aria-pressed={draft.operacion === op}
                className={`hfs__segment ${draft.operacion === op ? 'is-active' : ''}`}
                onClick={() => set({ operacion: draft.operacion === op ? '' : op })}
              >
                {op === 'VENTA' ? 'Venta' : 'Alquiler'}
              </button>
            ))}
          </div>
        </div>

        <div className="hfs__group" style={{ flex: 1 }}>
          <div className="hfs__label">Moneda</div>
          <div className="hfs__segmented" role="group" aria-label="Moneda">
            {(['PEN', 'USD'] as const).map((mon) => (
              <button
                key={mon}
                type="button"
                aria-pressed={draft.moneda === mon}
                className={`hfs__segment ${draft.moneda === mon ? 'is-active' : ''}`}
                onClick={() => set({ moneda: draft.moneda === mon ? '' : mon })}
              >
                {mon === 'PEN' ? 'Soles' : 'Dólares'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. RANGO DE PRECIO */}
      <div className="hfs__group">
        <div className="hfs__label-row">
          <div className="hfs__label">Rango de precio ({currencySymbol})</div>
          <span className="hfs__value" aria-live="polite">
            {formatMoney(draft.priceMin, displayCurrency)} – {formatMoney(draft.priceMax, displayCurrency)}
          </span>
        </div>
        <div className="hfs__slider">
          <div className="hfs__track">
            <div className="hfs__fill" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
          </div>
          <input
            type="range"
            className="hfs__range hfs__range--min"
            min={bounds.min}
            max={bounds.max}
            step={500}
            value={draft.priceMin}
            aria-label="Precio mínimo"
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={draft.priceMin}
            aria-valuetext={formatMoney(draft.priceMin, displayCurrency)}
            onChange={(e) => set({ priceMin: Number(e.target.value) })}
          />
          <input
            type="range"
            className="hfs__range hfs__range--max"
            min={bounds.min}
            max={bounds.max}
            step={500}
            value={draft.priceMax}
            aria-label="Precio máximo"
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={draft.priceMax}
            aria-valuetext={formatMoney(draft.priceMax, displayCurrency)}
            onChange={(e) => set({ priceMax: Number(e.target.value) })}
          />
        </div>
        <div className="hfs__scale" aria-hidden="true">
          <span>{formatMoney(bounds.min, displayCurrency)}</span>
          <span>{formatMoney(bounds.max, displayCurrency)}</span>
        </div>
      </div>

      {/* 3. METRAJE */}
      <div className="hfs__group">
        <div className="hfs__label">Metraje techado (m²)</div>
        <div className="hfs__metraje" role="group" aria-label="Metraje techado">
          {METRAJE.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={draft.metraje === m.value}
              aria-label={m.description}
              className={`hfs__metraje-btn ${draft.metraje === m.value ? 'is-active' : ''}`}
              onClick={() => set({ metraje: draft.metraje === m.value ? '' : m.value })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. HABITACIONES */}
      <div className="hfs__group">
        <div className="hfs__label">Habitaciones principales</div>
        <div className="hfs__rooms" role="group" aria-label="Habitaciones principales">
          {HABITACIONES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={draft.habitaciones === n}
              aria-label={n === 5 ? '5 o más habitaciones' : `${n} ${n === 1 ? 'habitación' : 'habitaciones'}`}
              className={`hfs__room ${draft.habitaciones === n ? 'is-active' : ''}`}
              onClick={() => set({ habitaciones: draft.habitaciones === n ? null : n })}
            >
              {n === 5 ? '5+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* 5. CARACTERÍSTICAS */}
      <div className="hfs__group">
        <div className="hfs__label">Características requeridas</div>
        <ul className="hfs__checks">
          {CARACTERISTICAS.map((c) => {
            const checkboxId = `${uid}-${c.key}`
            return (
              <li key={c.key}>
                <label className="hfs__check" htmlFor={checkboxId}>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={draft[c.key]}
                    onChange={(e) => set({ [c.key]: e.target.checked } as Partial<Filters>)}
                  />
                  <span className="hfs__check-box" aria-hidden="true">
                    <svg viewBox="0 0 12 12">
                      <path d="m2.5 6.2 2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {c.label}
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <button type="button" className="hfs__apply" onClick={() => onApply(draft)}>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="m2 6 3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Aplicar filtros
      </button>
    </aside>
  )
}
