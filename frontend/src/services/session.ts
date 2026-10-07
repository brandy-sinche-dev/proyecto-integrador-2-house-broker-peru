// =============================================================
// Sesión del cliente y control de acceso a la edición
// TASK-FRONT-PROP-04: restricción en cliente del panel de
// disponibilidad (RF-PROP-04 / "solo el propietario o agente
// asignado" de los criterios de aceptación)
// =============================================================
//
// El panel de disponibilidad solo puede abrirlo quien tiene autoridad
// comercial sobre el inmueble: el agente al que está asignado o un
// administrador.
//
// Este archivo decide esa pregunta en el cliente para que la vista no se
// monte nunca sin permiso. No es una frontera de seguridad: el backend
// responde `403` igual (TASK-TEST-PROP-04 cubre ambos lados). Es la capa que
// evita que un agente vea botones que van a fallar.

import type { Property, Seller } from './types'

export const USER_ROLES = ['CLIENTE', 'AGENTE', 'ADMINISTRADOR'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CLIENTE: 'Cliente Público',
  AGENTE: 'Agente Inmobiliario',
  ADMINISTRADOR: 'Administrador',
}

export interface SessionUser {
  id: string
  email?: string
  full_name?: string
  role: UserRole
}

/** Clave donde `TASK-FRONT-SEC-01` depositará el usuario autenticado. */
export const SESSION_USER_KEY = 'hb_user'

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)

export function parseSessionUser(raw: string | null): SessionUser | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const user = parsed as Partial<SessionUser>
    if (typeof user.id !== 'string' || user.id === '') return null
    if (!isUserRole(user.role)) return null
    return {
      id: user.id,
      role: user.role,
      email: typeof user.email === 'string' ? user.email : undefined,
      full_name: typeof user.full_name === 'string' ? user.full_name : undefined,
    }
  } catch {
    return null
  }
}

export function readSessionUser(): SessionUser | null {
  try {
    return parseSessionUser(localStorage.getItem(SESSION_USER_KEY))
  } catch {
    return null
  }
}

export function writeSessionUser(user: SessionUser): void {
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
  } catch {
    // Sin `localStorage` (modo privado, SSR de pruebas) la sesión no persiste,
    // pero la vista actual sigue funcionando con el usuario en memoria.
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem(SESSION_USER_KEY)
  } catch {
    // Ignorado por la misma razón que en `writeSessionUser`.
  }
}

/** Agente responsable del inmueble, si el contrato lo trajo. */
export const assignedAgentId = (property: Pick<Property, 'seller'>): string | undefined =>
  (property.seller as Seller | undefined)?.id

export function isAssignedAgent(property: Pick<Property, 'seller'>, user: SessionUser | null): boolean {
  const sellerId = assignedAgentId(property)
  if (!sellerId || !user) return false
  return user.role === 'AGENTE' && user.id === sellerId
}

export function isAdministrator(user: SessionUser | null): boolean {
  return user?.role === 'ADMINISTRADOR'
}

/** ¿Puede este usuario abrir el panel de disponibilidad de este inmueble? */
export function canManageAvailability(
  property: Pick<Property, 'seller'>,
  user: SessionUser | null,
): boolean {
  if (!user) return false
  if (isAdministrator(user)) return true
  return isAssignedAgent(property, user)
}

/** Motivo del rechazo, para explicarle al usuario por qué ve la vista en solo lectura. */
export function accessDeniedReason(
  property: Pick<Property, 'seller'>,
  user: SessionUser | null,
): string {
  if (!user) {
    return 'Inicia sesión con una cuenta de agente para gestionar la disponibilidad de tus inmuebles.'
  }
  if (user.role === 'CLIENTE') {
    return 'Tu cuenta es de cliente. Solo los agentes asignados y los administradores gestionan la disponibilidad.'
  }
  const assigned = property.seller?.full_name ?? assignedAgentId(property)
  return assigned
    ? `Este inmueble está asignado a ${assigned}. Pide al administrador que lo reasigne a tu cartera para gestionarlo.`
    : 'Este inmueble no tiene agente asignado. Pide al administrador que lo registre en tu cartera para gestionarlo.'
}