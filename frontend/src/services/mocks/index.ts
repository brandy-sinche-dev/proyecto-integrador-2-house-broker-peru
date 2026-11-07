import MockAdapter from 'axios-mock-adapter'
import api from '../axios'
import { SESSION_USER_KEY, type SessionUser } from '../session'
import type { Appointment, AppointmentStatus } from '../types'
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

// Usuario administrador simulado: es la sesión que devuelve el login mock
// para `admin@housebroker.pe`. `TASK-FRONT-SEC-01` aún no existe, así que el
// modo simulado resuelve la sesión en el cliente.
const MOCK_SESSION = {
  id: MOCK_SELLER.id,
  email: 'admin@housebroker.pe',
  full_name: 'Administrador HouseBroker',
  role: 'ADMINISTRADOR',
  is_active: true,
  created_at: new Date().toISOString(),
}

// Rutas del contrato definido en TASK-ARC-PROP-01 (openapi_spec.yaml)
const PROPERTIES_PATH = '/v1/properties'
const PROPERTY_DETAIL_PATH = /^\/v1\/properties\/[^/]+$/
const PROPERTY_STATUS_PATH = /^\/v1\/properties\/[^/]+\/status$/
const PROPERTY_SCHEDULES_PATH = /^\/v1\/properties\/[^/]+\/schedules$/
const PROPERTY_MANAGEMENT_PATH = /^\/v1\/properties\/[^/]+\/management$/
const APPOINTMENTS_STATUS_PATH = /^\/v1\/appointments\/[^/]+\/status$/

const idFrom = (config: { url?: string }) => (config.url ?? '').split('/')[3] ?? ''

