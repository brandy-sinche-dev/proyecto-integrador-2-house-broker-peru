// =============================================================
// Pruebas unitarias del componente Select
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const OPTIONS = [
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'TERRENO', label: 'Terreno' },
]

describe('Componente Select (Pruebas Unitarias)', () => {
  it('renderiza el elemento select con todas sus opciones', () => {
    render(<Select options={OPTIONS} data-testid="property-type-select" />)

    const select = screen.getByTestId('property-type-select')
    expect(select).toBeInTheDocument()
    expect(select).toHaveClass('hselect')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
    expect(options[0]).toHaveTextContent('Departamento')
    expect(options[0]).toHaveValue('DEPARTAMENTO')
    expect(options[1]).toHaveTextContent('Casa')
    expect(options[2]).toHaveTextContent('Oficina')
    expect(options[3]).toHaveTextContent('Terreno')
  })

  it('renderiza una opción inicial deshabilitada y oculta cuando se proporciona placeholder', () => {
    render(
      <Select
        options={OPTIONS}
        placeholder="Selecciona un tipo de propiedad"
        defaultValue=""
        data-testid="property-type-select"
      />
    )

    const options = screen.getAllByRole('option', { hidden: true })
    expect(options).toHaveLength(5)

    const placeholderOption = options[0]
    expect(placeholderOption).toHaveTextContent('Selecciona un tipo de propiedad')
    expect(placeholderOption).toHaveValue('')
    expect(placeholderOption).toBeDisabled()
    expect(placeholderOption).toHaveAttribute('hidden')
  })

  it('dispara el evento onChange al seleccionar una opción diferente', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    render(
      <Select
        options={OPTIONS}
        defaultValue="DEPARTAMENTO"
        onChange={handleChange}
        data-testid="property-type-select"
      />
    )

    const select = screen.getByTestId('property-type-select')
    await user.selectOptions(select, 'CASA')

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(select).toHaveValue('CASA')
  })

  it('aplica la clase hselect--invalid cuando invalid={true}', () => {
    render(<Select options={OPTIONS} invalid data-testid="invalid-select" />)

    const select = screen.getByTestId('invalid-select')
    expect(select).toHaveClass('hselect', 'hselect--invalid')
  })

  it('no aplica hselect--invalid cuando invalid={false} o ausente', () => {
    render(<Select options={OPTIONS} data-testid="valid-select" />)

    const select = screen.getByTestId('valid-select')
    expect(select).not.toHaveClass('hselect--invalid')
  })

  it('combina clases CSS personalizadas pasadas en className', () => {
    render(<Select options={OPTIONS} className="custom-select-ui" data-testid="styled-select" />)

    const select = screen.getByTestId('styled-select')
    expect(select).toHaveClass('hselect', 'custom-select-ui')
  })

  it('respeta la propiedad disabled deshabilitando el selector', () => {
    render(<Select options={OPTIONS} disabled data-testid="disabled-select" />)

    const select = screen.getByTestId('disabled-select')
    expect(select).toBeDisabled()
  })
})
