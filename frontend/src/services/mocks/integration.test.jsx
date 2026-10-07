import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { setupMocks } from './index'
import fixtures, { MOCK_SELLER } from './data/properties'
import { resetStore } from './properties'
import { resetAvailabilityStore } from './availability'
import { getManagedProperty, getProperties, getProperty } from '../properties'
import {
  allowedTransitions, validateStatusChange, getPropertySchedules,
  replacePropertySchedules, updatePropertyStatus,
} from '../availability'
import { clearSessionUser, writeSessionUser } from '../session'
import { AvailabilityPanel } from '../../components/availability/AvailabilityPanel'

const activeId = fixtures.find((property) => property.is_active).id
const suspendedId = fixtures.find((property) => !property.is_active).id
const agent = { id: MOCK_SELLER.id, role: 'AGENTE' }
const week = { days: [{ weekday: 'MARTES', slots: [{ start_time: '10:00', end_time: '11:00' }] }] }

// Usa los handlers y almacenes reales de setupMocks; no sustituye servicios ni respuestas.
describe('setupMocks: integración HTTP de disponibilidad', () => {
  let mock

  beforeEach(() => {
    resetStore()
    resetAvailabilityStore()
    clearSessionUser()
    mock = setupMocks()
  })

  afterEach(() => {
    mock.restore()
    clearSessionUser()
  })

  it('abre un suspendido por gestión y lo reactiva desde el panel real', async () => {
    await expect(getProperty(suspendedId)).rejects.toMatchObject({ status: 404 })
    expect((await getProperties()).some(({ id }) => id === suspendedId)).toBe(false)
    await expect(getManagedProperty(suspendedId)).resolves.toMatchObject({
      id: suspendedId, status: 'SUSPENDIDO', is_active: false, is_bookable: false,
    })
    render(<MemoryRouter><AvailabilityPanel propertyId={suspendedId} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Estado del inmueble' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: /Disponible/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar estado' }))
    await screen.findByText(/Estado actual: Disponible/)
    await expect(getProperty(suspendedId)).resolves.toMatchObject({
      id: suspendedId, status: 'DISPONIBLE', is_active: true, is_bookable: true,
    })
    expect(mock.history.patch.map(({ url }) => url)).toEqual([`/v1/properties/${suspendedId}/status`])
  })

  it('GET/PUT schedules usa el ID del inmueble y persiste solo su semana', async () => {
    const original = await getPropertySchedules(activeId)
    const other = await getPropertySchedules(suspendedId)
    expect(original.property_id).toBe(activeId)
    const saved = await replacePropertySchedules(activeId, week)
    expect(saved).toMatchObject({ property_id: activeId, total_slots: 1 })
    expect(saved.days.find(({ weekday }) => weekday === 'MARTES').slots).toEqual([
      expect.objectContaining({ start_time: '10:00', end_time: '11:00', is_active: true }),
    ])
    await expect(getPropertySchedules(activeId)).resolves.toEqual(saved)
    await expect(getPropertySchedules(suspendedId)).resolves.toEqual(other)
  })

  it('PATCH permite RESERVADO → VENDIDO con motivo y aplica CA1 al catálogo', async () => {
    expect(allowedTransitions('RESERVADO')).toContain('VENDIDO')
    expect(validateStatusChange('RESERVADO', 'VENDIDO', 'Venta firmada')).toEqual([])
    expect(validateStatusChange('RESERVADO', 'VENDIDO')).toEqual([
      expect.objectContaining({ field: 'reason' }),
    ])
    await updatePropertyStatus(activeId, { status: 'RESERVADO', reason: 'Reserva firmada' })
    await expect(updatePropertyStatus(activeId, { status: 'VENDIDO' })).rejects.toMatchObject({ status: 400 })
    await expect(getManagedProperty(activeId)).resolves.toMatchObject({ status: 'RESERVADO' })
    await expect(updatePropertyStatus(activeId, { status: 'VENDIDO', reason: 'Venta firmada' })).resolves.toMatchObject({
      id: activeId, previous_status: 'RESERVADO', status: 'VENDIDO', changed_by: agent.id,
    })
    await expect(getProperty(activeId)).resolves.toMatchObject({ status: 'VENDIDO', is_active: true, is_bookable: false })
    expect(await getProperties()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: activeId, status: 'VENDIDO', is_bookable: false }),
    ]))
    await expect(updatePropertyStatus(activeId, { status: 'DISPONIBLE' })).rejects.toMatchObject({ status: 400 })
  })

  it('administrador gestiona un suspendido ajeno y registra su actor', async () => {
    writeSessionUser({ id: 'admin', role: 'ADMINISTRADOR' })
    await expect(getManagedProperty(suspendedId)).resolves.toMatchObject({ id: suspendedId })
    await expect(getPropertySchedules(suspendedId)).resolves.toMatchObject({ property_id: suspendedId })
    await expect(replacePropertySchedules(suspendedId, week)).resolves.toMatchObject({ total_slots: 1 })
    await expect(updatePropertyStatus(suspendedId, { status: 'DISPONIBLE' })).resolves.toMatchObject({ changed_by: 'admin' })
  })

  it.each([
    ['cliente incluso asignado', { id: MOCK_SELLER.id, role: 'CLIENTE' }, 403],
    ['agente ajeno', { id: 'otro-agente', role: 'AGENTE' }, 403],
    ['sin sesión', null, 401],
  ])('deniega gestión, PATCH y GET/PUT schedules a %s sin mutaciones', async (_label, session, status) => {
    const original = await getPropertySchedules(suspendedId)
    if (session) writeSessionUser(session)
    else clearSessionUser()
    await expect(getManagedProperty(suspendedId)).rejects.toMatchObject({ status })
    await expect(updatePropertyStatus(suspendedId, { status: 'DISPONIBLE' })).rejects.toMatchObject({ status })
    await expect(getPropertySchedules(suspendedId)).rejects.toMatchObject({ status })
    await expect(replacePropertySchedules(suspendedId, week)).rejects.toMatchObject({ status })
    writeSessionUser(agent)
    await expect(getManagedProperty(suspendedId)).resolves.toMatchObject({ status: 'SUSPENDIDO' })
    await expect(getPropertySchedules(suspendedId)).resolves.toEqual(original)
  })

  it('devuelve 404 para un ID inexistente en todos los handlers protegidos', async () => {
    await expect(getManagedProperty('inexistente')).rejects.toMatchObject({ status: 404 })
    await expect(updatePropertyStatus('inexistente', { status: 'DISPONIBLE' })).rejects.toMatchObject({ status: 404 })
    await expect(getPropertySchedules('inexistente')).rejects.toMatchObject({ status: 404 })
    await expect(replacePropertySchedules('inexistente', week)).rejects.toMatchObject({ status: 404 })
  })
})
