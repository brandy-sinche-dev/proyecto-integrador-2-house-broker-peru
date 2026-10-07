import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { FavoriteButton } from './FavoriteButton'

expect.extend(toHaveNoViolations)

// JSDOM verifica la semántica. Contraste, tamaño y foco visible se auditan en navegador.
const axeConfig = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
}

describe('FavoriteButton: accesibilidad (TASK-A11Y-PROP-05)', () => {
  it.each([false, true])('AXE A/AA sin violaciones (guardado=%s)', async (saved) => {
    const { container } = render(
      <FavoriteButton saved={saved} propertyTitle="Departamento en Miraflores" onToggle={jest.fn()} />,
    )

    expect(await axe(container, axeConfig)).toHaveNoViolations()
  })

  it.each(['{Enter}', ' '])('conmuta con %s sin activar la tarjeta contenedora', async (key) => {
    const openCard = jest.fn()
    const user = userEvent.setup()
    function Card() {
      const [saved, setSaved] = useState(false)
      return (
        <article onClick={openCard}>
          <FavoriteButton
            saved={saved}
            propertyTitle="Departamento en Miraflores"
            onToggle={() => setSaved((value) => !value)}
          />
        </article>
      )
    }
    render(<Card />)

    await user.tab()
    const button = screen.getByRole('button', { name: 'Guardar Departamento en Miraflores' })
    expect(button).toHaveFocus()
    await user.keyboard(key)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAccessibleName('Quitar Departamento en Miraflores de guardados')
    await user.keyboard(key)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveFocus()
    expect(openCard).not.toHaveBeenCalled()
  })
})
