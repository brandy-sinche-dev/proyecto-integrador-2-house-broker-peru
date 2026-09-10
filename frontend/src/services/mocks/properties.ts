import type { AxiosHeaders, AxiosRequestConfig } from 'axios'
import fixtures from './data/properties'
import { PROPERTY_TYPES, TRANSACTION_MODES, type Property, type PropertyInput } from '../types'

// Persistencia simulada en memoria (vive durante toda la sesión del navegador)
let store: Property[] = fixtures.map((p) => ({ ...p }))

type Config = AxiosRequestConfig

type Reply = [number, Property | Property[] | { message: string, errors?: string[] }]

const isForceError = (header?: string | number | string[]) =>
  /^[45]\d{2}$/.test(String(header ?? ''))

const replyError = (
  status: number,
  message: string,
  errors?: string[],
): Reply => [status, { message, errors }]

const validate = (input: PropertyInput): string[] => {
  const errors: string[] = []
  if (!input.title?.trim()) errors.push('El campo "title" es obligatorio.')
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price <= 0) {
    errors.push('El campo "price" debe ser un número mayor a 0.')
  }
  if (!input.address?.trim()) errors.push('El campo "address" es obligatorio.')
  if (!PROPERTY_TYPES.includes(input.property_type)) {
    errors.push(`El campo "property_type" debe ser uno de: ${PROPERTY_TYPES.join(', ')}.`)
  }
  if (!TRANSACTION_MODES.includes(input.mode)) {
    errors.push(`El campo "mode" debe ser uno de: ${TRANSACTION_MODES.join(', ')}.`)
  }
  return errors
}

const getHeaders = (config: Config): Record<string, string> => {
  const headers = config.headers as unknown as AxiosHeaders | undefined
  if (headers?.toJSON) return headers.toJSON() as Record<string, string>
  return {}
}

const getBody = (config: Config): PropertyInput | null => {
  if (!config.data) return null
  try {
    return JSON.parse(config.data) as PropertyInput
  } catch {
    return null
  }
}

const findByIndex = (id: string) => store.findIndex((p) => p.id === id)

export const getProperties = (config: Config): Reply => {
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  return [200, store]
}

export const getProperty = (config: Config, id: string): Reply => {
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  const property = store.find((p) => p.id === id)
  if (!property) return replyError(404, `Propiedad con id "${id}" no encontrada.`)
  return [200, property]
}

export const createProperty = (config: Config): Reply => {
  const body = getBody(config)
  if (!body) return replyError(400, 'El cuerpo de la solicitud no contiene JSON válido.')
  const errors = validate(body)
  if (errors.length > 0) return replyError(400, 'Datos de entrada inválidos.', errors)
  const property: Property = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    price: body.price,
    moneda: body.moneda ?? 'PEN',
    mode: body.mode,
    address: body.address.trim(),
    property_type: body.property_type,
    is_active: true,
    created_at: new Date().toISOString(),
  }
  store = [...store, property]
  return [201, property]
}

export const updateProperty = (config: Config, id: string): Reply => {
  const index = findByIndex(id)
  if (index === -1) return replyError(404, `Propiedad con id "${id}" no encontrada.`)
  const body = getBody(config)
  if (!body) return replyError(400, 'El cuerpo de la solicitud no contiene JSON válido.')
  const errors = validate(body)
  if (errors.length > 0) return replyError(400, 'Datos de actualización inválidos.', errors)
  const updated: Property = {
    ...store[index],
    title: body.title.trim(),
    price: body.price,
    moneda: body.moneda ?? store[index].moneda,
    mode: body.mode,
    address: body.address.trim(),
    property_type: body.property_type,
  }
  store = store.map((p) => (p.id === id ? updated : p))
  return [200, updated]
}

export const deleteProperty = (config: Config, id: string): Reply => {
  const { 'x-mock-error': mockError } = getHeaders(config)
  if (isForceError(mockError)) return replyError(Number(mockError), 'Error interno del servidor')
  const index = findByIndex(id)
  if (index === -1) return replyError(404, `Propiedad con id "${id}" no encontrada.`)
  const deactivated: Property = { ...store[index], is_active: false }
  store = store.map((p) => (p.id === id ? deactivated : p))
  return [200, deactivated]
}

export const resetStore = () => {
  store = fixtures.map((p) => ({ ...p }))
}