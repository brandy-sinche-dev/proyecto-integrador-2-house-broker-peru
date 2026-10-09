// =============================================================
// Pruebas unitarias del estado de filtros del catálogo
// TASK-TEST-PROP-03: Jest
// =============================================================
//
// `emptyFilters` es la fábrica que construye el estado "sin filtros"
// del panel. Es el valor contra el que el resto de la suite de
// filtros compara (URL vacía, reset, omisión de parámetros), así que
// se fija su contrato completo: los 9 campos, los tipos, la propagación
// de los bounds del catálogo y que cada llamada devuelva un objeto
// nuevo (si devolviera una referencia compartida, dos montar del hook
// se contaminarían entre sí).

import { emptyFilters } from './filters'

const CATALOG_BOUNDS = { min: 100000, max: 500000 }

describe('emptyFilters (estado inicial de los filtros)', () => {
  it('devuelve los 9 campos del contrato de filtros', () => {
    expect(Object.keys(emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)).sort()).toEqual([
      'cochera',
      'destacado',
      'habitaciones',
      'metraje',
      'moneda',
      'negociable',
      'operacion',
      'priceMax',
      'priceMin',
    ])
  })

  it('deja la modalidad, la moneda, el metraje y las habitaciones sin seleccionar', () => {
    expect(emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)).toMatchObject({
      operacion: '',
      moneda: '',
      metraje: '',
      habitaciones: null,
    })
  })

  it('deja las tres características en false', () => {
    expect(emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)).toMatchObject({
      negociable: false,
      destacado: false,
      cochera: false,
    })
  })

  it.each([
    ['catálogo con rango', 100000, 500000],
    ['catálogo vacío', 0, 1],
    ['catálogo de un solo precio', 250000, 250000],
    ['límite máximo en cero', 0, 0],
  ])('propaga los bounds del %s como rango de precio', (_label, min, max) => {
    expect(emptyFilters(min, max)).toMatchObject({ priceMin: min, priceMax: max })
  })

  it('conserva los tipos declarados en la interfaz Filters', () => {
    const filters = emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)

    expect(filters.habitaciones).toBeNull()
    expect(typeof filters.priceMin).toBe('number')
    expect(typeof filters.priceMax).toBe('number')
    expect(typeof filters.negociable).toBe('boolean')
    expect(typeof filters.destacado).toBe('boolean')
    expect(typeof filters.cochera).toBe('boolean')
    expect(typeof filters.operacion).toBe('string')
    expect(typeof filters.moneda).toBe('string')
    expect(typeof filters.metraje).toBe('string')
  })

  it('devuelve un objeto nuevo en cada llamada para no compartir estado', () => {
    const primero = emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)
    const segundo = emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max)

    expect(primero).not.toBe(segundo)
    expect(primero).toEqual(segundo)

    primero.negociable = true
    expect(segundo.negociable).toBe(false)
  })

  it('permite partir de los defaults y aplicar encima un filtro suelto', () => {
    const aplicado = { ...emptyFilters(CATALOG_BOUNDS.min, CATALOG_BOUNDS.max), operacion: 'VENTA' }

    expect(aplicado).toEqual({
      operacion: 'VENTA',
      moneda: '',
      priceMin: 100000,
      priceMax: 500000,
      metraje: '',
      habitaciones: null,
      negociable: false,
      destacado: false,
      cochera: false,
    })
  })
})