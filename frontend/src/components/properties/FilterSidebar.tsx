import { useState } from 'react'
import { formatMoney } from './money'
import type { Filters } from './filters'
import './FilterSidebar.css'

interface FilterSidebarProps {
  filters: Filters
  bounds: { min: number; max: number }
  currency: string
  onApply: (filters: Filters) => void
  onClear: () => void
}

const METRAJE: { value: Filters['metraje']; label: string }[] = [
  { value: 'small', label: '≤ 80' },
  { value: 'mid', label: '80–150' },
  { value: 'large', label: '+150' },
]

const HABITACIONES = [1, 2, 3, 4, 5]

const CARACTERISTICAS: { key: 'negociable' | 'destacado' | 'cochera'; label: string }[] = [
  { key: 'negociable', label: 'Negociable' },
  { key: 'destacado', label: 'Destacado' },
  { key: 'cochera', label: 'Con cochera' },
]

export function FilterSidebar({ filters, bounds, currency, onApply, onClear }: FilterSidebarProps) {
  const [draft, setDraft] = useState<Filters>(filters)
  const [applied, setApplied] = useState<Filters>(filters)

  if (applied !== filters) {
    setApplied(filters)
    setDraft(filters)
  }

  const clampPrice = (next: Filters): Filters => ({
    ...next,
    priceMin: Math.min(next.priceMin, next.priceMax),
    priceMax: Math.max(next.priceMin, next.priceMax),
  })

  const set = (patch: Partial<Filters>) => setDraft((prev) => clampPrice({ ...prev, ...patch }))

  const minPct = ((draft.priceMin - bounds.min) / (bounds.max - bounds.min || 1)) * 100
  const maxPct = ((draft.priceMax - bounds.min) / (bounds.max - bounds.min || 1)) * 100

  return (
    <aside className="hfs" aria-label="Filtros de búsqueda">
      <header className="hfs__head">
        <span className="hfs__head-icon" aria-hidden="true">
          <svg viewBox="0 0 18 12">
            <path d="M1 1.5h16M3.5 6h11M6.5 10.5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="hfs__title">Filtros</h2>
        <button type="button" className="hfs__clear" onClick={onClear}>
          Limpiar
        </button>
      </header>

      <section className="hfs__group">
        <h3 className="hfs__label">Modalidad</h3>
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
      </section>

      <section className="hfs__group">
        <div className="hfs__label-row">
          <h3 className="hfs__label">Rango de precio ({currency})</h3>
          <span className="hfs__value">
            {formatMoney(draft.priceMin, currency)} – {formatMoney(draft.priceMax, currency)}
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
            onChange={(e) => set({ priceMax: Number(e.target.value) })}
          />
        </div>
        <div className="hfs__scale">
          <span>{formatMoney(bounds.min, currency)}</span>
          <span>{formatMoney(bounds.max, currency)}</span>
        </div>
      </section>

      <section className="hfs__group">
        <h3 className="hfs__label">Metraje techado (m²)</h3>
        <div className="hfs__metraje">
          {METRAJE.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={draft.metraje === m.value}
              className={`hfs__metraje-btn ${draft.metraje === m.value ? 'is-active' : ''}`}
              onClick={() => set({ metraje: draft.metraje === m.value ? '' : m.value })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="hfs__group">
        <h3 className="hfs__label">Habitaciones principales</h3>
        <div className="hfs__rooms">
          {HABITACIONES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={draft.habitaciones === n}
              className={`hfs__room ${draft.habitaciones === n ? 'is-active' : ''}`}
              onClick={() => set({ habitaciones: draft.habitaciones === n ? null : n })}
            >
              {n === 5 ? '5+' : n}
            </button>
          ))}
        </div>
      </section>

      <section className="hfs__group">
        <h3 className="hfs__label">Características requeridas</h3>
        <ul className="hfs__checks">
          {CARACTERISTICAS.map((c) => (
            <li key={c.key}>
              <label className="hfs__check">
                <input
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
          ))}
        </ul>
      </section>

      <button type="button" className="hfs__apply" onClick={() => onApply(draft)}>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="m2 6 3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Aplicar filtros
      </button>
    </aside>
  )
}
