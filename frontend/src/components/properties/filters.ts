import type { TransactionMode, Moneda } from '../../services/types'

export interface Filters {
  operacion: TransactionMode | ''
  moneda: Moneda | ''
  priceMin: number
  priceMax: number
  metraje: '' | 'small' | 'mid' | 'large'
  habitaciones: number | null
  negociable: boolean
  destacado: boolean
  cochera: boolean
}

export const emptyFilters = (min: number, max: number): Filters => ({
  operacion: '',
  moneda: '',
  priceMin: min,
  priceMax: max,
  metraje: '',
  habitaciones: null,
  negociable: false,
  destacado: false,
  cochera: false,
})
