import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AxiosMockAdapter from 'axios-mock-adapter'
import api from '../../services/axios'
import { AppointmentListTable } from './AppointmentListTable'

const appointment = (id, status = 'PENDING') => ({
  id,
  status,
  scheduled_at: '2026-11-02T15:00:00Z',
  duration_minutes: 45,
  property: {
    id: 'property-1',
    title: `Propiedad ${id}`,
    address: 'Av. Larco 456, Miraflores',
  },
  client: { id: 'client-1', full_name: `Cliente ${id}` },
  agent: { id: 'agent-1', full_name: `Agente ${id}` },
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
})

const renderTable = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentListTable />
    </QueryClientProvider>,
  )
}

describe('AppointmentListTable', () => {
  let mock

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('filtra por estado y permite avanzar entre páginas', async () => {
    const records = Array.from({ length: 11 }, (_, index) =>
      appointment(`apt-${index + 1}`, index % 2 === 0 ? 'PENDING' : 'CONFIRMED'),
    )
    mock.onGet('/v1/appointments').reply(({ params }) => {
      const filtered = params.status ? records.filter((item) => item.status === params.status) : records
      const page = Number(params.page)
      const limit = Number(params.limit)
      const start = (page - 1) * limit
      return [200, {
        count: filtered.length,
        next: start + limit < filtered.length ? 'next' : null,
        previous: page > 1 ? 'previous' : null,
        results: filtered.slice(start, start + limit),
      }]
    })

    const user = userEvent.setup()
    renderTable()

    expect(await screen.findByText('Cliente apt-1')).toBeInTheDocument()
    expect(screen.getByText('11 cita(s) · Página 1 de 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Cliente apt-11')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar citas por estado' }), 'CONFIRMED')
    expect(await screen.findByText('5 cita(s) · Página 1 de 1')).toBeInTheDocument()
    expect(mock.history.get.at(-1).params).toEqual({ page: 1, limit: 10, status: 'CONFIRMED' })
    expect(screen.getByText('Cliente apt-2')).toBeInTheDocument()
  })

  it('confirma la cancelación, envía el motivo y actualiza la lista con Toast', async () => {
    let records = [appointment('apt-1')]
    mock.onGet('/v1/appointments').reply(() => [200, {
      count: records.length,
      next: null,
      previous: null,
      results: records,
    }])
    mock.onPatch('/v1/appointments/apt-1/status').reply((config) => {
      const body = JSON.parse(config.data)
      records = [{ ...records[0], status: body.status }]
      return [200, {
        id: 'apt-1',
        status: body.status,
        previous_status: 'PENDING',
        scheduled_at: records[0].scheduled_at,
        previous_scheduled_at: records[0].scheduled_at,
        reason: body.reason,
        changed_by: 'agent-1',
        changed_at: '2026-11-01T10:00:00Z',
      }]
    })

    const user = userEvent.setup()
    renderTable()

    await screen.findByText('Cliente apt-1')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: '¿Cancelar esta cita?' })
    expect(within(dialog).getByRole('button', { name: 'Confirmar cancelación' })).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Motivo de cancelación'), 'El cliente solicita cancelar')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cancelación' }))

    expect(await screen.findByRole('status', { name: 'Notificación' })).toHaveTextContent(
      'Cita actualizada: Cancelada.',
    )
    expect(mock.history.patch).toHaveLength(1)
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      status: 'CANCELLED',
      reason: 'El cliente solicita cancelar',
    })
    await waitFor(() => expect(screen.getByRole('cell', { name: 'Cancelada' })).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantiene el estado anterior y no muestra Toast cuando falla el PATCH', async () => {
    mock.onGet('/v1/appointments').reply(200, {
      count: 1,
      next: null,
      previous: null,
      results: [appointment('apt-1')],
    })
    mock.onPatch('/v1/appointments/apt-1/status').reply(409, { detail: 'La cita ya no se puede cancelar.' })

    const user = userEvent.setup()
    renderTable()

    await screen.findByText('Cliente apt-1')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Motivo de cancelación'), 'Motivo de prueba')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cancelación' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La cita ya no se puede cancelar.')
    expect(screen.queryByRole('status', { name: 'Notificación' })).not.toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Pendiente' })).toBeInTheDocument()
  })
})