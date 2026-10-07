// =============================================================
// Pruebas del gestor de franjas de visita (RF-PROP-04)
// TASK-FRONT-PROP-04: días, hora inicio/fin y reemplazo semanal
// =============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleManager } from './ScheduleManager'
import { replacePropertySchedules } from '../../services/availability'

jest.mock('../../services/availability', () => {
  const actual = jest.requireActual('../../services/availability')
  return { ...actual, replacePropertySchedules: jest.fn() }
})

const PROPERTY_ID = 'prop-1'
const ALL_DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const emptyWeek = {
  property_id: PROPERTY_ID,
  timezone: 'America/Lima',
  total_slots: 0,
  days: ALL_DAYS.map((weekday) => ({ weekday, slots: [] })),
}

const weekWith = (weekday, times) => ({
  ...emptyWeek,
  total_slots: times.length,
  days: emptyWeek.days.map((day) =>
    day.weekday === weekday
      ? {
          ...day,
          slots: times.map(([start_time, end_time], i) => ({
            id: `${weekday}-${i}`,
            start_time,
            end_time,
            is_active: true,
          })),
        }
      : day,
  ),
})

/** `input[type=time]` no es escribible con `userEvent.type`, se asigna directo. */
const setTime = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const renderManager = (props = {}) => {
  const onSaved = props.onSaved ?? jest.fn()
  const view = render(
    <ScheduleManager
      propertyId={PROPERTY_ID}
      schedules={emptyWeek}
      status="DISPONIBLE"
      onSaved={onSaved}
      {...props}
    />,
  )
  return { ...view, onSaved }
}

