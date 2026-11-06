// =============================================================
// Pruebas unitarias del modal de autenticación (LoginModal)
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginModal } from './LoginModal'
import * as AuthContextModule from '../../context/AuthContext'

jest.mock('../../context/AuthContext')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { from: { pathname: '/propiedades' } } }),
}))

describe('Componente LoginModal (Pruebas Unitarias)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  }

  const mockSignIn = jest.fn()
  const mockSignUp = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    AuthContextModule.useAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: jest.fn(),
    })
  })

  function renderModal(props = {}) {
    return render(
      <MemoryRouter>
        <LoginModal {...defaultProps} {...props} />
      </MemoryRouter>
    )
  }

  it('no renderiza contenido cuando isOpen={false}', () => {
    const { container } = renderModal({ isOpen: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza el formulario de inicio de sesión por defecto', () => {
    renderModal()

    expect(screen.getByRole('heading', { level: 2, name: '¡Bienvenido a HOUSE BROKER!' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tucorreo@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar como invitado/i })).toBeInTheDocument()
  })

  it('permite alternar la visibilidad de la contraseña (mostrar / ocultar)', async () => {
    const user = userEvent.setup()
    renderModal()

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // El botón de toggle está ubicado junto al input de contraseña
    const toggleBtn = passwordInput.parentElement.querySelector('button')
    await user.click(toggleBtn)

    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('cambia al modo de registro al hacer clic en "Regístrate aquí"', async () => {
    const user = userEvent.setup()
    renderModal()

    const registerLink = screen.getByText('Regístrate aquí')
    await user.click(registerLink)

    expect(screen.getByRole('heading', { level: 2, name: 'Únete a HOUSE BROKER' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('999 888 777')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  })

  it('inicia sesión exitosamente y redirige según el rol (ADMINISTRADOR)', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@housebroker.pe',
      role: 'ADMINISTRADOR',
    })

    renderModal()

    await user.type(screen.getByPlaceholderText('tucorreo@email.com'), 'admin@housebroker.pe')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Housebroker2026.')

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('admin@housebroker.pe', 'Housebroker2026.')
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
    })
  })

  it('inicia sesión con rol AGENTE y redirige a /agente', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({
      id: 'agent-1',
      email: 'agente@housebroker.pe',
      role: 'AGENTE',
    })

    renderModal()

    await user.type(screen.getByPlaceholderText('tucorreo@email.com'), 'agente@housebroker.pe')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Housebroker2026.')

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/agente', { replace: true })
    })
  })

  it('muestra un mensaje de error si las credenciales son incorrectas', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValueOnce({
      response: { data: { detail: 'Credenciales inválidas.' } },
    })

    renderModal()

    await user.type(screen.getByPlaceholderText('tucorreo@email.com'), 'desconocido@correo.pe')
    await user.type(screen.getByPlaceholderText('••••••••'), 'clave_incorrecta')

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas.')).toBeInTheDocument()
    })
  })

  it('cierra el modal al hacer clic en "Continuar como invitado"', async () => {
    const user = userEvent.setup()
    renderModal()

    const guestBtn = screen.getByRole('button', { name: /Continuar como invitado/i })
    await user.click(guestBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al hacer clic en el botón de cerrar (×)', async () => {
    const user = userEvent.setup()
    renderModal()

    const closeBtn = screen.getByRole('button', { name: 'Cerrar' })
    await user.click(closeBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
