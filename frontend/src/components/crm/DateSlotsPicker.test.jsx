// =============================================================
// Pruebas unitarias del selector de fecha y horarios
// TASK-TEST-CRM-01: estados de carga/error y horarios ocupados
// =============================================================

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateSlotsPicker } from './DateSlotsPicker'

const slots = [
  { start_at: '2026-12-10T14:00:00Z', end_at: '2026-12-10T15:00:00Z', duration_minutes: 60 },
  { start_at: '2026-12-10T16:00:00Z', end_at: '2026-12-10T17:00:00Z', duration_minutes: 60 },
]

function renderPicker(overrides = {}) {
  const props = {
    selectedDate: '2026-12-10',
    setSelectedDate: jest.fn(),
    selectedTime: '',
    setSelectedTime: jest.fn(),
    slots,
    ...overrides,
  }
  render(<DateSlotsPicker {...props} />)
  return props
}

describe('DateSlotsPicker', () => {
  it('asocia la etiqueta al input de fecha y notifica los cambios', () => {
    const props = renderPicker()
    const input = screen.getByLabelText(/Selecciona una fecha/)

    expect(input).toHaveValue('2026-12-10')
    fireEvent.change(input, { target: { value: '2026-12-11' } })
    expect(props.setSelectedDate).toHaveBeenCalledWith('2026-12-11')
  })

  it('aplica la fecha mínima cuando se indica', () => {
    renderPicker({ minDate: '2026-12-01' })
    expect(screen.getByLabelText(/Selecciona una fecha/)).toHaveAttribute('min', '2026-12-01')
  })

  it('pide una fecha antes de listar horarios', () => {
    renderPicker({ selectedDate: '', slots: [] })
    expect(screen.getByText('Selecciona una fecha para ver los horarios disponibles.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /AM/ })).not.toBeInTheDocument()
  })

  it('muestra el estado de carga y oculta los horarios mientras consulta', () => {
    renderPicker({ isLoading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Cargando horarios…')
    expect(screen.queryByRole('button', { name: '09:00 AM' })).not.toBeInTheDocument()
  })

  it('muestra el error de carga con rol de alerta', () => {
    renderPicker({ error: 'No se pudieron cargar los horarios.', slots: [] })
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los horarios.')
    expect(screen.queryByRole('button', { name: '09:00 AM' })).not.toBeInTheDocument()
  })

  it('avisa cuando la fecha no tiene horarios libres', () => {
    renderPicker({ slots: [] })
    expect(screen.getByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument()
  })

  it('asume una lista vacía cuando no recibe horarios', () => {
    render(
      <DateSlotsPicker
        selectedDate="2026-12-10"
        setSelectedDate={jest.fn()}
        selectedTime=""
        setSelectedTime={jest.fn()}
      />,
    )
    expect(screen.getByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument()
  })

  it('pinta los horarios libres en la zona de Lima y permite elegirlos', async () => {
    const user = userEvent.setup()
    const props = renderPicker()

    const first = screen.getByRole('button', { name: '09:00 AM' })
    expect(first).toBeEnabled()
    expect(first).toHaveAttribute('aria-pressed', 'false')

    await user.click(first)
    expect(props.setSelectedTime).toHaveBeenCalledWith('2026-12-10T14:00:00Z')
    expect(screen.getByRole('button', { name: '11:00 AM' })).toBeEnabled()
  })

  it('deshabilita un horario previamente ocupado y no lo deja seleccionar', async () => {
    const user = userEvent.setup()
    const props = renderPicker({
      slots: [
        { ...slots[0], is_available: false },
        slots[1],
      ],
    })

    const occupied = screen.getByRole('button', { name: '09:00 AM · Ocupado' })
    expect(occupied).toBeDisabled()
    expect(occupied).toHaveAttribute('aria-disabled', 'true')
    expect(occupied).toHaveAttribute('title', 'Horario ocupado')

    await user.click(occupied)
    expect(props.setSelectedTime).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '11:00 AM' }))
    expect(props.setSelectedTime).toHaveBeenCalledWith('2026-12-10T16:00:00Z')
  })

  it('marca con aria-pressed el horario seleccionado', () => {
    renderPicker({ selectedTime: '2026-12-10T16:00:00Z' })
    expect(screen.getByRole('button', { name: '11:00 AM' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '09:00 AM' })).toHaveAttribute('aria-pressed', 'false')
  })
})
