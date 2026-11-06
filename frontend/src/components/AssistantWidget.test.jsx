// =============================================================
// Pruebas unitarias del componente AssistantWidget (Concierge IA)
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantWidget } from './AssistantWidget'
import * as aiConcierge from '../services/aiConcierge'

const mockProp = {
  id: 'prop-123',
  title: 'Departamento moderno en Miraflores',
  price: 180000,
  moneda: 'USD',
  property_type: 'DEPARTAMENTO',
  address: 'Av. Larco, Miraflores',
  dormitorios: 2,
  banos: 2,
  area_total: 85,
  is_active: true,
  images: [{ url: '/properties/demo/depa1.jpg', es_principal: true }],
}

jest.mock('../services/properties', () => ({
  getProperties: jest.fn().mockResolvedValue([
    {
      id: 'prop-123',
      title: 'Departamento moderno en Miraflores',
      price: 180000,
      moneda: 'USD',
      property_type: 'DEPARTAMENTO',
      address: 'Av. Larco, Miraflores',
      dormitorios: 2,
      banos: 2,
      area_total: 85,
      is_active: true,
      images: [{ url: '/properties/demo/depa1.jpg', es_principal: true }],
    },
  ]),
}))

describe('Componente AssistantWidget (Pruebas Unitarias)', () => {
  const defaultProps = {
    open: false,
    savedCount: 0,
    visitsCount: 0,
    onToggle: jest.fn(),
    onNavigate: jest.fn(),
    onOpenProperty: jest.fn(),
    onBookVisit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra el mensaje teaser por defecto cuando no hay guardados ni visitas', () => {
    render(<AssistantWidget {...defaultProps} />)

    expect(screen.getByText('Cuéntame qué buscas y te propongo opciones.')).toBeInTheDocument()
    const toggleBtn = screen.getByRole('button', { name: 'Abrir Concierge IA' })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('muestra el teaser con el conteo y la concordancia gramatical correcta (singular/plural)', () => {
    const { rerender } = render(
      <AssistantWidget {...defaultProps} savedCount={1} visitsCount={1} />
    )
    expect(screen.getByText('Tienes 1 guardado y 1 visita agendada.')).toBeInTheDocument()

    rerender(
      <AssistantWidget {...defaultProps} savedCount={3} visitsCount={2} />
    )
    expect(screen.getByText('Tienes 3 guardados y 2 visitas agendadas.')).toBeInTheDocument()
  })

  it('ejecuta onToggle al hacer clic en el botón flotante del dock', async () => {
    const user = userEvent.setup()
    render(<AssistantWidget {...defaultProps} />)

    const toggleBtn = screen.getByRole('button', { name: 'Abrir Concierge IA' })
    await user.click(toggleBtn)

    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1)
  })

  it('no muestra el panel de conversación cuando open={false}', () => {
    render(<AssistantWidget {...defaultProps} open={false} />)

    expect(screen.queryByRole('dialog', { name: 'Concierge IA' })).not.toBeInTheDocument()
  })

  it('renderiza el panel de conversación cuando open={true} con bienvenida y accesos rápidos', () => {
    render(<AssistantWidget {...defaultProps} open={true} savedCount={2} visitsCount={1} />)

    const dialog = screen.getByRole('dialog', { name: 'Concierge IA' })
    expect(dialog).toBeInTheDocument()

    expect(screen.getByText('¡Hola! Soy tu Concierge IA de House Broker Perú.')).toBeInTheDocument()
    expect(screen.getByText(/Veo que guardaste 2 inmuebles y agendaste 1 visita/i)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Ver guardados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mis visitas' })).toBeInTheDocument()
  })

  it('ejecuta onToggle al pulsar el botón de cerrar del panel', async () => {
    const user = userEvent.setup()
    render(<AssistantWidget {...defaultProps} open={true} />)

    const closeBtn = screen.getByRole('button', { name: 'Cerrar Concierge IA' })
    await user.click(closeBtn)

    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1)
  })

  it('ejecuta onNavigate("guardados") y onNavigate("visitas") desde los botones rápidos', async () => {
    const user = userEvent.setup()
    render(<AssistantWidget {...defaultProps} open={true} />)

    const guardadosBtn = screen.getByRole('button', { name: 'Ver guardados' })
    await user.click(guardadosBtn)
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('guardados')

    const visitasBtn = screen.getByRole('button', { name: 'Mis visitas' })
    await user.click(visitasBtn)
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('visitas')
  })

  it('permite escribir en el input y enviar una consulta inmobiliaria', async () => {
    const user = userEvent.setup()
    const askSpy = jest.spyOn(aiConcierge, 'askConciergeAI').mockResolvedValueOnce({
      reply: 'He encontrado esta excelente opción para ti.',
      recommendations: [
        {
          property: mockProp,
          matchScore: 98,
          highlightReason: 'Ubicación premium en Miraflores',
        },
      ],
    })

    render(<AssistantWidget {...defaultProps} open={true} />)

    const input = screen.getByLabelText('Mensaje para el Concierge IA')
    await user.type(input, 'Busco departamento en Miraflores')

    const sendBtn = screen.getByRole('button', { name: 'Enviar mensaje' })
    expect(sendBtn).not.toBeDisabled()
    await user.click(sendBtn)

    await waitFor(() => {
      expect(askSpy).toHaveBeenCalled()
      expect(screen.getByText('Busco departamento en Miraflores')).toBeInTheDocument()
      expect(screen.getByText('He encontrado esta excelente opción para ti.')).toBeInTheDocument()
      expect(screen.getByText(/98% MATCH AI/i)).toBeInTheDocument()
      expect(screen.getByText('Departamento moderno en Miraflores')).toBeInTheDocument()
    })
  })

  it('permite pulsar un chip rápido y ejecutar acciones en la tarjeta recomendada', async () => {
    const user = userEvent.setup()
    jest.spyOn(aiConcierge, 'askConciergeAI').mockResolvedValueOnce({
      reply: 'Opciones en Miraflores listas.',
      recommendations: [
        {
          property: mockProp,
          matchScore: 95,
          highlightReason: 'Finos acabados',
        },
      ],
    })

    render(<AssistantWidget {...defaultProps} open={true} />)

    const chipBtn = screen.getByRole('button', { name: '🏢 Depas en Miraflores' })
    await user.click(chipBtn)

    await waitFor(() => {
      expect(screen.getByText('Opciones en Miraflores listas.')).toBeInTheDocument()
      expect(screen.getByText(/95% MATCH AI/i)).toBeInTheDocument()
    })

    // Clic en Ver inmueble
    const detailBtn = screen.getByRole('button', { name: 'Ver inmueble' })
    await user.click(detailBtn)
    expect(defaultProps.onOpenProperty).toHaveBeenCalledWith('prop-123')

    // Clic en Agendar visita
    const visitBtn = screen.getByRole('button', { name: 'Agendar visita' })
    await user.click(visitBtn)
    expect(defaultProps.onBookVisit).toHaveBeenCalledWith('Departamento moderno en Miraflores', 'prop-123')
  })
})
