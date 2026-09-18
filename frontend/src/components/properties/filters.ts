import type { TransactionMode } from '../../services/types'

export interface Filters {
  operacion: TransactionMode | ''
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
  priceMin: min,
  priceMax: max,
  metraje: '',
  habitaciones: null,
  negociable: false,
  destacado: false,
  cochera: false,
})
