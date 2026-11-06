// =============================================================
// Pruebas unitarias del componente AssistantWidget (Concierge IA)
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantWidget } from './AssistantWidget'

describe('Componente AssistantWidget (Pruebas Unitarias)', () => {
  const defaultProps = {
    open: false,
    savedCount: 0,
    visitsCount: 0,
    onToggle: jest.fn(),
    onNavigate: jest.fn(),
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
})
