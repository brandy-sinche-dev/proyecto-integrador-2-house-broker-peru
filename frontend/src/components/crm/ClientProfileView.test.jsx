import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { listAgentAppointments } from '../../services/appointments'
import { AgentePanel } from '../admin/AgentePanel'
import { ActivityTimeline, ClientDirectory, ClientProfileView } from './ClientProfileView'

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'agent-1', role: 'AGENTE' } }),
}))

jest.mock('../../services/appointments', () => ({
  listAgentAppointments: jest.fn(),
}))

const appointment = (overrides = {}) => ({
  id: 'appointment-1',
  status: 'CONFIRMED',
  scheduled_at: '2026-10-28T15:00:00Z',
  duration_minutes: 45,
  property: {
    id: 'property-1',
    title: 'Departamento en Miraflores',
    district: 'Miraflores',
    address: 'Av. Larco 456',
  },
  client: {
    id: 'client-1',
    full_name: 'María Quispe',
    email: 'maria@example.pe',
    phone: '+51 987 654 321',
  },
  agent: { id: 'agent-1', full_name: 'Agente asignado' },
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
  ...overrides,
})

const renderWithQuery = (element, { initialEntries = ['/'] } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClientProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra la información disponible, citas y propiedades vinculadas a citas', async () => {
    listAgentAppointments.mockResolvedValue([appointment()])
    renderWithQuery(<ClientProfileView clientId="client-1" />)

    expect(await screen.findByRole('heading', { name: 'María Quispe' })).toBeInTheDocument()
    expect(screen.getByText('maria@example.pe')).toBeInTheDocument()
    expect(screen.getByText('+51 987 654 321')).toBeInTheDocument()
    expect(screen.getAllByText('Departamento en Miraflores')).toHaveLength(2)
    expect(screen.getByText(/La API no proporciona preferencias de búsqueda/)).toBeInTheDocument()
    expect(screen.getByText(/no permite consultar ni registrar notas/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Citas' }))
    expect(screen.getByText('Cita · Confirmada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Consultas' }))
    expect(screen.getByText(/no ofrece registros de consultas/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Interacciones' }))
    expect(screen.getByText(/no ofrece registros de interacciones/)).toBeInTheDocument()
  })

  it('presenta un skeleton durante la carga', () => {
    listAgentAppointments.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<ClientProfileView clientId="client-1" />)

    expect(screen.getByRole('status', { name: 'Cargando ficha del cliente' })).toBeInTheDocument()
  })

  it('no inventa un cliente cuando no existe en las citas autorizadas', async () => {
    listAgentAppointments.mockResolvedValue([])
    renderWithQuery(<ClientProfileView clientId="unknown-client" />)

    expect(await screen.findByRole('heading', { name: 'Cliente no disponible' })).toBeInTheDocument()
    expect(screen.getByText(/No se encontró este cliente entre las citas/)).toBeInTheDocument()
  })

  it('muestra errores de permisos de forma explícita', async () => {
    listAgentAppointments.mockRejectedValue({ status: 403, userMessage: 'Prohibido.' })
    renderWithQuery(<ClientProfileView clientId="client-1" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para consultar las citas asignadas a esta cuenta.',
    )
  })

  it('muestra estado vacío en el directorio si el agente no tiene citas', async () => {
    listAgentAppointments.mockResolvedValue([])
    renderWithQuery(<ClientDirectory />)

    expect(await screen.findByText('No hay clientes en las citas asignadas a tu cuenta.')).toBeInTheDocument()
  })

  it('integra la ficha en la ruta y navegación del panel del agente', async () => {
    listAgentAppointments.mockResolvedValue([appointment()])
    const user = userEvent.setup()
    renderWithQuery(<AgentePanel />, { initialEntries: ['/agente'] })

    await user.click(screen.getByRole('button', { name: 'Clientes' }))
    expect(await screen.findByRole('heading', { name: 'Clientes con citas asignadas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir ficha CRM de María Quispe' }))

    expect(await screen.findByRole('heading', { name: 'María Quispe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clientes' })).toHaveStyle({ background: 'var(--brand-gold, #cfa861)' })
  })

  it('permite filtrar el historial de actividad por categoría', () => {
    renderWithQuery(<ActivityTimeline appointments={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Citas' }))
    expect(screen.getByText('No hay citas registradas para este cliente.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Consultas' }))
    expect(screen.getByText(/no ofrece registros de consultas/)).toBeInTheDocument()
  })
})
