// =============================================================
// Pruebas unitarias del botón de favoritos (HU-PROP-05)
// TASK-TEST-PROP-05: alternancia de estados visuales
// =============================================================

import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoriteButton } from './FavoriteButton'

const TITLE = 'Departamento en Miraflores'

describe('FavoriteButton', () => {
  it('se muestra sin guardar por defecto', () => {
    render(<FavoriteButton saved={false} propertyTitle={TITLE} onToggle={jest.fn()} />)

    const button = screen.getByRole('button', { name: `Guardar ${TITLE}` })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveClass('hpc__icon-btn')
    expect(button).not.toHaveClass('is-saved')
  })

  it('refleja el estado guardado en el nombre accesible y la clase visual', () => {
    render(<FavoriteButton saved propertyTitle={TITLE} onToggle={jest.fn()} />)

    const button = screen.getByRole('button', { name: `Quitar ${TITLE} de guardados` })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('hpc__icon-btn', 'is-saved')
  })

  it('alterna el estado visual al pulsar y notifica una sola vez', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()

    function Card() {
      const [saved, setSaved] = useState(false)
      return (
        <FavoriteButton
          saved={saved}
          propertyTitle={TITLE}
          onToggle={() => {
            onToggle()
            setSaved((value) => !value)
          }}
        />
      )
    }

    render(<Card />)
    const button = screen.getByRole('button', { name: `Guardar ${TITLE}` })

    await user.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('is-saved')
    expect(button).toHaveAccessibleName(`Quitar ${TITLE} de guardados`)

    await user.click(button)
    expect(onToggle).toHaveBeenCalledTimes(2)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).not.toHaveClass('is-saved')
    expect(button).toHaveAccessibleName(`Guardar ${TITLE}`)
  })

  it('no propaga el clic a la tarjeta contenedora', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    const onOpenCard = jest.fn()

    render(
      <article onClick={onOpenCard}>
        <FavoriteButton saved={false} propertyTitle={TITLE} onToggle={onToggle} />
      </article>,
    )

    await user.click(screen.getByRole('button', { name: `Guardar ${TITLE}` }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onOpenCard).not.toHaveBeenCalled()
  })

  it('acepta una clase visual personalizada y oculta el icono a lectores de pantalla', () => {
    const { container } = render(
      <FavoriteButton
        saved
        propertyTitle={TITLE}
        onToggle={jest.fn()}
        className="custom-favorite"
      />,
    )

    expect(screen.getByRole('button')).toHaveClass('custom-favorite', 'is-saved')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
