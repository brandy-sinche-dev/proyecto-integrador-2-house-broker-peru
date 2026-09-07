export const PROPERTY_TYPES = ['DEPARTAMENTO', 'CASA', 'TERRENO', 'OFICINA'] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

export interface Property {
  id: string
  title: string
  price: number
  address: string
  property_type: PropertyType
  is_active: boolean
  created_at: string
}

export interface PropertyInput {
  title: string
  price: number
  address: string
  property_type: PropertyType
}