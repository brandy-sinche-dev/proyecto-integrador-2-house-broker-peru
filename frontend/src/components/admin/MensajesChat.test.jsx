import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MensajesChat } from './MensajesChat'
import { AgentePanel } from './AgentePanel'

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'agent-1', full_name: 'Yohan Nato', role: 'AGENTE' },
    signOut: jest.fn(),
  }),
}))

jest.mock('../../services/appointments', () => ({
  listAgentAppointments: jest.fn().mockResolvedValue([]),
}))

describe('MensajesChat (Módulo de Chat para Agentes)', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('renderiza la lista de conversaciones iniciales con sus clientes', () => {
    render(
      <MemoryRouter>
        <MensajesChat />
      </MemoryRouter>
    )

    expect(screen.getByText('Conversaciones')).toBeInTheDocument()
    expect(screen.getAllByText(/Carlos Pérez/i).length).toBeGreaterThan(0)
    expect(screen.getByText('María Ríos')).toBeInTheDocument()
    expect(screen.getByText('Roberto Luna')).toBeInTheDocument()
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
  })

  it('muestra el inmueble de interés y botón de WhatsApp del cliente activo', () => {
    render(
      <MemoryRouter>
        <MensajesChat />
      </MemoryRouter>
    )

    expect(screen.getAllByText(/Departamento amoblado en Miraflores/i).length).toBeGreaterThan(0)
    const waLink = screen.getByTitle('Abrir chat en WhatsApp')
    expect(waLink).toHaveAttribute('href', expect.stringContaining('api.whatsapp.com'))
  })

  it('permite al agente enviar una respuesta escrita y agregarla al hilo', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MensajesChat />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/Escribe un mensaje para Carlos Pérez/i)
    const sendBtn = screen.getByRole('button', { name: 'Enviar respuesta al cliente' })

    await user.type(input, 'Estimado Carlos, con gusto coordinamos la visita para el sábado.')
    await user.click(sendBtn)

    expect(
      screen.getByText('Estimado Carlos, con gusto coordinamos la visita para el sábado.')
    ).toBeInTheDocument()
    expect(screen.getByText(/Tú \(Asesor House Broker\)/i)).toBeInTheDocument()
  })

  it('permite enviar una respuesta rápida prediseñada con un clic', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MensajesChat />
      </MemoryRouter>
    )

    const chip = screen.getByRole('button', {
      name: /¡Hola! Con mucho gusto, el sábado a las 11:00 AM queda reservado/i,
    })
    await user.click(chip)

    expect(
      screen.getByText('¡Hola! Con mucho gusto, el sábado a las 11:00 AM queda reservado.')
    ).toBeInTheDocument()
  })

  it('filtra las conversaciones según el término de búsqueda', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MensajesChat />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText(/Buscar por cliente o propiedad/i)
    await user.type(searchInput, 'María')

    const convList = screen.getByRole('list')
    expect(within(convList).getByText('María Ríos')).toBeInTheDocument()
    expect(within(convList).queryByText('Carlos Pérez')).not.toBeInTheDocument()
  })

  it('muestra la alerta de mensajes nuevos en el panel del agente y permite navegar al chat', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/agente']}>
        <AgentePanel />
      </MemoryRouter>
    )

    // Banner de alerta superior visible
    expect(
      screen.getByText(/Tienes \d+ nuevos mensajes de clientes esperando respuesta/i)
    ).toBeInTheDocument()

    // Botón de banner para ir al chat
    const alertBtn = screen.getByRole('button', { name: /Atender en Chat/i })
    await user.click(alertBtn)

    // Título de la sección de chat
    expect(
      screen.getByRole('heading', {
        name: /Centro de Mensajes y Coordinación con Clientes/i,
      })
    ).toBeInTheDocument()
  })
})
