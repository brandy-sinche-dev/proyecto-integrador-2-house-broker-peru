import api from './axios'
import type { Property } from './types'

const RESOURCE = '/v1/favorites'

interface FavoriteEntry {
  property: Property
  added_at: string
}

interface FavoritesPage {
  results?: FavoriteEntry[]
  count?: number
}

/**
 * Favoritos persistidos del usuario (HU-PROP-05). La API de `favorites` usa
 * trailing slash y devuelve una página `{ results: [...] }`, igual que el
 * resto de listas del catálogo.
 */
export const getFavorites = async (): Promise<Property[]> => {
  const { data } = await api.get<FavoritesPage>(`${RESOURCE}/`)
  return (data.results ?? []).map((f) => ({ ...f.property, is_favorite: true }))
}

export const addFavorite = (propertyId: string) =>
  api.post<FavoriteEntry>(`${RESOURCE}/`, { property_id: propertyId }).then((r) => r.data)

export const removeFavorite = (propertyId: string) => api.delete(`${RESOURCE}/${propertyId}/`)