describe('ScheduleManager', () => {
  beforeEach(() => {
    replacePropertySchedules.mockReset()
    replacePropertySchedules.mockImplementation((_, input) =>
      Promise.resolve({
        ...emptyWeek,
        total_slots: input.days.reduce((total, day) => total + day.slots.length, 0),
        days: emptyWeek.days.map((day) => {
          const incoming = input.days.find((d) => d.weekday === day.weekday)
          return {
            ...day,
            slots: (incoming?.slots ?? []).map((slot, i) => ({
              id: `nuevo-${day.weekday}-${i}`,
              ...slot,
              is_active: true,
            })),
          }
        }),
      }),
    )
  })

  describe('Renderizado', () => {
    it('lista los siete días con su etiqueta en español', () => {
      renderManager()

      for (const label of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
        expect(screen.getByRole('switch', { name: label })).toBeInTheDocument()
      }
      expect(screen.getAllByRole('switch')).toHaveLength(7)
    })

    it('carga las franjas que devuelve el servidor', () => {
      renderManager({ schedules: weekWith('LUNES', [['09:00', '12:00'], ['14:00', '18:00']]) })

      expect(screen.getByRole('switch', { name: 'Lunes' })).toBeChecked()
      expect(screen.getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveValue('09:00')
      expect(screen.getByLabelText('Franja 1 de Lunes: hora de fin')).toHaveValue('12:00')
      expect(screen.getByLabelText('Franja 2 de Lunes: hora de inicio')).toHaveValue('14:00')
      expect(screen.getByText('2 franjas en la semana.')).toBeInTheDocument()
    })

    it('avisa que la agenda no admite visitas si el inmueble no está DISPONIBLE', () => {
      renderManager({ status: 'RESERVADO' })

      expect(screen.getByText(/estado «Reservado»/)).toBeInTheDocument()
    })

    it('no habilita el guardado cuando la agenda coincide con la del servidor', () => {
      renderManager({ schedules: weekWith('LUNES', [['09:00', '12:00']]) })

      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Quitar toda la agenda' })).toBeEnabled()
    })

    it('explica que sin franjas no se pueden agendar visitas', () => {
      renderManager()

      expect(screen.getByText(/no se pueden agendar visitas/)).toBeInTheDocument()
    })

    it('rechaza una semana con más de 28 franjas aunque venga del servidor', () => {
      const days = ALL_DAYS.map((weekday) => ({
        weekday,
        slots: Array.from({ length: 5 }, (_, i) => ({
          id: `${weekday}-${i}`,
          start_time: '08:00',
          end_time: '09:00',
          is_active: true,
        })),
      }))
      renderManager({ schedules: { ...emptyWeek, total_slots: 35, days } })

      expect(screen.getByText('La semana tiene 35 franjas y el máximo es 28.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
    })
  })

  describe('Edición del borrador', () => {
    it('marcar un día crea su primera franja en blanco', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Martes' }))

      expect(screen.getByLabelText('Franja 1 de Martes: hora de inicio')).toHaveValue('')
      expect(screen.getByRole('button', { name: '+ Agregar franja' })).toBeInTheDocument()
    })

    it('agrega y quita franjas del día', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      await user.click(screen.getByRole('button', { name: '+ Agregar franja' }))
      expect(screen.getByLabelText('Franja 2 de Lunes: hora de inicio')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Quitar Franja 2 de Lunes/ }))
      expect(screen.queryByLabelText('Franja 2 de Lunes: hora de inicio')).not.toBeInTheDocument()
    })

    it('desmarcar el único día con franjas lo deja sin atención', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Domingo' }))
      await user.click(screen.getByRole('switch', { name: 'Domingo' }))

      expect(screen.queryByLabelText('Franja 1 de Domingo: hora de inicio')).not.toBeInTheDocument()
      // Los siete días vuelven a quedar sin atención, no solo el que se desmarca.
      expect(screen.getAllByText('Sin atención')).toHaveLength(7)
    })

    it('cuenta las franjas de toda la semana', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      await user.click(screen.getByRole('button', { name: '+ Agregar franja' }))
      await user.click(screen.getByRole('switch', { name: 'Sábado' }))

      expect(screen.getByText('3 franjas en la semana.')).toBeInTheDocument()
    })

    it('bloquea agregar más de seis franjas en el mismo día', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Viernes' }))
      const add = screen.getByRole('button', { name: '+ Agregar franja' })
      for (let i = 0; i < 5; i += 1) await user.click(add)

      expect(screen.getByText('6 franjas')).toBeInTheDocument()
      expect(add).toBeDisabled()
    })

    it('descarta toda la agenda con un clic', async () => {
      const user = userEvent.setup()
      renderManager({ schedules: weekWith('LUNES', [['09:00', '12:00']]) })

      await user.click(screen.getByRole('button', { name: 'Quitar toda la agenda' }))

      expect(screen.getByRole('switch', { name: 'Lunes' })).not.toBeChecked()
      expect(screen.queryByLabelText('Franja 1 de Lunes: hora de inicio')).not.toBeInTheDocument()
    })

    it('permite reemplazar todas las franjas del servidor en una sola sesión', async () => {
      const user = userEvent.setup()
      const { onSaved } = renderManager({ schedules: weekWith('LUNES', [['09:00', '12:00']]) })

      setTime('Franja 1 de Lunes: hora de inicio', '10:00')
      setTime('Franja 1 de Lunes: hora de fin', '13:00')
      await user.click(screen.getByRole('button', { name: 'Guardar agenda' }))

      await waitFor(() =>
        expect(replacePropertySchedules).toHaveBeenCalledWith(PROPERTY_ID, {
          days: [{ weekday: 'LUNES', slots: [{ start_time: '10:00', end_time: '13:00' }] }],
        }),
      )
      expect(onSaved).toHaveBeenCalled()
    })
  })

  describe('Validación antes de enviar', () => {
    it('no habilita el guardado mientras haya horas sin completar', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))

      expect(screen.getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveAttribute(
        'aria-invalid',
        'true',
      )
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
      expect(replacePropertySchedules).not.toHaveBeenCalled()
    })

    it('señala la franja cuya hora de inicio no precede a la de fin', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      setTime('Franja 1 de Lunes: hora de inicio', '18:00')
      setTime('Franja 1 de Lunes: hora de fin', '12:00')

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('La hora de inicio 18:00 debe ser anterior a la de fin 12:00.')
      expect(screen.getByLabelText('Franja 1 de Lunes: hora de fin')).toHaveAttribute('aria-invalid', 'true')
    })

    it('bloquea el guardado ante una duración menor a 30 minutos', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Jueves' }))
      setTime('Franja 1 de Jueves: hora de inicio', '09:00')
      setTime('Franja 1 de Jueves: hora de fin', '09:15')

      expect(screen.getByText('La franja dura 15 minutos y el mínimo es 30.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
    })

    it('detecta dos franjas solapadas del mismo día', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      setTime('Franja 1 de Lunes: hora de inicio', '09:00')
      setTime('Franja 1 de Lunes: hora de fin', '12:00')
      await user.click(screen.getByRole('button', { name: '+ Agregar franja' }))
      setTime('Franja 2 de Lunes: hora de inicio', '11:00')
      setTime('Franja 2 de Lunes: hora de fin', '13:00')

      expect(screen.getByText('Se solapa con la franja 09:00–12:00.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
    })

    it('acepta franjas contiguas porque el intervalo es semiabierto', async () => {
      const user = userEvent.setup()
      renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      setTime('Franja 1 de Lunes: hora de inicio', '09:00')
      setTime('Franja 1 de Lunes: hora de fin', '12:00')
      await user.click(screen.getByRole('button', { name: '+ Agregar franja' }))
      setTime('Franja 2 de Lunes: hora de inicio', '12:00')
      setTime('Franja 2 de Lunes: hora de fin', '15:00')

      expect(screen.queryByText(/Se solapa/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeEnabled()
    })
  })

  describe('Envío de la agenda', () => {
    it('manda solo los días con franjas y confirma con la respuesta del servidor', async () => {
      const user = userEvent.setup()
      const { onSaved } = renderManager()

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      setTime('Franja 1 de Lunes: hora de inicio', '09:00')
      setTime('Franja 1 de Lunes: hora de fin', '12:00')
      await user.click(screen.getByRole('switch', { name: 'Sábado' }))
      setTime('Franja 1 de Sábado: hora de inicio', '10:00')
      setTime('Franja 1 de Sábado: hora de fin', '13:00')
      await user.click(screen.getByRole('button', { name: 'Guardar agenda' }))

      await waitFor(() =>
        expect(replacePropertySchedules).toHaveBeenCalledWith(PROPERTY_ID, {
          days: [
            { weekday: 'LUNES', slots: [{ start_time: '09:00', end_time: '12:00' }] },
            { weekday: 'SABADO', slots: [{ start_time: '10:00', end_time: '13:00' }] },
          ],
        }),
      )
      await waitFor(() => expect(screen.getByText('Agenda guardada con 2 franjas semanales.')).toBeInTheDocument())
      expect(onSaved).toHaveBeenCalled()
      // El borrador pasa a ser el que devolvió el servidor.
      expect(screen.getByLabelText('Franja 1 de Sábado: hora de inicio')).toHaveValue('10:00')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('realinea el borrador cuando el padre le pasa la agenda ya guardada', async () => {
      const user = userEvent.setup()
      const saved = weekWith('LUNES', [['09:00', '12:00']])
      const onSaved = jest.fn()
      const { rerender } = renderManager({ onSaved })

      await user.click(screen.getByRole('switch', { name: 'Lunes' }))
      setTime('Franja 1 de Lunes: hora de inicio', '09:00')
      setTime('Franja 1 de Lunes: hora de fin', '12:00')
      await user.click(screen.getByRole('button', { name: 'Guardar agenda' }))
      await waitFor(() => expect(onSaved).toHaveBeenCalled())

      // El padre recarga y devuelve el mismo contenido: el borrador queda limpio.
      rerender(
        <ScheduleManager propertyId={PROPERTY_ID} schedules={saved} status="DISPONIBLE" onSaved={onSaved} />,
      )

      expect(screen.getByLabelText('Franja 1 de Lunes: hora de inicio')).toHaveValue('09:00')
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeDisabled()
    })

    it('permite vaciar la semana completa enviando solo `days: []`', async () => {
      const user = userEvent.setup()
      renderManager({ schedules: weekWith('LUNES', [['09:00', '12:00']]) })

      await user.click(screen.getByRole('button', { name: 'Quitar toda la agenda' }))
      await user.click(screen.getByRole('button', { name: 'Guardar agenda' }))

      await waitFor(() => expect(replacePropertySchedules).toHaveBeenCalledWith(PROPERTY_ID, { days: [] }))
      await waitFor(() => expect(screen.getByText('Agenda guardada con 0 franjas semanales.')).toBeInTheDocument())
    })

    it('muestra el motivo devuelto por el servidor y conserva el borrador', async () => {
      const user = userEvent.setup()
      const onSaved = jest.fn()
      replacePropertySchedules.mockRejectedValue({
        status: 409,
        userMessage: '3 franjas a desactivar tienen visitas confirmadas.',
      })
      renderManager({ onSaved })

      await user.click(screen.getByRole('switch', { name: 'Martes' }))
      setTime('Franja 1 de Martes: hora de inicio', '09:00')
      setTime('Franja 1 de Martes: hora de fin', '10:00')
      await user.click(screen.getByRole('button', { name: 'Guardar agenda' }))

      await waitFor(() =>
        expect(screen.getByText('3 franjas a desactivar tienen visitas confirmadas.')).toBeInTheDocument(),
      )
      expect(onSaved).not.toHaveBeenCalled()
      // El borrador no se pierde: el agente puede corregir y reintentar.
      expect(screen.getByLabelText('Franja 1 de Martes: hora de inicio')).toHaveValue('09:00')
      expect(screen.getByRole('button', { name: 'Guardar agenda' })).toBeEnabled()
    })
  })
})
