// =============================================================
// Pruebas unitarias del componente ConfirmDialog
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

describe('Componente ConfirmDialog (Pruebas Unitarias)', () => {
  const defaultProps = {
    open: true,
    title: '¿Confirmar eliminación?',
    message: 'Esta acción desactivará la propiedad del catálogo público.',
    confirmLabel: 'Sí, eliminar',
    cancelLabel: 'No, conservar',
    danger: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no renderiza nada en el DOM cuando open={false}', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText('¿Confirmar eliminación?')).not.toBeInTheDocument()
  })

  it('renderiza el diálogo con rol alertdialog, aria-modal="true" y textos correspondientes', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    expect(screen.getByRole('heading', { level: 2, name: '¿Confirmar eliminación?' })).toBeInTheDocument()
    expect(screen.getByText('Esta acción desactivará la propiedad del catálogo público.')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: 'Sí, eliminar' })
    const cancelBtn = screen.getByRole('button', { name: 'No, conservar' })

    expect(confirmBtn).toBeInTheDocument()
    expect(confirmBtn).toHaveClass('hbtn--danger')
    expect(cancelBtn).toBeInTheDocument()
    expect(cancelBtn).toHaveClass('hbtn--neutral')
  })

  it('asocia el título y descripción mediante aria-labelledby y aria-describedby', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const dialog = screen.getByRole('alertdialog')
    const titleId = dialog.getAttribute('aria-labelledby')
    const descId = dialog.getAttribute('aria-describedby')

    expect(titleId).toBeTruthy()
    expect(descId).toBeTruthy()
    expect(document.getElementById(titleId)).toHaveTextContent('¿Confirmar eliminación?')
    expect(document.getElementById(descId)).toHaveTextContent('Esta acción desactivará la propiedad del catálogo público.')
  })

  it('utiliza las etiquetas por defecto "Confirmar" y "Cancelar" cuando no se especifican', () => {
    render(
      <ConfirmDialog
        open={true}
        title="¿Desea continuar?"
        message="Guardar cambios pendientes"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('hbtn--primary')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('ejecuta onConfirm al hacer clic en el botón de confirmación', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    const confirmBtn = screen.getByRole('button', { name: 'Sí, eliminar' })
    await user.click(confirmBtn)

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    expect(defaultProps.onCancel).not.toHaveBeenCalled()
  })

  it('ejecuta onCancel al hacer clic en el botón de cancelar', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: 'No, conservar' })
    await user.click(cancelBtn)

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  it('ejecuta onCancel al hacer clic sobre el overlay exterior', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const overlay = screen.getByTestId('confirm-dialog-overlay')
    fireEvent.click(overlay)

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('ejecuta onCancel al presionar la tecla Escape', () => {
    render(<ConfirmDialog {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('gestiona el foco colocando el cursor en el primer botón ejecutable', () => {
    render(<ConfirmDialog {...defaultProps} />)

    // El primer botón dentro del diálogo es el botón de cancelar (según el marcado JSX)
    const cancelBtn = screen.getByRole('button', { name: 'No, conservar' })
    expect(cancelBtn).toHaveFocus()
  })

  it('atrapa la navegación por teclado (Tab trap) entre los botones del diálogo', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: 'No, conservar' })
    const confirmBtn = screen.getByRole('button', { name: 'Sí, eliminar' })

    expect(cancelBtn).toHaveFocus()

    // Avanzar con Tab hacia el botón de confirmación
    await user.tab()
    expect(confirmBtn).toHaveFocus()

    // Avanzar con Tab desde el último botón vuelve al primero
    await user.tab()
    expect(cancelBtn).toHaveFocus()

    // Retroceder con Shift+Tab desde el primer botón va al último
    await user.tab({ shift: true })
    expect(confirmBtn).toHaveFocus()
  })
})
