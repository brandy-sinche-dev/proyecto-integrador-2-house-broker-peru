import api from './axios'
import type { Property, PropertyInput } from './types'

const RESOURCE = '/v1/properties'

interface PaginatedResponse<T> {
  results?: T[]
  next?: string | null
  previous?: string | null
  count?: number
}

/**
 * El backend usa PageNumberPagination (PAGE_SIZE=10), por lo que responde
 * `{ results: [...] }`. Este helper acepta tanto esa forma como un array
 * plano para mantener compatibilidad durante la migración.
 */
function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

export const getProperties = async () => unwrapList(await api.get<Property[] | PaginatedResponse<Property>>(RESOURCE).then((r) => r.data))

export const getProperty = (id: string) =>
  api.get<Property>(`${RESOURCE}/${id}`).then((r) => r.data)

export const createProperty = (input: PropertyInput) =>
  api.post<Property>(RESOURCE, input).then((r) => r.data)

export const updateProperty = (id: string, input: PropertyInput) =>
  api.put<Property>(`${RESOURCE}/${id}`, input).then((r) => r.data)

export const deleteProperty = (id: string) =>
  api.delete<Property>(`${RESOURCE}/${id}`).then((r) => r.data)