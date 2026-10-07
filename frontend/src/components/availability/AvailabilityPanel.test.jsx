// =============================================================
// Pruebas del panel de disponibilidad (RF-PROP-04)
// TASK-FRONT-PROP-04: carga, control de acceso en cliente y
// composición del selector de estado con el gestor de franjas
// =============================================================

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import api from '../../services/axios'
import { AvailabilityPanel } from './AvailabilityPanel'
import { getManagedProperty as getProperty } from '../../services/properties'
import { getPropertySchedules, updatePropertyStatus } from '../../services/availability'
import { writeSessionUser, clearSessionUser, SESSION_USER_KEY } from '../../services/session'

jest.mock('../../services/properties', () => ({
  getManagedProperty: jest.fn(),
}))
jest.mock('../../services/availability', () => {
  const actual = jest.requireActual('../../services/availability')
  return {
    ...actual,
    getPropertySchedules: jest.fn(),
    updatePropertyStatus: jest.fn(),
    replacePropertySchedules: jest.fn(),
  }
})

const SELLER_ID = '7c4a9d21-3b6e-4f80-9a2d-5e7c1b3f8d40'
const PROPERTY_ID = 'prop-1'

const property = (overrides = {}) => ({
  id: PROPERTY_ID,
  title: 'Casa en Miraflores',
  address: 'Calle Grimm 120',
  status: 'DISPONIBLE',
  seller: { id: SELLER_ID, full_name: 'Yohan Nato' },
  ...overrides,
})

const schedules = {
  property_id: PROPERTY_ID,
  timezone: 'America/Lima',
  total_slots: 1,
  days: [
    {
      weekday: 'LUNES',
      slots: [{ id: 'slot-1', start_time: '09:00', end_time: '12:00', is_active: true }],
    },
    { weekday: 'MARTES', slots: [] },
    { weekday: 'MIERCOLES', slots: [] },
    { weekday: 'JUEVES', slots: [] },
    { weekday: 'VIERNES', slots: [] },
    { weekday: 'SABADO', slots: [] },
    { weekday: 'DOMINGO', slots: [] },
  ],
}

const renderPanel = (user) =>
  render(
    <MemoryRouter>
      <AvailabilityPanel propertyId={PROPERTY_ID} user={user} />
    </MemoryRouter>,
  )

