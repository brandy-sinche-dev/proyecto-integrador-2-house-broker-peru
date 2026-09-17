import axios, { type AxiosError } from 'axios'
import type { NormalizedApiError } from './errors'

export { getErrorMessage } from './errors'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Adjunta el token de sesión cuando exista (login futuro) y un header
 * extra para que el backend pueda distinguir peticiones AJAX.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hb_token')
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

/**
 * Normaliza los errores de la API a un mensaje legible en `error.userMessage`,
 * de modo que la UI no dependa del mensaje crudo de Axios. Soporta el formato
 * estándar de DRF (`detail`, `message`, errores por campo) y objetos simples.
 */

function extractServerMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const record = data as Record<string, unknown>
  if (typeof record.detail === 'string') return record.detail
  if (typeof record.message === 'string') return record.message
  if (typeof record.error === 'string') return record.error
  if (record.errors && Array.isArray(record.errors) && typeof record.errors[0] === 'string') {
    return record.errors.join(' · ')
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value.join(' · ')
    }
  }
  return undefined
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const serverMessage = extractServerMessage(error.response?.data)
    const normalized = error as AxiosError & NormalizedApiError
    normalized.status = status
    normalized.userMessage =
      serverMessage ?? (status ? `Error ${status} al comunicarse con el servidor.` : undefined)
    return Promise.reject(normalized)
  },
)

export default api