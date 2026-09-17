export const PROPERTY_TYPES = ['DEPARTAMENTO', 'CASA', 'TERRENO', 'OFICINA'] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const OPERATION_TYPES = ['VENTA', 'ALQUILER'] as const

export type OperationType = (typeof OPERATION_TYPES)[number]

export const CURRENCIES = ['PEN', 'USD'] as const

export type Currency = (typeof CURRENCIES)[number]

export interface Property {
  id: string
  title: string
  price: number
  address: string
  property_type: PropertyType
  is_active: boolean
  created_at: string
  operacion_type?: OperationType
  area_total?: number
  area_construida?: number
  dormitorios?: number
  banos?: number
  estacionamientos?: number
  link_galeria?: string
  link_planos?: string
  moneda?: Currency
  negociable?: boolean
  destacado?: boolean
  mantenimiento?: number
}

export interface PropertyInput {
  title: string
  price: number
  address: string
  property_type: PropertyType
  operacion_type?: OperationType
  area_total?: number
  area_construida?: number
  dormitorios?: number
  banos?: number
  estacionamientos?: number
  link_galeria?: string
  link_planos?: string
  moneda?: Currency
  negociable?: boolean
  destacado?: boolean
  mantenimiento?: number
}