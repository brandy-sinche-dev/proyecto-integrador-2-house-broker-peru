import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, logout, refresh, register } from '../services/auth'
import { clearSessionUser, writeSessionUser, type SessionUser } from '../services/session'

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const persist = useCallback((next: SessionUser | null) => {
    setUser(next)
    if (next) writeSessionUser(next)
    else clearSessionUser()
  }, [])

  const syncUser = useCallback(
    (u: { id: string; email?: string; full_name?: string; role: SessionUser['role'] }) => {
      persist({ id: u.id, email: u.email, full_name: u.full_name, role: u.role })
    },
    [persist],
  )

  useEffect(() => {
    refresh()
      .then((data) => syncUser(data.user))
      .catch(() => persist(null))
      .finally(() => setLoading(false))
  }, [persist, syncUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await login(email, password)
    syncUser(data.user)
  }, [syncUser])

  const signUp = useCallback(async (input: { email: string; password: string; full_name: string; phone?: string }) => {
    await register({ ...input, role: 'CLIENTE' })
  }, [])

  const signOut = useCallback(() => {
    logout()
    persist(null)
    navigate('/')
  }, [navigate, persist])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