describe('AvailabilityPanel', () => {
  beforeEach(() => {
    getProperty.mockReset().mockResolvedValue(property())
    getPropertySchedules.mockReset().mockResolvedValue(schedules)
    updatePropertyStatus
      .mockReset()
      .mockResolvedValue({
        id: PROPERTY_ID,
        status: 'RESERVADO',
        previous_status: 'DISPONIBLE',
        is_active: true,
        reason: 'Reserva del cliente',
        changed_by: SELLER_ID,
        changed_at: '2026-03-01T14:00:00Z',
      })
    localStorage.removeItem(SESSION_USER_KEY)
  })

  afterEach(() => {
    clearSessionUser()
  })

  describe('Carga', () => {
    it('avisa mientras pide el inmueble y su agenda', () => {
      getProperty.mockReturnValue(new Promise(() => {}))
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      expect(screen.getByText('Cargando disponibilidad del inmueble…')).toBeInTheDocument()
    })

    it('compone el selector de estado y el gestor de franjas', async () => {
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      expect(await screen.findByRole('heading', { name: 'Casa en Miraflores' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Estado del inmueble' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Agenda de visitas' })).toBeInTheDocument()
      expect(screen.getByText('Calle Grimm 120 · Estado actual: Disponible')).toBeInTheDocument()
      expect(screen.getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveValue('09:00')
      expect(getPropertySchedules).toHaveBeenCalledWith(PROPERTY_ID)
    })

    it('muestra el estado que devuelve el inmueble, no un valor por defecto', async () => {
      getProperty.mockResolvedValue(property({ status: 'RESERVADO' }))
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      await screen.findByRole('heading', { name: 'Casa en Miraflores' })
      expect(screen.getByText('Calle Grimm 120 · Estado actual: Reservado')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Reservado/ })).toBeChecked()
    })

    it('ofrece reintentar cuando la carga falla y recupera al segundo intento', async () => {
      const user = userEvent.setup()
      getPropertySchedules.mockRejectedValueOnce({ userMessage: 'No se pudo leer la agenda.' })
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      expect(await screen.findByText('No se pudo abrir el panel')).toBeInTheDocument()
      expect(screen.getByText('No se pudo leer la agenda.')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(await screen.findByRole('heading', { name: 'Casa en Miraflores' })).toBeInTheDocument()
    })
  })

  describe('Control de acceso en cliente', () => {
    it('deja pasar al agente asignado', async () => {
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      expect(await screen.findByRole('heading', { name: 'Estado del inmueble' })).toBeInTheDocument()
      expect(screen.queryByText('No puedes gestionar este inmueble')).not.toBeInTheDocument()
    })

    it('deja pasar al administrador aunque el inmueble sea de otro agente', async () => {
      renderPanel({ id: 'otro-agente', role: 'ADMINISTRADOR' })

      expect(await screen.findByRole('heading', { name: 'Estado del inmueble' })).toBeInTheDocument()
    })

    it('bloquea a un cliente sin montar ningún control de edición', async () => {
      renderPanel({ id: '7f00-0000', role: 'CLIENTE' })

      expect(await screen.findByText('No puedes gestionar este inmueble')).toBeInTheDocument()
      expect(screen.getByText(/Tu cuenta es de cliente\./)).toBeInTheDocument()
      expect(screen.getByText('Inmueble: Casa en Miraflores.')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Estado del inmueble' })).not.toBeInTheDocument()
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Volver al catálogo' })).toBeInTheDocument()
    })

    it('explica al agente que el inmueble es de otra cartera', async () => {
      renderPanel({ id: '7f00-0000', role: 'AGENTE' })

      expect(await screen.findByText(/está asignado a Yohan Nato/)).toBeInTheDocument()
    })

    it('avisa cuando el inmueble no tiene agente registrado', async () => {
      getProperty.mockResolvedValue(property({ seller: undefined }))
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      expect(await screen.findByText(/no tiene agente asignado/)).toBeInTheDocument()
    })

    it('pide iniciar sesión si no hay usuario en la sesión', async () => {
      renderPanel(null)

      expect(await screen.findByText(/Inicia sesión con una cuenta de agente/)).toBeInTheDocument()
    })

    it('lee el usuario de la sesión cuando no se le pasa uno', async () => {
      writeSessionUser({ id: SELLER_ID, role: 'AGENTE', full_name: 'Yohan Nato' })
      render(
        <MemoryRouter>
          <AvailabilityPanel propertyId={PROPERTY_ID} />
        </MemoryRouter>,
      )

      expect(await screen.findByRole('heading', { name: 'Estado del inmueble' })).toBeInTheDocument()
    })

    it('pide los datos aunque el acceso se vaya a denegar en pantalla', async () => {
      // El bloqueo es de presentación, no una forma de ahorrar tráfico: el
      // `GET` de la agenda va con el del inmueble y el backend es quien manda.
      // Esta prueba deja esa decisión escrita.
      renderPanel({ id: '7f00-0000', role: 'CLIENTE' })

      await screen.findByText('No puedes gestionar este inmueble')
      expect(getPropertySchedules).toHaveBeenCalledWith(PROPERTY_ID)
    })
  })

  describe('Reflejo de los cambios sobre el panel', () => {
    it('abre un suspendido desde gestión y permite reactivarlo al agente asignado', async () => {
      const mock = new MockAdapter(api)
      mock.onGet(`/v1/properties/${PROPERTY_ID}`).reply(404)
      mock.onGet(`/v1/properties/${PROPERTY_ID}/management`).reply(200,
        property({ status: 'SUSPENDIDO', is_active: false, is_bookable: false }))
      getProperty.mockImplementationOnce(jest.requireActual('../../services/properties').getManagedProperty)
      updatePropertyStatus.mockResolvedValueOnce({
        id: PROPERTY_ID, status: 'DISPONIBLE', previous_status: 'SUSPENDIDO', is_active: true,
      })
      try {
        renderPanel({ id: SELLER_ID, role: 'AGENTE' })
        expect(await screen.findByText('Calle Grimm 120 · Estado actual: Suspendido')).toBeInTheDocument()
        expect(mock.history.get.map(({ url }) => url)).toEqual([`/v1/properties/${PROPERTY_ID}/management`])
        const user = userEvent.setup()
        await user.click(screen.getByRole('radio', { name: /Disponible/ }))
        await user.click(screen.getByRole('button', { name: 'Guardar estado' }))
        await waitFor(() => expect(updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, { status: 'DISPONIBLE' }))
        expect(await screen.findByText('Calle Grimm 120 · Estado actual: Disponible')).toBeInTheDocument()
      } finally {
        mock.restore()
      }
    })

    it('no monta controles si gestión deniega el suspendido al agente no asignado', async () => {
      const mock = new MockAdapter(api)
      mock.onGet(`/v1/properties/${PROPERTY_ID}/management`).reply(403, {
        detail: 'Solo el agente asignado puede gestionar este inmueble.',
      })
      getProperty.mockImplementationOnce(jest.requireActual('../../services/properties').getManagedProperty)
      try {
        renderPanel({ id: 'otro-agente', role: 'AGENTE' })
        expect(await screen.findByText('No se pudo abrir el panel')).toBeInTheDocument()
        expect(screen.getByText('Solo el agente asignado puede gestionar este inmueble.')).toBeInTheDocument()
        expect(screen.queryByRole('radio')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Guardar estado' })).not.toBeInTheDocument()
        expect(updatePropertyStatus).not.toHaveBeenCalled()
      } finally {
        mock.restore()
      }
    })

    it('propaga el estado confirmado por el servidor a la cabecera y a la agenda', async () => {
      const user = userEvent.setup()
      renderPanel({ id: SELLER_ID, role: 'AGENTE' })

      await screen.findByRole('heading', { name: 'Estado del inmueble' })
      await user.click(screen.getByRole('radio', { name: /Reservado/ }))
      await user.type(screen.getByLabelText(/Motivo del cambio/), 'Reserva del cliente')
      await user.click(screen.getByRole('button', { name: 'Guardar estado' }))

      await waitFor(() =>
        expect(updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, {
          status: 'RESERVADO',
          reason: 'Reserva del cliente',
        }),
      )
      await waitFor(() =>
        expect(screen.getByText('Calle Grimm 120 · Estado actual: Reservado')).toBeInTheDocument(),
      )
      expect(screen.getByText(/estado «Reservado»/)).toBeInTheDocument()
    })
  })
})
