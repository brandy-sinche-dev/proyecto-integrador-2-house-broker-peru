// =============================================================
// Pruebas unitarias del componente ToggleGroup
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToggleGroup } from './ToggleGroup'

const OPTIONS = [
  { value: 'VENTA', label: 'Venta' },
  { value: 'ALQUILER', label: 'Alquiler' },
]

describe('Componente ToggleGroup (Pruebas Unitarias)', () => {
  it('renderiza el contenedor con role="group" y todos los botones de opción', () => {
    render(<ToggleGroup options={OPTIONS} value="VENTA" onChange={jest.fn()} />)

    const group = screen.getByRole('group')
    expect(group).toHaveClass('htoggle')

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveTextContent('Venta')
    expect(buttons[1]).toHaveTextContent('Alquiler')
  })

  it('marca la opción seleccionada con aria-pressed="true" y clase activa', () => {
    render(<ToggleGroup options={OPTIONS} value="ALQUILER" onChange={jest.fn()} />)

    const ventaBtn = screen.getByRole('button', { name: 'Venta' })
    const alquilerBtn = screen.getByRole('button', { name: 'Alquiler' })

    expect(alquilerBtn).toHaveAttribute('aria-pressed', 'true')
    expect(alquilerBtn).toHaveClass('htoggle__item--active')

    expect(ventaBtn).toHaveAttribute('aria-pressed', 'false')
    expect(ventaBtn).not.toHaveClass('htoggle__item--active')
  })

  it('llama a onChange con el valor de la opción cuando el usuario hace clic', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    render(<ToggleGroup options={OPTIONS} value="VENTA" onChange={handleChange} />)

    const alquilerBtn = screen.getByRole('button', { name: 'Alquiler' })
    await user.click(alquilerBtn)

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('ALQUILER')
  })

  it('maneja el estado cuando ninguna opción está seleccionada (value=undefined)', () => {
    render(<ToggleGroup options={OPTIONS} value={undefined} onChange={jest.fn()} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false')
      expect(btn).not.toHaveClass('htoggle__item--active')
    })
  })
})
