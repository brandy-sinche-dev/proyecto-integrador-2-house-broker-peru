import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { readSessionUser, writeSessionUser, clearSessionUser } from './session'
import type { SessionUser } from './session'

interface AuthContextType {
  user: SessionUser | null
  login: (user: SessionUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const session = readSessionUser()
    if (session) {
      setUser(session)
    }
  }, [])

  const login = (sessionUser: SessionUser) => {
    setUser(sessionUser)
    writeSessionUser(sessionUser)
  }

  const logout = () => {
    setUser(null)
    clearSessionUser()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
