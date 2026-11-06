// =============================================================
// Pruebas unitarias del componente Field (Rótulo y Accesibilidad)
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import { Field } from './Field'

describe('Componente Field (Pruebas Unitarias)', () => {
  it('renderiza la etiqueta de texto y envuelve el control hijo asociando el id', () => {
    render(
      <Field label="Nombre completo">
        <input type="text" placeholder="Ingresa tu nombre" />
      </Field>
    )

    const label = screen.getByText('Nombre completo')
    const input = screen.getByPlaceholderText('Ingresa tu nombre')

    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id')
    expect(label.closest('label')).toHaveClass('hfield')
  })

  it('muestra el asterisco de requerido y asigna aria-required al control hijo cuando required={true}', () => {
    render(
      <Field label="Correo electrónico" required>
        <input type="email" placeholder="correo@ejemplo.com" />
      </Field>
    )

    expect(screen.getByText('*')).toHaveClass('hfield__req')
    const input = screen.getByPlaceholderText('correo@ejemplo.com')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('no muestra asterisco ni asigna aria-required cuando required es false u omitido', () => {
    render(
      <Field label="Teléfono de contacto">
        <input type="tel" placeholder="999999999" />
      </Field>
    )

    expect(screen.queryByText('*')).not.toBeInTheDocument()
    const input = screen.getByPlaceholderText('999999999')
    expect(input).not.toHaveAttribute('aria-required')
  })

  it('renderiza el mensaje de ayuda (hint) y lo enlaza mediante aria-describedby', () => {
    render(
      <Field label="Contraseña" hint="Debe contener al menos 8 caracteres y un número">
        <input type="password" placeholder="Contraseña segura" />
      </Field>
    )

    const hint = screen.getByText('Debe contener al menos 8 caracteres y un número')
    expect(hint).toHaveClass('hfield__hint')

    const input = screen.getByPlaceholderText('Contraseña segura')
    expect(input).toHaveAttribute('aria-describedby', hint.getAttribute('id'))
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('renderiza el mensaje de error con role="alert", asigna aria-invalid="true" y actualiza aria-describedby', () => {
    render(
      <Field
        label="Precio en Soles"
        hint="El precio debe estar en moneda nacional"
        error="El precio mínimo no puede ser negativo"
      >
        <input type="number" placeholder="0.00" />
      </Field>
    )

    const errorAlert = screen.getByRole('alert')
    expect(errorAlert).toHaveTextContent('El precio mínimo no puede ser negativo')
    expect(errorAlert).toHaveClass('hfield__error')

    // Cuando hay error, el hint debe ocultarse para priorizar la corrección
    expect(screen.queryByText('El precio debe estar en moneda nacional')).not.toBeInTheDocument()

    const input = screen.getByPlaceholderText('0.00')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', errorAlert.getAttribute('id'))
  })

  it('combina clases CSS personalizadas pasadas en className', () => {
    render(
      <Field label="Dirección" className="custom-field-grid col-span-2">
        <input type="text" placeholder="Av. Principal 123" />
      </Field>
    )

    const wrapper = screen.getByText('Dirección').closest('label')
    expect(wrapper).toHaveClass('hfield', 'custom-field-grid', 'col-span-2')
  })
})
