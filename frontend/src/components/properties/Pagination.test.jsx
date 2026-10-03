// =============================================================
// Pruebas unitarias del control de paginación
// TASK-TEST-PROP-02: Jest + React Testing Library
// =============================================================
//
// El componente se exporta como `Pagination` y también con el
// alias `PaginationControl` (usado en la planificación de la
// tarea). Se valida el resumen, la página activa, el estado de
// los botones anterior/siguiente y la generación de elipsis.

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination, PaginationControl } from './Pagination'

function setup(props = {}) {
  const onChange = jest.fn()
  const utils = render(
    <Pagination
      page={1}
      totalPages={3}
      total={13}
      pageSize={6}
      onChange={onChange}
      {...props}
    />,
  )
  return { onChange, ...utils }
}

describe('Pagination (PaginationControl)', () => {
  it('no renderiza nada cuando hay una sola página', () => {
    const { container } = setup({ page: 1, totalPages: 1, total: 5 })

    expect(container).toBeEmptyDOMElement()
  })

  it('se puede importar mediante el alias PaginationControl', () => {
    render(
      <PaginationControl page={2} totalPages={3} total={13} pageSize={6} onChange={jest.fn()} />,
    )

    expect(screen.getByRole('navigation', { name: 'Paginación de resultados' })).toBeInTheDocument()
  })

  it('muestra el resumen con el rango de resultados visible', () => {
    setup({ page: 1, totalPages: 3, total: 13, pageSize: 6 })

    expect(screen.getByText('Mostrando 1–6 de 13 propiedades')).toBeInTheDocument()
  })

  it('usa el singular cuando hay una sola propiedad', () => {
    setup({ page: 1, totalPages: 2, total: 1, pageSize: 1 })

    expect(screen.getByText('Mostrando 1–1 de 1 propiedad')).toBeInTheDocument()
  })

  it('marca la página actual con aria-current', () => {
    setup({ page: 2, totalPages: 3, total: 13 })

    expect(screen.getByRole('button', { name: 'Página actual, página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('deshabilita "anterior" en la primera página y "siguiente" en la última', () => {
    const { unmount } = setup({ page: 1, totalPages: 3 })
    expect(screen.getByRole('button', { name: 'Ir a la página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ir a la página siguiente' })).toBeEnabled()

    unmount()
    setup({ page: 3, totalPages: 3 })
    expect(screen.getByRole('button', { name: 'Ir a la página anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Ir a la página siguiente' })).toBeDisabled()
  })

  it('notifica el cambio al hacer clic en el número de página', async () => {
    const user = userEvent.setup()
    const { onChange } = setup({ page: 1, totalPages: 3 })

    await user.click(screen.getByRole('button', { name: 'Ir a la página 3' }))

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('notifica el cambio con los botones siguiente y anterior', async () => {
    const user = userEvent.setup()
    const { onChange } = setup({ page: 2, totalPages: 3 })

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
    expect(onChange).toHaveBeenLastCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Ir a la página anterior' }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('genera elipsis cuando hay muchas páginas', () => {
    setup({ page: 5, totalPages: 10, total: 60, pageSize: 6 })

    const nav = screen.getByRole('navigation', { name: 'Paginación de resultados' })
    const gaps = within(nav).getAllByLabelText('Páginas omitidas')
    expect(gaps).toHaveLength(2)
    // Se mantienen la primera, la última y las cercanas a la actual.
    expect(within(nav).getByRole('button', { name: 'Ir a la página 1' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Ir a la página 10' })).toBeInTheDocument()
    expect(
      within(nav).getByRole('button', { name: 'Página actual, página 5' }),
    ).toBeInTheDocument()
  })
})
