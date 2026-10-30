// =============================================================
// Pruebas de integración del flujo de reserva de visitas
// TASK-TEST-CRM-01: selección de horario, confirmación y errores
// =============================================================
//
// El modal se monta con los endpoints de disponibilidad y de citas
// simulados mediante `axios-mock-adapter`, así que la prueba recorre el
// mismo camino que la aplicación: consulta de horarios, selección, envío y
// representación del éxito o del error devuelto por el servidor.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import api from '../../services/axios'
import { AppointmentModal } from './AppointmentModal'

const PROPERTY_ID = 'b2c1f5a0-1a2b-4c3d-9e0f-111111111111'
const AVAILABLE_SLOTS_PATH = `/v1/properties/${PROPERTY_ID}/available-slots`
const APPOINTMENTS_PATH = '/v1/appointments'

const slots = [
  { start_at: '2026-12-10T14:00:00Z', end_at: '2026-12-10T15:00:00Z', duration_minutes: 60 },
  { start_at: '2026-12-10T16:00:00Z', end_at: '2026-12-10T17:00:00Z', duration_minutes: 60 },
]

function availability(date = '2026-12-10', list = slots) {
  return {
    property_id: PROPERTY_ID,
    date,
    timezone: 'America/Lima',
    total_slots: list.length,
    slots: list,
  }
}

const appointment = {
  id: 'a9c1d2e3-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
  status: 'PENDING',
  scheduled_at: '2026-12-10T14:00:00Z',
  duration_minutes: 60,
  reason: null,
  property: { id: PROPERTY_ID, title: 'Departamento en Miraflores', district: 'Miraflores', address: 'Av. Larco 123' },
  client: { id: 'cliente-1', full_name: 'Cliente de Pruebas', email: 'cliente@test.pe', phone: null },
  agent: { id: 'agente-1', full_name: 'Agente de Pruebas', email: 'agente@test.pe', phone: null },
  created_at: '2026-12-01T10:00:00Z',
  updated_at: '2026-12-01T10:00:00Z',
}

function renderModal(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirmed: jest.fn(),
    propertyId: PROPERTY_ID,
    propertyTitle: 'Departamento en Miraflores',
    ...overrides,
  }
  render(<AppointmentModal {...props} />)
  return props
}

async function chooseDate(value = '2026-12-10') {
  fireEvent.change(screen.getByLabelText(/Selecciona una fecha/), { target: { value } })
}

