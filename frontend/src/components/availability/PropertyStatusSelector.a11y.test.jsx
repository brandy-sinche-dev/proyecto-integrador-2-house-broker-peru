import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { updatePropertyStatus } from '../../services/availability'

jest.mock('../../services/availability', () => ({
  ...jest.requireActual('../../services/availability'),
  updatePropertyStatus: jest.fn(),
}))

const renderSelector = (status = 'DISPONIBLE') => {
  const onChanged = jest.fn()
  return { ...render(<PropertyStatusSelector propertyId="prop-1" status={status} onChanged={onChanged} />), onChanged }
}

describe('PropertyStatusSelector (accesibilidad)', () => {
  beforeEach(() => updatePropertyStatus.mockReset())

  it.each(['DISPONIBLE', 'RESERVADO', 'ALQUILADO', 'VENDIDO', 'SUSPENDIDO'])(
    'no anuncia errores ni permite guardar sin solicitar un cambio desde %s',
    async (status) => {
      const user = userEvent.setup()
      renderSelector(status)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      const save = screen.getByRole('button', { name: 'Guardar estado' })
      expect(save).toBeDisabled()
      await user.type(screen.getByRole('textbox', { name: 'Motivo del cambio' }), 'Solo un motivo, sin cambio de estado')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(save).toBeDisabled()
      await user.click(save)
      expect(updatePropertyStatus).not.toHaveBeenCalled()
    },
  )

  it('expone nombres, descripciones y un único tab stop aunque el estado actual esté deshabilitado', async () => {
    const user = userEvent.setup()
    renderSelector()
    const group = screen.getByRole('radiogroup', { name: 'Estado del inmueble' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(5)
    for (const name of ['Disponible', 'Reservado', 'Alquilado', 'Vendido', 'Suspendido']) {
      expect(within(group).getByRole('radio', { name })).toHaveAccessibleDescription()
    }
    expect(radios.filter((radio) => radio.tabIndex === 0)).toEqual([screen.getByRole('radio', { name: 'Reservado' })])
    expect(screen.getByRole('radio', { name: 'Disponible' })).toBeChecked()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Reservado' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Motivo del cambio' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('radio', { name: 'Reservado' })).toHaveFocus()
    expect(updatePropertyStatus).not.toHaveBeenCalled()
  })

  it('las cuatro flechas seleccionan, mueven el foco y envuelven saltando estados deshabilitados', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.tab()
    for (const [key, name] of [
      ['ArrowRight', 'Suspendido'], ['ArrowDown', 'Reservado'],
      ['ArrowLeft', 'Suspendido'], ['ArrowUp', 'Reservado'],
    ]) {
      await user.keyboard(`{${key}}`)
      const selected = screen.getByRole('radio', { name })
      expect(selected).toHaveFocus()
      expect(selected).toBeChecked()
      expect(screen.getAllByRole('radio', { checked: true })).toEqual([selected])
      expect(screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0)).toEqual([selected])
    }
    await user.tab()
    expect(screen.getByRole('textbox')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('radio', { name: 'Reservado' })).toHaveFocus()
    expect(updatePropertyStatus).not.toHaveBeenCalled()
  })

  it('Espacio selecciona el único destino terminal y el motivo describe el error real hasta corregirlo', async () => {
    const user = userEvent.setup()
    renderSelector('VENDIDO')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.tab()
    const radio = screen.getByRole('radio', { name: 'Suspendido' })
    expect(radio).toHaveFocus()
    await user.keyboard('{ArrowRight} ')
    expect(radio).toBeChecked()
    await user.tab()
    const reason = screen.getByRole('textbox', { name: 'Motivo del cambio' })
    expect(reason).toHaveFocus()
    expect(reason).toBeRequired()
    expect(reason).toHaveAttribute('aria-invalid', 'true')
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent(/Describe el motivo del cambio a Suspendido/)
    expect(reason).toHaveAttribute('aria-describedby', error.id)
    expect(reason).toHaveAccessibleDescription(error.textContent)
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled()
    await user.type(reason, 'Revisión del inmueble')
    expect(reason).not.toHaveAttribute('aria-describedby')
    expect(reason).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeEnabled()
  })

  it('deja de anunciar el motivo pendiente al descartar el nuevo estado', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('radio', { name: 'Reservado' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Describe el motivo del cambio a Reservado/)
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByRole('radio', { name: 'Disponible' })).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/No se puede pasar de/)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled()
    expect(updatePropertyStatus).not.toHaveBeenCalled()
  })

  it.each([true, false])('anuncia la respuesta del guardado por teclado (éxito: %s)', async (success) => {
    const user = userEvent.setup()
    const result = { id: 'prop-1', status: 'RESERVADO', previous_status: 'DISPONIBLE' }
    if (success) updatePropertyStatus.mockResolvedValue(result)
    else updatePropertyStatus.mockRejectedValue({ userMessage: 'No se pudo guardar el estado.' })
    const { onChanged } = renderSelector()
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
    await user.tab()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard('Reserva confirmada')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(live).toHaveTextContent(success ? 'Estado actualizado a Reservado.' : 'No se pudo guardar el estado.'))
    expect(screen.getByRole('radio', { name: success ? 'Reservado' : 'Disponible' })).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/No se puede pasar de/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled()
    if (success) expect(onChanged).toHaveBeenCalledWith(result)
    else expect(onChanged).not.toHaveBeenCalled()
  })
})
