import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Home } from './Home'

function renderHome(onNavigate = jest.fn()) {
  return {
    onNavigate,
    ...render(
      <BrowserRouter>
        <Home onNavigate={onNavigate} />
      </BrowserRouter>
    ),
  }
}

describe('Componente Home — Sección Tipos de Propiedades', () => {
  test('renderiza el encabezado y subtítulo de la sección Tipos de Propiedades', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 2, name: /Tipos de Propiedades/i })).toBeInTheDocument()
    expect(screen.getByText(/Portafolio Inmobiliario/i)).toBeInTheDocument()
    expect(
      screen.getByText(/catálogo diverso para cada necesidad comercial o residencial/i)
    ).toBeInTheDocument()
  })

  test('renderiza las 3 tarjetas principales con fotografía, descripción y enlace', () => {
    renderHome()

    // 1. Departamentos
    expect(screen.getByRole('button', { name: /Explorar departamentos en venta y alquiler/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Departamentos' })).toBeInTheDocument()
    expect(screen.getByText(/Flats, dúplex y penthouses en las zonas residenciales/i)).toBeInTheDocument()
    expect(screen.getByText(/Explorar departamentos/i)).toBeInTheDocument()

    // 2. Casas
    expect(screen.getByRole('button', { name: /Explorar casas unifamiliares y residenciales/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Casas' })).toBeInTheDocument()
    expect(screen.getByText(/Residencias familiares y casas de campo/i)).toBeInTheDocument()
    expect(screen.getByText(/Explorar casas/i)).toBeInTheDocument()

    // 3. Locales comerciales
    expect(screen.getByRole('button', { name: /Explorar locales comerciales de alto tránsito/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Locales comerciales' })).toBeInTheDocument()
    expect(screen.getByText(/Puntos estratégicos de alto tránsito peatonal/i)).toBeInTheDocument()
    expect(screen.getByText(/Explorar locales comerciales/i)).toBeInTheDocument()
  })

  test('renderiza las 4 tarjetas compactas con sus títulos e iconos', () => {
    renderHome()

    expect(screen.getByRole('button', { name: /Ver terrenos para constructoras/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Terrenos para constructoras' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Ver oficinas y plantas ejecutivas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Oficinas' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Ver casas de playa y campo/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Casas de playa y campo' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Ver lotes industriales/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Lotes industriales' })).toBeInTheDocument()
  })

  test('al hacer clic en una tarjeta principal navega hacia propiedades con filtro', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHome()

    const btnDepa = screen.getByRole('button', { name: /Explorar departamentos en venta y alquiler/i })
    await user.click(btnDepa)

    expect(onNavigate).toHaveBeenCalledWith('propiedades')
  })

  test('al hacer clic en una tarjeta compacta navega hacia propiedades con filtro', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHome()

    const btnTerreno = screen.getByRole('button', { name: /Ver terrenos para constructoras/i })
    await user.click(btnTerreno)

    expect(onNavigate).toHaveBeenCalledWith('propiedades')
  })

  test('permite navegar y enfocar las tarjetas mediante teclado accesible', async () => {
    const user = userEvent.setup()
    renderHome()

    const btnHero = screen.getByRole('button', { name: /Ver Propiedades/i })
    btnHero.focus()
    expect(btnHero).toHaveFocus()

    const btnDepa = screen.getByRole('button', { name: /Explorar departamentos en venta y alquiler/i })
    await user.tab()
    expect(btnDepa).toHaveFocus()
  })
})
