import MockAdapter from 'axios-mock-adapter'
import api from '../axios'
import { SESSION_USER_KEY, type SessionUser } from '../session'
import {
  createProperty,
  deleteProperty,
  getProperties,
  getProperty,
  getManagedProperty,
  updateProperty,
} from './properties'
import {
  getPropertySchedulesInMock,
  patchPropertyStatusInMock,
  replacePropertySchedulesInMock,
} from './availability'
import { MOCK_SELLER } from './data/properties'

// Rutas del contrato definido en TASK-ARC-PROP-01 (openapi_spec.yaml)
const PROPERTIES_PATH = '/v1/properties'
const PROPERTY_DETAIL_PATH = /^\/v1\/properties\/[^/]+$/
const PROPERTY_STATUS_PATH = /^\/v1\/properties\/[^/]+\/status$/
const PROPERTY_SCHEDULES_PATH = /^\/v1\/properties\/[^/]+\/schedules$/
const PROPERTY_MANAGEMENT_PATH = /^\/v1\/properties\/[^/]+\/management$/

const idFrom = (config: { url?: string }) => (config.url ?? '').split('/')[3] ?? ''

/**
 * Sesión de agente que se inyecta en el modo simulado.
 *
 * `TASK-FRONT-SEC-01` (login, JWT y `ProtectedRoute`) todavía no existe, así que
 * sin esto el panel de disponibilidad no tendría con qué resolver la pregunta de
 * "¿esta sesión puede editar este inmueble?". Se siembra una sola vez y no
 * pisa una sesión que la aplicación ya haya escrito.
 */
const seedMockSession = () => {
  if (localStorage.getItem(SESSION_USER_KEY) !== null) return
  const user: SessionUser = {
    id: MOCK_SELLER.id,
    role: 'AGENTE',
    full_name: MOCK_SELLER.full_name,
    email: MOCK_SELLER.email,
  }
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
  } catch {
    // Sin `localStorage` el panel cairá en el aviso de "inicia sesión", que es
    // justo el comportamiento correcto.
  }
}

export const setupMocks = (): MockAdapter => {
  const mock = new MockAdapter(api, { onNoMatch: 'passthrough' })
  seedMockSession()

  mock.onGet(PROPERTIES_PATH).reply((config) => getProperties(config))
  mock.onPost(PROPERTIES_PATH).reply((config) => createProperty(config))
  mock.onGet(PROPERTY_DETAIL_PATH).reply((config) => getProperty(config, idFrom(config)))
  mock.onGet(PROPERTY_MANAGEMENT_PATH).reply((config) => getManagedProperty(config, idFrom(config)))
  mock.onPut(PROPERTY_DETAIL_PATH).reply((config) => updateProperty(config, idFrom(config)))
  mock.onDelete(PROPERTY_DETAIL_PATH).reply((config) => deleteProperty(config, idFrom(config)))

  // TASK-FRONT-PROP-04: estado operativo y agenda semanal de visitas.
  mock.onPatch(PROPERTY_STATUS_PATH).reply((config) => patchPropertyStatusInMock(config, idFrom(config)))
  mock.onGet(PROPERTY_SCHEDULES_PATH).reply((config) => getPropertySchedulesInMock(config, idFrom(config)))
  mock.onPut(PROPERTY_SCHEDULES_PATH).reply((config) => replacePropertySchedulesInMock(config, idFrom(config)))

  return mock
}
