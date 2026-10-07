import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from './session'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Si no está logueado, redirigir al login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Si está logueado pero no tiene el rol, redirigir según su rol
    if (user.role === 'ADMINISTRADOR') return <Navigate to="/admin" replace />
    if (user.role === 'AGENTE') return <Navigate to="/agente" replace />
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
