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

/**
 * Estado operativo del inmueble (RF-PROP-04, tag `Disponibilidad` del contrato).
 * Es distinto de `is_active`: `is_active` decide la visibilidad en el catálogo,
 * mientras `status` describe la etapa comercial.
 */
export const PROPERTY_STATUSES = ['DISPONIBLE', 'RESERVADO', 'ALQUILADO', 'VENDIDO', 'SUSPENDIDO'] as const

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number]

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  ALQUILADO: 'Alquilado',
  VENDIDO: 'Vendido',
  SUSPENDIDO: 'Suspendido',
}

/** Consecuencia de cada estado sobre el catálogo y el agendamiento. */
export const PROPERTY_STATUS_HINTS: Record<PropertyStatus, string> = {
  DISPONIBLE: 'Visible en el catálogo y acepta visitas.',
  RESERVADO: 'Visible en el catálogo, sin aceptar nuevas visitas.',
  ALQUILADO: 'Visible en el catálogo, sin aceptar nuevas visitas.',
  VENDIDO: 'Visible en el catálogo, sin aceptar nuevas visitas.',
  SUSPENDIDO: 'Se retira del catálogo y deja de aceptar visitas.',
}

/** Días de la semana en el orden que devuelve el contrato (lunes a domingo). */
export const WEEKDAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const

export type Weekday = (typeof WEEKDAYS)[number]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
}

/** Franja en formato `HH:MM` de 24 horas, con intervalo semiabierto `[start, end)`. */
export interface TimeSlotInput {
  start_time: string
  end_time: string
}

export interface ScheduleSlot extends TimeSlotInput {
  id: string
  is_active: boolean
}

export interface WeekdaySchedule {
  weekday: Weekday
  slots: ScheduleSlot[]
}

export interface WeekdayScheduleInput {
  weekday: Weekday
  slots: TimeSlotInput[]
}

export interface PropertySchedules {
  property_id: string
  timezone: string
  total_slots: number
  days: WeekdaySchedule[]
}

export interface PropertySchedulesInput {
  days: WeekdayScheduleInput[]
}

export interface PropertyStatusInput {
  status: PropertyStatus
  reason?: string
}

export interface PropertyStatusResult {
  id: string
  status: PropertyStatus
  previous_status: PropertyStatus
  is_active: boolean
  reason?: string | null
  changed_by: string
  changed_at: string
}

/** Agente responsable del inmueble, tal como lo expone `seller`. */
export interface Seller {
  id: string
  full_name?: string
  email?: string
  phone?: string
}

export interface PropertyImage {
  id?: string
  url: string
  es_principal?: boolean
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
  area_total?: number
  area_construida?: number
  dormitorios?: number
  banos?: number
  estacionamientos?: number
  link_galeria?: string
  link_planos?: string
  images?: PropertyImage[]
  negociable?: boolean
  destacado?: boolean
  mantenimiento?: number
  status?: PropertyStatus
  seller?: Seller
}

export interface PropertyInput {
  title: string
  price: number
  moneda?: Moneda
  mode: TransactionMode
  address: string
  property_type: PropertyType
  area_total?: number
  area_construida?: number
  dormitorios?: number
  banos?: number
  estacionamientos?: number
  link_galeria?: string
  link_planos?: string
  negociable?: boolean
  destacado?: boolean
  mantenimiento?: number
}
