import api from './axios'
import { setAccessToken } from './authToken'
import type { SessionUser } from './session'

export interface AuthUser {
  id: string
  email?: string
  full_name?: string
  phone?: string | null
  role: SessionUser['role']
  is_active: boolean
  created_at: string
}

export interface AuthResponse {
  access: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

const login = (email: string, password: string) =>
  api
    .post<AuthResponse>('/v1/auth/login', { email, password })
    .then((r) => {
      setAccessToken(r.data.access)
      return r.data
    })

const register = (input: { email: string; password: string; full_name: string; phone?: string; role?: SessionUser['role'] }) =>
  api.post<AuthUser>('/v1/auth/register', input).then((r) => r.data)

const refresh = () =>
  api.post<AuthResponse>('/v1/auth/refresh').then((r) => {
    setAccessToken(r.data.access)
    return r.data
  })

const passwordReset = (email: string) =>
  api.post<{ detail: string }>('/v1/auth/password-reset/', { email }).then((r) => r.data)

const passwordResetConfirm = (token: string, password: string) =>
  api
    .post<{ detail: string }>('/v1/auth/password-reset-confirm/', { token, password })
    .then((r) => r.data)

const logout = () => {
  setAccessToken(null)
  api.defaults.headers.common['Authorization'] = undefined
}

export { login, register, refresh, passwordReset, passwordResetConfirm, logout }
