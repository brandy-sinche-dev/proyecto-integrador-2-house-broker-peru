import { StrictMode, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LoginPrompt } from './LoginPrompt'

expect.extend(toHaveNoViolations)

const axeConfig = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  // JSDOM no calcula contraste; se comprueba con CSS real en navegador.
  rules: { 'color-contrast': { enabled: false } },
}

function Page({ onLogin = jest.fn() }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Guardar inmueble</button>
      <a href="#catalogo">Catálogo</a>
      {open && <LoginPrompt onClose={() => setOpen(false)} onLogin={onLogin} />}
    </>
  )
}

describe('LoginPrompt: accesibilidad (TASK-A11Y-PROP-05)', () => {
  it('AXE A/AA sin violaciones, con nombre y descripción del diálogo', async () => {
    const { container } = render(<LoginPrompt onClose={jest.fn()} onLogin={jest.fn()} />)

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Inicia sesión para guardar favoritos')
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Guardamos tu elección: al entrar, el inmueble quedará marcado para ti.',
    )
    expect(await axe(container, axeConfig)).toHaveNoViolations()
  })

  it('enfoca el login y mantiene Tab y Shift+Tab dentro del diálogo', async () => {
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: 'Guardar inmueble' }))

    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Ahora no' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Ahora no' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus()
  })

  it.each(['Escape', 'Ahora no', 'Cerrar', 'fondo'])('cierra con %s y devuelve el foco al corazón, incluso en StrictMode', async (action) => {
    const user = userEvent.setup()
    render(<StrictMode><Page /></StrictMode>)
    const trigger = screen.getByRole('button', { name: 'Guardar inmueble' })
    await user.click(trigger)

    if (action === 'Escape') await user.keyboard('{Escape}')
    else if (action === 'fondo') await user.click(screen.getByRole('dialog').parentElement)
    else await user.click(screen.getByRole('button', { name: action }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('permite iniciar sesión con Enter sin disparar el cierre del fondo', async () => {
    const onLogin = jest.fn()
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<LoginPrompt onClose={onClose} onLogin={onLogin} />)

    await user.keyboard('{Enter}')

    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('no roba el foco si cambian los callbacks mientras el modal está abierto', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<LoginPrompt onClose={jest.fn()} onLogin={jest.fn()} />)
    await user.tab()
    const onClose = jest.fn()
    rerender(<LoginPrompt onClose={onClose} onLogin={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Ahora no' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
