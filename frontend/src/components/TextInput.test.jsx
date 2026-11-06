// =============================================================
// Pruebas unitarias del componente TextInput
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from './TextInput'

describe('Componente TextInput (Pruebas Unitarias)', () => {
  it('renderiza un input de texto básico con clase hinput', () => {
    render(<TextInput placeholder="Escribe tu nombre" />)

    const input = screen.getByPlaceholderText('Escribe tu nombre')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('hinput')
    expect(input).not.toHaveClass('hinput--invalid')
  })

  it('permite al usuario escribir texto y dispara el evento onChange', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    render(<TextInput placeholder="Correo electrónico" onChange={handleChange} />)

    const input = screen.getByPlaceholderText('Correo electrónico')
    await user.type(input, 'contacto@housebroker.pe')

    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('contacto@housebroker.pe')
  })

  it('aplica la clase hinput--invalid cuando invalid={true}', () => {
    render(<TextInput placeholder="Precio" invalid />)

    const input = screen.getByPlaceholderText('Precio')
    expect(input).toHaveClass('hinput', 'hinput--invalid')
  })

  it('no aplica hinput--invalid cuando invalid={false} o no se especifica', () => {
    render(<TextInput placeholder="Dirección" invalid={false} />)

    const input = screen.getByPlaceholderText('Dirección')
    expect(input).toHaveClass('hinput')
    expect(input).not.toHaveClass('hinput--invalid')
  })

  it('combina clases CSS personalizadas pasadas por className', () => {
    render(<TextInput placeholder="Teléfono" className="w-full shadow-sm" />)

    const input = screen.getByPlaceholderText('Teléfono')
    expect(input).toHaveClass('hinput', 'w-full', 'shadow-sm')
  })

  it('respeta la propiedad disabled impidiendo la edición', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    render(<TextInput placeholder="No editable" disabled onChange={handleChange} />)

    const input = screen.getByPlaceholderText('No editable')
    expect(input).toBeDisabled()

    await user.type(input, 'intento').catch(() => {})
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('soporta atributos HTML estándar como type="number", min y max', () => {
    render(<TextInput type="number" min={0} max={10} placeholder="Habitaciones" />)

    const input = screen.getByPlaceholderText('Habitaciones')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '10')
  })
})
