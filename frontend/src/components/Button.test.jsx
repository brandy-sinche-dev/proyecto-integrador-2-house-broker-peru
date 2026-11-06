// =============================================================
// Pruebas unitarias del componente Button
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Componente Button (Pruebas Unitarias)', () => {
  it('renderiza con las propiedades por defecto (variante primary y tamaño md)', () => {
    render(<Button>Guardar</Button>)

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('hbtn', 'hbtn--primary', 'hbtn--md')
    expect(button).not.toBeDisabled()
  })

  it.each([
    ['primary', 'hbtn--primary'],
    ['neutral', 'hbtn--neutral'],
    ['ghost', 'hbtn--ghost'],
    ['danger', 'hbtn--danger'],
  ])('aplica la clase correspondiente a la variante %s', (variant, expectedClass) => {
    render(<Button variant={variant}>Acción</Button>)

    const button = screen.getByRole('button', { name: 'Acción' })
    expect(button).toHaveClass(expectedClass)
  })

  it.each([
    ['sm', 'hbtn--sm'],
    ['md', 'hbtn--md'],
  ])('aplica la clase correspondiente al tamaño %s', (size, expectedClass) => {
    render(<Button size={size}>Tamaño</Button>)

    const button = screen.getByRole('button', { name: 'Tamaño' })
    expect(button).toHaveClass(expectedClass)
  })

  it('combina clases CSS personalizadas pasadas por className', () => {
    render(<Button className="custom-button-class extra-margin">Enviar</Button>)

    const button = screen.getByRole('button', { name: 'Enviar' })
    expect(button).toHaveClass('hbtn', 'custom-button-class', 'extra-margin')
  })

  it('ejecuta el callback onClick al interactuar con el usuario', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button onClick={handleClick}>Hacer clic</Button>)

    const button = screen.getByRole('button', { name: 'Hacer clic' })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('no ejecuta el callback onClick cuando está deshabilitado (disabled)', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button disabled onClick={handleClick}>Inactivo</Button>)

    const button = screen.getByRole('button', { name: 'Inactivo' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('propaga atributos HTML estándar como type, aria-label y title', () => {
    render(
      <Button type="submit" aria-label="Botón de envío" title="Confirmar formulario">
        Enviar
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Botón de envío' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('title', 'Confirmar formulario')
  })
})
