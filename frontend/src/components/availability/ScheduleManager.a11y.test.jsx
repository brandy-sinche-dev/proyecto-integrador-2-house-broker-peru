import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleManager } from './ScheduleManager'
import { replacePropertySchedules } from '../../services/availability'

jest.mock('../../services/availability', () => ({
  ...jest.requireActual('../../services/availability'),
  replacePropertySchedules: jest.fn(),
}))

const renderManager = () => {
  const onSaved = jest.fn()
  render(<ScheduleManager propertyId="prop-1" schedules={null} status="DISPONIBLE" onSaved={onSaved} />)
  return { onSaved }
}

// JSDOM no implementa la edición nativa por segmentos de input[type=time].
const setTime = (part, value) => fireEvent.change(
  screen.getByLabelText(`Franja 1 de Lunes: hora de ${part}`), { target: { value } },
)

describe('ScheduleManager (accesibilidad)', () => {
  beforeEach(() => replacePropertySchedules.mockReset())

  it('recorre siete switches con nombres estables y activa/desactiva con Espacio conservando foco', async () => {
    const user = userEvent.setup()
    renderManager()
    for (const name of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      await user.tab()
      const control = screen.getByRole('switch', { name })
      expect(control).toHaveFocus()
      expect(control).toHaveAttribute('type', 'checkbox')
      expect(control).toHaveAttribute('aria-checked', 'false')
      expect(control).not.toHaveAttribute('aria-expanded')
    }
    const sunday = screen.getByRole('switch', { name: 'Domingo' })
    await user.keyboard(' ')
    expect(sunday).toBeChecked()
    expect(sunday).toHaveAttribute('aria-checked', 'true')
    expect(sunday).toHaveFocus()
    expect(screen.getByRole('list', { name: 'Franjas de Domingo' })).toBeInTheDocument()
    await user.keyboard(' ')
    expect(sunday).not.toBeChecked()
    expect(sunday).toHaveAttribute('aria-checked', 'false')
    expect(sunday).toHaveFocus()
    expect(screen.queryByRole('list', { name: 'Franjas de Domingo' })).not.toBeInTheDocument()
  })

  it('despliega mediante un botón compatible con aria-expanded sin perder horarios ni tabular campos ocultos', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.tab()
    await user.keyboard(' ')
    setTime('inicio', '09:00')
    setTime('fin', '10:00')
    await user.tab()
    const disclosure = screen.getByRole('button', { name: 'Franjas de Lunes' })
    expect(disclosure).toHaveFocus()
    const list = screen.getByRole('list', { name: 'Franjas de Lunes' })
    expect(disclosure).toHaveAttribute('aria-controls', list.id)
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Enter}')
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(list).toHaveAttribute('hidden')
    expect(screen.queryByRole('list', { name: 'Franjas de Lunes' })).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: '+ Agregar franja' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('switch', { name: 'Martes' })).toHaveFocus()
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.keyboard(' ')
    expect(disclosure).toHaveFocus()
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(list).not.toHaveAttribute('hidden')
    expect(within(list).getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveValue('09:00')
  })

  it('asocia los errores anunciados a las horas y retira la descripción al corregir', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.tab()
    await user.keyboard(' ')
    const start = screen.getByLabelText('Franja 1 de Lunes: hora de inicio')
    const end = screen.getByLabelText('Franja 1 de Lunes: hora de fin')
    const error = screen.getByRole('alert')
    for (const field of [start, end]) {
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAttribute('aria-describedby', error.id)
      expect(field).toHaveAccessibleDescription(error.textContent)
    }
    await user.tab()
    await user.tab()
    await user.tab()
    expect(start).toHaveFocus()
    setTime('inicio', '18:00')
    setTime('fin', '12:00')
    expect(end).toHaveAccessibleDescription('La hora de inicio 18:00 debe ser anterior a la de fin 12:00.')
    expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
    setTime('inicio', '09:00')
    for (const field of [start, end]) {
      expect(field).not.toHaveAttribute('aria-invalid')
      expect(field).not.toHaveAttribute('aria-describedby')
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeEnabled()
  })

  it('devuelve el foco al día al quitar la última franja y actualiza el resumen vivo', async () => {
    const user = userEvent.setup()
    renderManager()
    const summary = screen.getByText(/El inmueble todavía no tiene franjas/)
    expect(summary).toHaveAttribute('aria-live', 'polite')
    expect(summary).toHaveAttribute('aria-atomic', 'true')
    await user.tab()
    await user.keyboard(' ')
    expect(summary).toHaveTextContent('1 franja en la semana.')
    for (let i = 0; i < 5; i += 1) await user.tab()
    expect(screen.getByRole('button', { name: 'Quitar Franja 1 de Lunes' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('switch', { name: 'Lunes' })).toHaveFocus()
    expect(screen.getByRole('switch', { name: 'Lunes' })).not.toBeChecked()
    expect(summary).toHaveTextContent(/no se pueden agendar visitas/)
    await user.tab()
    expect(screen.getByRole('switch', { name: 'Martes' })).toHaveFocus()
  })

  it.each([true, false])('anuncia el guardado o el rechazo conservando el borrador (éxito: %s)', async (success) => {
    const user = userEvent.setup()
    const result = {
      property_id: 'prop-1', timezone: 'America/Lima', total_slots: 1,
      days: [{ weekday: 'LUNES', slots: [{ id: 'slot-1', start_time: '09:00', end_time: '10:00', is_active: true }] }],
    }
    if (success) replacePropertySchedules.mockResolvedValue(result)
    else replacePropertySchedules.mockRejectedValue({ userMessage: 'Hay visitas confirmadas.' })
    const { onSaved } = renderManager()
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
    await user.tab()
    await user.keyboard(' ')
    setTime('inicio', '09:00')
    setTime('fin', '10:00')
    screen.getByRole('button', { name: 'Guardar agenda' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(live).toHaveTextContent(success ? 'Agenda guardada con 1 franjas semanales.' : 'Hay visitas confirmadas.'))
    expect(screen.getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveValue('09:00')
    if (success) expect(onSaved).toHaveBeenCalledWith(result)
    else expect(onSaved).not.toHaveBeenCalled()
  })
})
