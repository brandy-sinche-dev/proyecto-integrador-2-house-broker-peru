import api from './axios'
import type { Property, PropertyInput } from './types'

const RESOURCE = '/v1/properties'

export const getProperties = () => api.get<Property[]>(RESOURCE).then((r) => r.data)

export const getProperty = (id: string) =>
  api.get<Property>(`${RESOURCE}/${id}`).then((r) => r.data)

export const createProperty = (input: PropertyInput) =>
  api.post<Property>(RESOURCE, input).then((r) => r.data)

export const updateProperty = (id: string, input: PropertyInput) =>
  api.put<Property>(`${RESOURCE}/${id}`, input).then((r) => r.data)

export const deleteProperty = (id: string) =>
  api.delete<Property>(`${RESOURCE}/${id}`).then((r) => r.data)