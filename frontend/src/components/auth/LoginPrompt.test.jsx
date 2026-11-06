// =============================================================
// Pruebas unitarias del componente LoginPrompt (HU-PROP-05 CA-3)
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPrompt } from './LoginPrompt'

describe('Componente LoginPrompt (Pruebas Unitarias)', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onLogin: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza el título informativo y la descripción del aviso de inicio de sesión', () => {
    render(<LoginPrompt {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Inicia sesión para guardar favoritos' })).toBeInTheDocument()
    expect(screen.getByText('Guardamos tu elección: al entrar, el inmueble quedará marcado para ti.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('ejecuta onLogin al hacer clic en el botón "Iniciar sesión"', async () => {
    const user = userEvent.setup()
    render(<LoginPrompt {...defaultProps} />)

    const loginBtn = screen.getByRole('button', { name: 'Iniciar sesión' })
    await user.click(loginBtn)

    expect(defaultProps.onLogin).toHaveBeenCalledTimes(1)
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('ejecuta onClose al hacer clic en el botón "Ahora no"', async () => {
    const user = userEvent.setup()
    render(<LoginPrompt {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: 'Ahora no' })
    await user.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    expect(defaultProps.onLogin).not.toHaveBeenCalled()
  })

  it('ejecuta onClose al hacer clic en el botón de cerrar ("Cerrar")', async () => {
    const user = userEvent.setup()
    render(<LoginPrompt {...defaultProps} />)

    const closeBtn = screen.getByRole('button', { name: 'Cerrar' })
    await user.click(closeBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('ejecuta onClose al hacer clic sobre el fondo exterior', () => {
    const { container } = render(<LoginPrompt {...defaultProps} />)

    const presentation = container.querySelector('.lprompt')
    fireEvent.click(presentation)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('ejecuta onClose al pulsar la tecla Escape dentro del diálogo', () => {
    render(<LoginPrompt {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
