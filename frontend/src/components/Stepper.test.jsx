// =============================================================
// Pruebas unitarias del componente Stepper
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import { Stepper } from './Stepper'

const STEPS = [
  { id: 'basic', label: 'Datos principales' },
  { id: 'features', label: 'Características' },
  { id: 'pricing', label: 'Precio y modalidad' },
  { id: 'media', label: 'Fotografías' },
]

describe('Componente Stepper (Pruebas Unitarias)', () => {
  it('renderiza la lista ordenada con todos los pasos definidos', () => {
    render(<Stepper steps={STEPS} current={0} />)

    const list = screen.getByRole('list')
    expect(list).toHaveClass('hstepper')

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(screen.getByText('Datos principales')).toBeInTheDocument()
    expect(screen.getByText('Características')).toBeInTheDocument()
    expect(screen.getByText('Precio y modalidad')).toBeInTheDocument()
    expect(screen.getByText('Fotografías')).toBeInTheDocument()
  })

  it('marca el paso actual con aria-current="step" y la clase hstepper__item--active', () => {
    render(<Stepper steps={STEPS} current={1} />)

    const items = screen.getAllByRole('listitem')
    // Paso 0: completado
    expect(items[0]).toHaveClass('hstepper__item--done')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[0]).toHaveTextContent('✓')

    // Paso 1: activo
    expect(items[1]).toHaveClass('hstepper__item--active')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[1]).toHaveTextContent('2')

    // Pasos 2 y 3: pendientes
    expect(items[2]).toHaveClass('hstepper__item--todo')
    expect(items[2]).not.toHaveAttribute('aria-current')
    expect(items[2]).toHaveTextContent('3')

    expect(items[3]).toHaveClass('hstepper__item--todo')
    expect(items[3]).not.toHaveAttribute('aria-current')
    expect(items[3]).toHaveTextContent('4')
  })

  it('marca todos los pasos como completados cuando current es mayor o igual al total de pasos', () => {
    render(<Stepper steps={STEPS} current={4} />)

    const items = screen.getAllByRole('listitem')
    items.forEach((item) => {
      expect(item).toHaveClass('hstepper__item--done')
      expect(item).not.toHaveAttribute('aria-current')
      expect(item).toHaveTextContent('✓')
    })
  })

  it('renderiza líneas de conexión entre pasos intermedios excluyendo el último', () => {
    const { container } = render(<Stepper steps={STEPS} current={2} />)

    const lines = container.querySelectorAll('.hstepper__line')
    expect(lines).toHaveLength(3) // 4 pasos => 3 líneas conectoras
  })
})
