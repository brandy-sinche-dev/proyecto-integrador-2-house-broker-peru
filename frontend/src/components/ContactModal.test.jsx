// =============================================================
// Pruebas unitarias del modal de contacto directo (ContactModal)
// =============================================================

import { render, screen, fireEvent, act } from '@testing-library/react'
import { ContactModal } from './ContactModal'

describe('Componente ContactModal (Pruebas Unitarias)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('no renderiza contenido cuando isOpen={false}', () => {
    const { container } = render(<ContactModal isOpen={false} onClose={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza la cabecera, los canales directos (WhatsApp y Teléfono) y el formulario', () => {
    render(<ContactModal {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Contacta con un Asesor' })).toBeInTheDocument()

    // Enlace de WhatsApp directo
    const whatsappLink = screen.getByRole('link', { name: /Chatear por WhatsApp/i })
    expect(whatsappLink).toHaveAttribute('href', expect.stringContaining('https://wa.me/51908941175'))
    expect(whatsappLink).toHaveAttribute('target', '_blank')
    expect(whatsappLink).toHaveAttribute('rel', 'noreferrer')

    // Enlace telefónico directo
    const phoneLink = screen.getByRole('link', { name: /968 614 624/i })
    expect(phoneLink).toHaveAttribute('href', 'tel:968614624')

    // Formulario de contacto
    expect(screen.getByPlaceholderText('Ej. Juan Pérez')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej. 999 888 777')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar que un asesor me contacte' })).toBeInTheDocument()
  })

  it('permite completar el formulario y muestra la confirmación de éxito', async () => {
    render(<ContactModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Ej. Juan Pérez')
    const phoneInput = screen.getByPlaceholderText('Ej. 999 888 777')
    const submitBtn = screen.getByRole('button', { name: 'Solicitar que un asesor me contacte' })

    fireEvent.change(nameInput, { target: { value: 'María López' } })
    fireEvent.change(phoneInput, { target: { value: '987654321' } })

    fireEvent.click(submitBtn)

    act(() => {
      jest.advanceTimersByTime(700)
    })

    expect(screen.getByRole('heading', { level: 3, name: '¡Solicitud enviada con éxito!' })).toBeInTheDocument()
    expect(screen.getByText(/María López/i)).toBeInTheDocument()
    expect(screen.getByText(/987654321/i)).toBeInTheDocument()

    // Botón de cierre en pantalla de éxito
    const okBtn = screen.getByRole('button', { name: 'Entendido' })
    fireEvent.click(okBtn)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al hacer clic en el botón de cerrar (×)', () => {
    render(<ContactModal {...defaultProps} />)

    const closeBtn = screen.getByRole('button', { name: 'Cerrar' })
    fireEvent.click(closeBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal al presionar la tecla Escape', () => {
    render(<ContactModal {...defaultProps} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
