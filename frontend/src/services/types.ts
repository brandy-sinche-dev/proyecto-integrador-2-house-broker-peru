export const PROPERTY_TYPES = ['DEPARTAMENTO', 'CASA', 'TERRENO', 'OFICINA'] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

export type Moneda = 'PEN' | 'USD'

export const TRANSACTION_MODES = ['VENTA', 'ALQUILER'] as const

export type TransactionMode = (typeof TRANSACTION_MODES)[number]

export const TRANSACTION_MODE_LABELS: Record<TransactionMode, string> = {
  VENTA: 'Venta',
  ALQUILER: 'Alquiler',
}

export interface Property {
  id: string
  title: string
  price: number
  moneda: Moneda
  mode: TransactionMode
  address: string
  property_type: PropertyType
  is_active: boolean
  created_at: string
}

export interface PropertyInput {
  title: string
  price: number
  moneda?: Moneda
  mode: TransactionMode
  address: string
  property_type: PropertyType
}