describe('AppointmentModal', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('no renderiza nada cuando está cerrado', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByRole('heading', { name: 'Reservar Visita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pide iniciar sesión cuando no hay usuario autenticado', async () => {
    const user = userEvent.setup()
    const props = renderModal({ isLoggedIn: false })

    expect(screen.getByRole('heading', { name: 'Inicia sesión requerida' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(mock.history.get).toHaveLength(0)
  })

  it('consulta la disponibilidad al elegir una fecha y mantiene el botón deshabilitado', async () => {
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, availability())
    renderModal()

    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
    await chooseDate()

    expect(await screen.findByRole('button', { name: '09:00 AM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '11:00 AM' })).toBeInTheDocument()
    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].params).toEqual({ date: '2026-12-10' })
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
  })

  it('deshabilita los horarios que ya están ocupados', async () => {
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(
      200,
      availability('2026-12-10', [{ ...slots[0], is_available: false }, slots[1]]),
    )
    renderModal()

    await chooseDate()

    const occupied = await screen.findByRole('button', { name: '09:00 AM · Ocupado' })
    expect(occupied).toBeDisabled()
    expect(screen.getByRole('button', { name: '11:00 AM' })).toBeEnabled()
  })

  it('muestra un aviso cuando la fecha no tiene horarios libres', async () => {
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, availability('2026-12-10', []))
    renderModal()

    await chooseDate()

    expect(await screen.findByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
  })

  it('avisa si el inmueble no está identificado y no consulta la API', async () => {
    renderModal({ propertyId: undefined })

    await chooseDate()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo identificar el inmueble para agendar la visita.',
    )
    expect(mock.history.get).toHaveLength(0)
  })

  it('bloquea el envío si el inmueble deja de estar identificado', async () => {
    const user = userEvent.setup()
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, availability())
    const props = {
      isOpen: true,
      onClose: jest.fn(),
      onConfirmed: jest.fn(),
      propertyId: PROPERTY_ID,
      propertyTitle: 'Departamento en Miraflores',
    }
    const { rerender } = render(<AppointmentModal {...props} />)

    await chooseDate()
    await user.click(await screen.findByRole('button', { name: '09:00 AM' }))
    rerender(<AppointmentModal {...props} propertyId={undefined} />)
    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))

    expect(mock.history.post).toHaveLength(0)
    expect(props.onConfirmed).not.toHaveBeenCalled()
    const alerts = await screen.findAllByRole('alert')
    expect(
      alerts.some((alert) => alert.textContent?.includes('No se pudo identificar el inmueble')),
    ).toBe(true)
  })

  it('muestra el error de la consulta de disponibilidad', async () => {
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(500, { detail: 'La agenda no está disponible.' })
    renderModal()

    await chooseDate()

    expect(await screen.findByRole('alert')).toHaveTextContent('La agenda no está disponible.')
    expect(screen.queryByRole('button', { name: '09:00 AM' })).not.toBeInTheDocument()
  })

  it('confirma la reserva, envía el horario elegido y muestra el éxito', async () => {
    const user = userEvent.setup()
    let sentBody
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, availability())
    mock.onPost(APPOINTMENTS_PATH).reply((config) => {
      sentBody = JSON.parse(config.data)
      return [201, appointment]
    })
    const props = renderModal()

    await chooseDate()
    await user.click(await screen.findByRole('button', { name: '09:00 AM' }))

    const confirm = screen.getByRole('button', { name: 'Confirmar Reserva' })
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(await screen.findByRole('heading', { name: /Visita Agendada con Éxito/ })).toBeInTheDocument()
    expect(screen.getByText('2026-12-10')).toBeInTheDocument()
    expect(screen.getByText('09:00 AM')).toBeInTheDocument()
    expect(sentBody).toEqual({
      property_id: PROPERTY_ID,
      scheduled_at: '2026-12-10T14:00:00Z',
    })
    expect(props.onConfirmed).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra el conflicto del servidor si el horario se ocupó al confirmar', async () => {
    const user = userEvent.setup()
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, availability())
    mock.onPost(APPOINTMENTS_PATH).reply(409, {
      detail: 'El horario seleccionado ya fue reservado por otro cliente.',
    })
    const props = renderModal()

    await chooseDate()
    await user.click(await screen.findByRole('button', { name: '09:00 AM' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El horario seleccionado ya fue reservado por otro cliente.',
    )
    expect(screen.queryByRole('heading', { name: /Visita Agendada con Éxito/ })).not.toBeInTheDocument()
    expect(props.onConfirmed).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled()
  })

  it('al cambiar la fecha limpia la hora elegida y vuelve a consultar', async () => {
    const user = userEvent.setup()
    mock.onGet(AVAILABLE_SLOTS_PATH).reply((config) => [
      200,
      availability(config.params.date, config.params.date === '2026-12-10' ? slots : [slots[1]]),
    ])
    renderModal()

    await chooseDate('2026-12-10')
    await user.click(await screen.findByRole('button', { name: '09:00 AM' }))
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled()

    await chooseDate('2026-12-11')

    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
    expect(await screen.findByRole('button', { name: '11:00 AM' })).toBeInTheDocument()
    await waitFor(() => expect(mock.history.get).toHaveLength(2))
    expect(mock.history.get[1].params).toEqual({ date: '2026-12-11' })
  })
})
