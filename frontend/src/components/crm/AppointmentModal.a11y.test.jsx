// =============================================================
// Pruebas de accesibilidad del modal de reserva de visitas
// TASK-A11Y-CRM-01: diálogo modal, foco y listbox de horarios
// =============================================================

import { StrictMode, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { axe, toHaveNoViolations } from 'jest-axe'
import api from '../../services/axios'
import { AppointmentModal } from './AppointmentModal'

expect.extend(toHaveNoViolations)

const axeConfig = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  // JSDOM no calcula contraste; se comprueba con CSS real en navegador.
  rules: { 'color-contrast': { enabled: false } },
}

const PROPERTY_ID = 'b2c1f5a0-1a2b-4c3d-9e0f-111111111111'
const AVAILABLE_SLOTS_PATH = `/v1/properties/${PROPERTY_ID}/available-slots`

const slots = [
  { start_at: '2026-12-10T14:00:00Z', end_at: '2026-12-10T15:00:00Z', duration_minutes: 60 },
  { start_at: '2026-12-10T16:00:00Z', end_at: '2026-12-10T17:00:00Z', duration_minutes: 60, is_available: false },
  { start_at: '2026-12-10T19:00:00Z', end_at: '2026-12-10T20:00:00Z', duration_minutes: 60 },
]

function Page({ onClose = jest.fn(), isLoggedIn = true }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Agendar visita</button>
      {open && (
        <AppointmentModal
          isOpen
          isLoggedIn={isLoggedIn}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
          onConfirmed={jest.fn()}
          propertyId={PROPERTY_ID}
          propertyTitle="Departamento en Miraflores"
        />
      )}
    </>
  )
}

describe('AppointmentModal: accesibilidad (TASK-A11Y-CRM-01)', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
    mock.onGet(AVAILABLE_SLOTS_PATH).reply(200, {
      property_id: PROPERTY_ID,
      date: '2026-12-10',
      timezone: 'America/Lima',
      total_slots: slots.length,
      slots,
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('AXE A/AA sin violaciones, con nombre y descripción del diálogo', async () => {
    const { container } = render(
      <AppointmentModal
        isOpen
        onClose={jest.fn()}
        onConfirmed={jest.fn()}
        propertyId={PROPERTY_ID}
        propertyTitle="Departamento en Miraflores"
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Reservar Visita')
    expect(dialog).toHaveAccessibleDescription('Departamento en Miraflores')
    expect(await axe(container, axeConfig)).toHaveNoViolations()
  })

  it('AXE A/AA sin violaciones con horarios, incluido uno ocupado', async () => {
    const { container } = render(
      <AppointmentModal
        isOpen
        onClose={jest.fn()}
        onConfirmed={jest.fn()}
        propertyId={PROPERTY_ID}
        propertyTitle="Departamento en Miraflores"
      />,
    )

    fireEvent.change(screen.getByLabelText(/Selecciona una fecha/), { target: { value: '2026-12-10' } })
    expect(await screen.findByRole('option', { name: '09:00 AM' })).toBeInTheDocument()

    expect(await axe(container, axeConfig)).toHaveNoViolations()
  })

  it('AXE A/AA sin violaciones en el aviso de inicio de sesión', async () => {
    const { container } = render(
      <AppointmentModal
        isOpen
        isLoggedIn={false}
        onClose={jest.fn()}
        onConfirmed={jest.fn()}
        propertyId={PROPERTY_ID}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Inicia sesión requerida')
    expect(await axe(container, axeConfig)).toHaveNoViolations()
  })

  it('enfoca la fecha al abrir y mantiene Tab y Shift+Tab dentro del diálogo', async () => {
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: 'Agendar visita' }))

    const date = screen.getByLabelText(/Selecciona una fecha/)
    expect(date).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(date).toHaveFocus()

    fireEvent.change(date, { target: { value: '2026-12-10' } })
    const first = await screen.findByRole('option', { name: '09:00 AM' })
    first.focus()
    await user.tab({ shift: true })
    expect(date).toHaveFocus()
  })

  it('recorre las opciones con las flechas saltando el horario ocupado', async () => {
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: 'Agendar visita' }))
    fireEvent.change(screen.getByLabelText(/Selecciona una fecha/), { target: { value: '2026-12-10' } })

    const first = await screen.findByRole('option', { name: '09:00 AM' })
    const third = screen.getByRole('option', { name: '02:00 PM' })
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(third).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(first).toHaveFocus()
  })

  it.each(['Escape', 'Cerrar', 'fondo'])('cierra con %s y devuelve el foco al disparador', async (action) => {
    const user = userEvent.setup()
    render(<StrictMode><Page /></StrictMode>)
    const trigger = screen.getByRole('button', { name: 'Agendar visita' })
    await user.click(trigger)

    if (action === 'Escape') await user.keyboard('{Escape}')
    else if (action === 'fondo') await user.click(screen.getByRole('dialog').parentElement)
    else await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
