// =============================================================
// Pruebas de la sesión y del control de acceso en cliente
// TASK-FRONT-PROP-04: "solo el propietario o agente asignado"
// =============================================================
//
// La restricción se comprueba antes de montar el panel de disponibilidad.
// Estas pruebas fijan la respuesta a la pregunta "¿este usuario puede editar
// este inmueble?"; el `403` del backend sigue siendo la frontera real.

import {
  SESSION_USER_KEY,
  accessDeniedReason,
  assignedAgentId,
  canManageAvailability,
  clearSessionUser,
  isAdministrator,
  isAssignedAgent,
  parseSessionUser,
  readSessionUser,
  writeSessionUser,
} from './session'

const AGENT_ID = '7c4a9d21-3b6e-4f80-9a2d-5e7c1b3f8d40'
const OTHER_AGENT_ID = '11111111-2222-3333-4444-555555555555'

const property = { seller: { id: AGENT_ID, full_name: 'Yohan Nato' } }
const unassigned = { seller: undefined }
const noSeller = { seller: { id: AGENT_ID } }

const agent = { id: AGENT_ID, role: 'AGENTE' }
const otherAgent = { id: OTHER_AGENT_ID, role: 'AGENTE' }
const admin = { id: OTHER_AGENT_ID, role: 'ADMINISTRADOR' }
const client = { id: OTHER_AGENT_ID, role: 'CLIENTE' }

describe('services/session', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('parseSessionUser', () => {
    it('devuelve null sin datos o con un JSON inválido', () => {
      expect(parseSessionUser(null)).toBeNull()
      expect(parseSessionUser('no es json')).toBeNull()
      expect(parseSessionUser('[]')).toBeNull()
    })

    it('rechaza un usuario sin id o con un rol desconocido', () => {
      expect(parseSessionUser(JSON.stringify({ role: 'AGENTE' }))).toBeNull()
      expect(parseSessionUser(JSON.stringify({ id: AGENT_ID, role: 'DIRECTOR' }))).toBeNull()
    })

    it('conserva los campos opcionales que sí llegan', () => {
      expect(
        parseSessionUser(
          JSON.stringify({ id: AGENT_ID, role: 'AGENTE', full_name: 'Yohan', email: 'y@correo.pe' }),
        ),
      ).toEqual({ id: AGENT_ID, role: 'AGENTE', full_name: 'Yohan', email: 'y@correo.pe' })
    })
  })

  describe('persistencia en localStorage', () => {
    it('escribe y vuelve a leer la sesión', () => {
      writeSessionUser(agent)
      expect(readSessionUser()).toEqual(agent)
      expect(localStorage.getItem(SESSION_USER_KEY)).toBeTruthy()
    })

    it('borra la sesión', () => {
      writeSessionUser(agent)
      clearSessionUser()
      expect(readSessionUser()).toBeNull()
    })

    it('devuelve null si el almacenamiento guarda basura', () => {
      localStorage.setItem(SESSION_USER_KEY, '{roto')
      expect(readSessionUser()).toBeNull()
    })
  })

  describe('identificación del agente responsable', () => {
    it('lee el seller del inmueble', () => {
      expect(assignedAgentId(property)).toBe(AGENT_ID)
      expect(assignedAgentId(unassigned)).toBeUndefined()
    })

    it('reconoce al agente asignado y descarta a los demás', () => {
      expect(isAssignedAgent(property, agent)).toBe(true)
      expect(isAssignedAgent(property, otherAgent)).toBe(false)
      expect(isAssignedAgent(property, admin)).toBe(false)
      expect(isAssignedAgent(property, null)).toBe(false)
      expect(isAssignedAgent(unassigned, agent)).toBe(false)
    })

    it('reconoce al administrador por rol, no por asignación', () => {
      expect(isAdministrator(admin)).toBe(true)
      expect(isAdministrator(agent)).toBe(false)
    })
  })

  describe('canManageAvailability', () => {
    it('permite al agente asignado', () => {
      expect(canManageAvailability(property, agent)).toBe(true)
    })

    it('permite al administrador sobre cualquier inmueble', () => {
      expect(canManageAvailability(property, admin)).toBe(true)
      expect(canManageAvailability(unassigned, admin)).toBe(true)
    })

    it('niega a otro agente, a un cliente y a quien no tiene sesión', () => {
      expect(canManageAvailability(property, otherAgent)).toBe(false)
      expect(canManageAvailability(property, client)).toBe(false)
      expect(canManageAvailability(property, null)).toBe(false)
    })

    it('niega cuando el inmueble no tiene agente asignado', () => {
      expect(canManageAvailability(unassigned, agent)).toBe(false)
    })
  })

  describe('accessDeniedReason', () => {
    it('pide iniciar sesión cuando no hay usuario', () => {
      expect(accessDeniedReason(property, null)).toMatch(/Inicia sesión/)
    })

    it('explica que la cuenta es de cliente', () => {
      expect(accessDeniedReason(property, client)).toMatch(/cuenta es de cliente/)
    })

    it('nombra al agente responsable cuando el inmueble está asignado', () => {
      expect(accessDeniedReason(property, otherAgent)).toContain('Yohan Nato')
    })

    it('avisa que no hay agente cuando el inmueble está sin asignar', () => {
      expect(accessDeniedReason(unassigned, otherAgent)).toMatch(/no tiene agente asignado/)
    })

    it('usa el id como respaldo cuando el contrato no trae el nombre', () => {
      expect(accessDeniedReason(noSeller, otherAgent)).toContain(AGENT_ID)
    })
  })
})