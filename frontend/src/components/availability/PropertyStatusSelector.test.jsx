// =============================================================
// Pruebas del selector de estado operativo del inmueble (RF-PROP-04)
// TASK-FRONT-PROP-04: estado, motivo obligatorio y transición
// =============================================================

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { updatePropertyStatus } from '../../services/availability'

jest.mock('../../services/availability', () => {
  const actual = jest.requireActual('../../services/availability')
  return { ...actual, updatePropertyStatus: jest.fn() }
})

const PROPERTY_ID = 'prop-1'

const okResult = (status, previous_status) => ({
  id: PROPERTY_ID,
  status,
  previous_status,
  is_active: status !== 'SUSPENDIDO',
  reason: 'El propietario firmo la reserva.',
  changed_by: 'agente-1',
  changed_at: '2026-09-30T14:20:00Z',
})

describe('PropertyStatusSelector', () => {
  let onChanged

  beforeEach(() => {
    onChanged = jest.fn()
    updatePropertyStatus.mockReset()
    updatePropertyStatus.mockResolvedValue(okResult('RESERVADO', 'DISPONIBLE'))
  })

  describe('Renderizado', () => {
    it('presenta los cinco estados como opciones excluyentes', () => {
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      expect(screen.getByRole('radiogroup', { name: 'Estado del inmueble' })).toBeInTheDocument()
      for (const label of ['Disponible', 'Reservado', 'Alquilado', 'Vendido', 'Suspendido']) {
        expect(screen.getByRole('radio', { name: new RegExp(label) })).toBeInTheDocument()
      }
    })

    it('marca el estado vigente como seleccionado y deshabilita el resto de los no aplicables', () => {
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      expect(screen.getByRole('radio', { name: /Disponible/ })).toBeChecked()
      expect(screen.getByRole('radio', { name: /Reservado/ })).toBeEnabled()
      // Desde DISPONIBLE no se puede saltar a un estado terminal.
      expect(screen.getByRole('radio', { name: /Vendido/ })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /Alquilado/ })).toBeDisabled()
    })

    it('deshabilita todo salvo volver a DISPONIBLE cuando el inmueble está vendido', () => {
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="VENDIDO" onChanged={onChanged} />)

      expect(screen.getByRole('radio', { name: /Vendido/ })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /Disponible/ })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /Suspendido/ })).toBeEnabled()
    })

    it('no habilita el guardado mientras no haya cambios', () => {
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled()
    })
  })

  describe('Motivo del cambio', () => {
    it('lo vuelve obligatorio para los estados auditables', async () => {
      const user = userEvent.setup()
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /Reservado/ }))

      expect(screen.getByLabelText(/Motivo del cambio/)).toBeRequired()
      expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled()
      expect(screen.getByText(/Describe el motivo del cambio a Reservado/)).toBeInTheDocument()
    })

    it('lo deja opcional al volver a DISPONIBLE', async () => {
      const user = userEvent.setup()
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="SUSPENDIDO" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /^Disponible/ }))

      expect(screen.getByLabelText(/Motivo del cambio/)).not.toBeRequired()
      expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeEnabled()
    })

    it('desaparece el aviso cuando el motivo alcanza el mínimo', async () => {
      const user = userEvent.setup()
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /Reservado/ }))
      await user.type(screen.getByLabelText(/Motivo del cambio/), 'Reserva con seña')

      expect(screen.queryByText(/Describe el motivo del cambio a Reservado/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeEnabled()
    })
  })

  describe('Envío del cambio', () => {
    it('envía el estado con su motivo y confirma con el estado del servidor', async () => {
      const user = userEvent.setup()
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /Reservado/ }))
      await user.type(screen.getByLabelText(/Motivo del cambio/), 'Reserva con seña')
      await user.click(screen.getByRole('button', { name: 'Guardar estado' }))

      await waitFor(() => expect(updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, {
        status: 'RESERVADO',
        reason: 'Reserva con seña',
      }))
      await waitFor(() => expect(screen.getByText(/Estado actualizado a Reservado/)).toBeInTheDocument())
      expect(onChanged).toHaveBeenCalledWith(okResult('RESERVADO', 'DISPONIBLE'))
      // Tras confirmar, el estado vigente pasa a ser el que devolvió el servidor.
      expect(screen.getByRole('radio', { name: /Reservado/ })).toBeChecked()
    })

    it('conserva el estado anterior cuando el servidor rechaza la transición', async () => {
      const user = userEvent.setup()
      updatePropertyStatus.mockRejectedValue({
        status: 400,
        userMessage: 'No se puede pasar de VENDIDO a DISPONIBLE.',
      })
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="VENDIDO" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /Suspendido/ }))
      await user.type(screen.getByLabelText(/Motivo del cambio/), 'Revision del inventario')
      await user.click(screen.getByRole('button', { name: 'Guardar estado' }))

      await waitFor(() =>
        expect(screen.getByText('No se puede pasar de VENDIDO a DISPONIBLE.')).toBeInTheDocument(),
      )
      expect(screen.getByRole('radio', { name: /Vendido/ })).toBeChecked()
      expect(onChanged).not.toHaveBeenCalled()
    })

    it('vuelve a mostrar el estado previo al pulsar Descartar', async () => {
      const user = userEvent.setup()
      render(<PropertyStatusSelector propertyId={PROPERTY_ID} status="DISPONIBLE" onChanged={onChanged} />)

      await user.click(screen.getByRole('radio', { name: /Reservado/ }))
      await user.type(screen.getByLabelText(/Motivo del cambio/), 'Reserva con seña')
      await user.click(screen.getByRole('button', { name: 'Descartar' }))

      expect(screen.getByRole('radio', { name: /Disponible/ })).toBeChecked()
      expect(screen.getByLabelText(/Motivo del cambio/)).toHaveValue('')
      expect(updatePropertyStatus).not.toHaveBeenCalled()
    })
  })
})