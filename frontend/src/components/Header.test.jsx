// =============================================================
// Pruebas unitarias del componente Header
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'
import * as AuthContextModule from '../context/AuthContext'

jest.mock('../context/AuthContext')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('Componente Header (Pruebas Unitarias)', () => {
  const defaultProps = {
    current: 'propiedades',
    conciergeOpen: false,
    savedCount: 3,
    visitsCount: 1,
    onNavigate: jest.fn(),
    onOpenLogin: jest.fn(),
  }

  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    AuthContextModule.useAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    })
  })

  function renderHeader(props = {}) {
    return render(
      <MemoryRouter>
        <Header {...defaultProps} {...props} />
      </MemoryRouter>
    )
  }

  it('renderiza el logo institucional y navega al inicio al hacer clic', async () => {
    const user = userEvent.setup()
    renderHeader()

    const brandBtn = screen.getByRole('button', { name: /House Broker Perú Logo/i })
    expect(brandBtn).toBeInTheDocument()

    await user.click(brandBtn)
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('inicio')
  })

  it('renderiza la lista de navegación principal y resalta la sección activa', () => {
    renderHeader({ current: 'propiedades' })

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(nav).toBeInTheDocument()

    const propLink = screen.getByRole('button', { name: /Propiedades/i })
    expect(propLink).toHaveClass('hdr__link--active')
    expect(propLink).toHaveAttribute('aria-current', 'page')

    const inicioLink = screen.getByRole('button', { name: 'Inicio' })
    expect(inicioLink).not.toHaveClass('hdr__link--active')
    expect(inicioLink).not.toHaveAttribute('aria-current')
  })

  it('muestra los contadores badge en Guardados y Visitas cuando son mayores a 0', () => {
    renderHeader({ savedCount: 5, visitsCount: 2 })

    expect(screen.getByRole('button', { name: /Guardados 5/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Visitas 2/i })).toBeInTheDocument()
  })

  it('llama a onNavigate al seleccionar un elemento de la navegación', async () => {
    const user = userEvent.setup()
    renderHeader()

    const guardadosBtn = screen.getByRole('button', { name: /Guardados/i })
    await user.click(guardadosBtn)

    expect(defaultProps.onNavigate).toHaveBeenCalledWith('guardados')
  })

  it('muestra el botón "Iniciar Sesión" y ejecuta onOpenLogin si no hay sesión activa', async () => {
    const user = userEvent.setup()
    renderHeader()

    const loginBtn = screen.getAllByRole('button', { name: 'Iniciar Sesión' })[0]
    expect(loginBtn).toBeInTheDocument()

    await user.click(loginBtn)
    expect(defaultProps.onOpenLogin).toHaveBeenCalledTimes(1)
  })

  it('muestra el nombre y rol del usuario cuando ha iniciado sesión', () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'cliente@housebroker.pe',
        full_name: 'Carlos Mendoza',
        role: 'CLIENTE',
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    })

    renderHeader()

    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('CLIENTE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar Sesión' })).not.toBeInTheDocument()
  })

  it('despliega el menú de usuario y permite cerrar sesión con signOut', async () => {
    const user = userEvent.setup()
    AuthContextModule.useAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@housebroker.pe',
        full_name: 'Admin General',
        role: 'ADMINISTRADOR',
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    })

    renderHeader()

    // Abrir menú de usuario
    const userBadge = screen.getByText('Admin').closest('div')
    await user.click(userBadge)

    expect(screen.getByRole('button', { name: /Ir al Panel/i })).toBeInTheDocument()
    const logoutBtn = screen.getByRole('button', { name: /Cerrar sesión/i })
    expect(logoutBtn).toBeInTheDocument()

    await user.click(logoutBtn)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})