// Citas iniciales para simulación de CRM
const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-001',
    status: 'PENDING',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 45,
    property: {
      id: 'b2c1f5a0-1a2b-4c3d-9e0f-111111111111',
      title: 'Departamento amoblado en Miraflores',
      address: 'Av. Larco 450, Miraflores',
      district: 'Miraflores',
    },
    client: {
      id: 'client-001',
      full_name: 'Carlos Pérez',
      email: 'carlos.perez@gmail.com',
      phone: '+51 987 111 222',
    },
    agent: {
      id: MOCK_SELLER.id,
      full_name: MOCK_SELLER.full_name || 'Yohan Nato',
      email: MOCK_SELLER.email,
      phone: MOCK_SELLER.phone,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'apt-002',
    status: 'CONFIRMED',
    scheduled_at: new Date(Date.now() + 172800000).toISOString(),
    duration_minutes: 60,
    property: {
      id: 'b2c1f5a0-1a2b-4c3d-9e0f-222222222222',
      title: 'Casa moderna con jardín y piscina en San Isidro',
      address: 'Av. Pezet 890, San Isidro',
      district: 'San Isidro',
    },
    client: {
      id: 'client-002',
      full_name: 'María Ríos',
      email: 'maria.rios@gmail.com',
      phone: '+51 987 333 444',
    },
    agent: {
      id: MOCK_SELLER.id,
      full_name: MOCK_SELLER.full_name || 'Yohan Nato',
      email: MOCK_SELLER.email,
      phone: MOCK_SELLER.phone,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'apt-003',
    status: 'COMPLETED',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    duration_minutes: 45,
    property: {
      id: 'b2c1f5a0-1a2b-4c3d-9e0f-333333333333',
      title: 'Oficina ejecutiva corporativa en San Isidro',
      address: 'Av. Rivera Navarrete 500, San Isidro',
      district: 'San Isidro',
    },
    client: {
      id: 'client-003',
      full_name: 'Roberto Luna',
      email: 'roberto.luna@empresa.pe',
      phone: '+51 987 555 666',
    },
    agent: {
      id: MOCK_SELLER.id,
      full_name: MOCK_SELLER.full_name || 'Yohan Nato',
      email: MOCK_SELLER.email,
      phone: MOCK_SELLER.phone,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'apt-004',
    status: 'CANCELLED',
    scheduled_at: new Date(Date.now() - 172800000).toISOString(),
    duration_minutes: 30,
    reason: 'Cliente canceló por viaje de trabajo',
    property: {
      id: 'b2c1f5a0-1a2b-4c3d-9e0f-444444444444',
      title: 'Terreno comercial en Surco',
      address: 'Av. Primavera 1200, Santiago de Surco',
      district: 'Santiago de Surco',
    },
    client: {
      id: 'client-004',
      full_name: 'Ana Torres',
      email: 'ana.torres@gmail.com',
      phone: '+51 987 777 888',
    },
    agent: {
      id: MOCK_SELLER.id,
      full_name: MOCK_SELLER.full_name || 'Yohan Nato',
      email: MOCK_SELLER.email,
      phone: MOCK_SELLER.phone,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let memoryAppointments = [...INITIAL_APPOINTMENTS]

/**
 * Sesión de agente que se inyecta en el modo simulado.
 */
const seedMockSession = () => {
  if (localStorage.getItem(SESSION_USER_KEY) !== null) return
  const user: SessionUser = {
    id: MOCK_SELLER.id,
    role: 'AGENTE',
    full_name: MOCK_SELLER.full_name || 'Yohan Nato',
    email: MOCK_SELLER.email,
  }
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
  } catch {
    // Sin `localStorage` el panel caerá en el aviso de "inicia sesión".
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

  // Mock CRM Citas (TASK-FRONT-CRM-03)
  mock.onGet('/v1/appointments').reply((config) => {
    const params = config.params || {}
    const status = params.status as AppointmentStatus | undefined
    let filtered = [...memoryAppointments]
    if (status) {
      filtered = filtered.filter((a) => a.status === status)
    }
    const page = Number(params.page) || 1
    const limit = Number(params.limit) || 10
    const start = (page - 1) * limit
    const results = filtered.slice(start, start + limit)
    return [
      200,
      {
        count: filtered.length,
        next: start + limit < filtered.length ? `/v1/appointments?page=${page + 1}` : null,
        previous: page > 1 ? `/v1/appointments?page=${page - 1}` : null,
        results,
      },
    ]
  })

  mock.onPatch(APPOINTMENTS_STATUS_PATH).reply((config) => {
    const id = config.url?.split('/')[3]
    const body = JSON.parse(config.data || '{}')
    const apt = memoryAppointments.find((a) => a.id === id)
    if (!apt) return [404, { detail: 'Cita no encontrada' }]

    const prevStatus = apt.status
    apt.status = body.status
    if (body.reason) apt.reason = body.reason
    apt.updated_at = new Date().toISOString()

    return [
      200,
      {
        id: apt.id,
        status: apt.status,
        previous_status: prevStatus,
        scheduled_at: apt.scheduled_at,
        previous_scheduled_at: apt.scheduled_at,
        reason: apt.reason || null,
        changed_by: MOCK_SESSION.id,
        changed_at: apt.updated_at,
      },
    ]
  })

  // Mock auth
  const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}')
  mock.onPost('/v1/auth/register').reply((config) => {
    const body = JSON.parse(config.data)
    mockUsers[body.email] = {
      id: 'fake-user-id',
      email: body.email,
      full_name: body.full_name,
      role: 'CLIENTE',
      is_active: true,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem('mock_users', JSON.stringify(mockUsers))
    return [200, mockUsers[body.email]]
  })

  mock.onPost('/v1/auth/login').reply((config) => {
    const { email } = JSON.parse(config.data)
    let user = mockUsers[email]
    if (!user) {
      if (email === 'admin@housebroker.pe') user = MOCK_SESSION
      else if (email === 'agente@housebroker.pe')
        user = { ...MOCK_SESSION, id: 'agente-1', email, full_name: 'Agente de Propiedades', role: 'AGENTE' }
      else
        user = { id: 'cliente-1', email, full_name: 'Cliente', role: 'CLIENTE', is_active: true, created_at: new Date().toISOString() }
    }
    return [200, { access: 'mock-access-token', token_type: 'Bearer', expires_in: 3600, user }]
  })

  mock.onPost('/v1/auth/refresh').reply(() => {
    return [401, { detail: 'Token inválido' }]
  })

  return mock
}
