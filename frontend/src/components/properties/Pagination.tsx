import './Pagination.css'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

function buildPages(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const withGaps: (number | '…')[] = []
  list.forEach((p, i) => {
    if (i > 0 && p - (list[i - 1] as number) > 1) withGaps.push('…')
    withGaps.push(p)
  })
  return withGaps
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav className="hpg" aria-label="Paginación">
      <p className="hpg__summary">
        Mostrando {start}–{end} de {total} {total === 1 ? 'propiedad' : 'propiedades'}
      </p>
      <div className="hpg__controls">
        <button
          type="button"
          className="hpg__btn hpg__btn--nav"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {buildPages(page, totalPages).map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} className="hpg__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`hpg__btn ${item === page ? 'is-active' : ''}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="hpg__btn hpg__btn--nav"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
