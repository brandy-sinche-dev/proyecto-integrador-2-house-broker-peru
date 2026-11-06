// =============================================================
// Pruebas unitarias del componente StatusBadge
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('Componente StatusBadge (Pruebas Unitarias)', () => {
  it('renderiza "Activo" con la clase hstatus--active cuando active={true}', () => {
    render(<StatusBadge active={true} />)

    const badge = screen.getByText('Activo')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('hstatus', 'hstatus--active')
    expect(badge).not.toHaveClass('hstatus--inactive')
  })

  it('renderiza "Inactivo" con la clase hstatus--inactive cuando active={false}', () => {
    render(<StatusBadge active={false} />)

    const badge = screen.getByText('Inactivo')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('hstatus', 'hstatus--inactive')
    expect(badge).not.toHaveClass('hstatus--active')
  })
})
