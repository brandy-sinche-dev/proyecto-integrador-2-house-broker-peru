// =============================================================
// Pruebas unitarias del componente Footer
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Componente Footer (Pruebas Unitarias)', () => {
  it('renderiza la estructura principal de pie de página con el logo corporativo', () => {
    render(<Footer />)

    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('footer')

    const logo = screen.getByRole('img', { name: 'House Broker Perú Logo' })
    expect(logo).toHaveAttribute('src', '/logo.png')
  })

  it('renderiza los canales de contacto con sus respectivos enlaces y protocolos', () => {
    render(<Footer />)

    expect(screen.getByRole('heading', { level: 4, name: 'Contáctanos' })).toBeInTheDocument()

    // Enlace de llamada telefónica directa (tel:)
    const phoneLink = screen.getByRole('link', { name: '968 614 624' })
    expect(phoneLink).toHaveAttribute('href', 'tel:968614624')

    // Enlace de mensajería WhatsApp
    const whatsappLink = screen.getByRole('link', { name: '+51 908 941 175' })
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/51908941175')
    expect(whatsappLink).toHaveAttribute('target', '_blank')
    expect(whatsappLink).toHaveAttribute('rel', 'noreferrer')

    // Enlace de correo electrónico (mailto:)
    const mailLink = screen.getByRole('link', { name: 'info@housebrokerperu.com' })
    expect(mailLink).toHaveAttribute('href', 'mailto:info@housebrokerperu.com')
  })

  it('renderiza la sección de inversión y aliados estratégicos (CoDIP y DCI)', () => {
    render(<Footer />)

    expect(screen.getByRole('heading', { level: 4, name: 'Invierte con nosotros' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vender tu inmueble' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quiero ser inversionista' })).toBeInTheDocument()

    // Respaldo institucional
    expect(screen.getByText('CoDIP')).toBeInTheDocument()
    expect(screen.getByText('Confederación de Desarrolladores Inmobiliarios del Perú')).toBeInTheDocument()
    expect(screen.getByText('DCI')).toBeInTheDocument()
    expect(screen.getByText(/DEFENSORÍA/i)).toBeInTheDocument()
  })

  it('renderiza los enlaces legales: Libro de Reclamaciones, Políticas y Términos', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: /Libro de Reclamaciones/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Políticas de cookies' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Políticas de privacidad' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toBeInTheDocument()
  })
})
