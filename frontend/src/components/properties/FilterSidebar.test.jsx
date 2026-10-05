// =============================================================
// Pruebas unitarias del panel lateral de filtros
// TASK-TEST-PROP-03: Jest + React Testing Library
// =============================================================
//
// `FilterSidebar` mantiene un borrador local (`draft`) que se inicializa
// desde las props y solo sube a la URL cuando el usuario pulsa
// *Aplicar filtros*: esa separación es lo que evita que cada slider
// dispare una consulta al backend. Se valida el estado inicial
// (filtros que llegan aplicados desde la URL), la emisión del borrador
// combinado, el clamp del rango de precio y el botón de reset.

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSidebar } from './FilterSidebar'
import { emptyFilters } from './filters'

const BOUNDS = { min: 0, max: 1000000 }

const APPLIED = {
  operacion: 'VENTA',
  priceMin: 200000,
  priceMax: 600000,
  metraje: 'mid',
  habitaciones: 3,
  negociable: true,
  destacado: false,
  cochera: false,
}

function renderSidebar({ filters = emptyFilters(BOUNDS.min, BOUNDS.max), ...props } = {}) {
  const handlers = { onApply: jest.fn(), onClear: jest.fn(), ...props }

  const utils = render(
    <FilterSidebar
      filters={filters}
      bounds={BOUNDS}
      currency="S/."
      onApply={handlers.onApply}
      onClear={handlers.onClear}
    />,
  )

  return { ...utils, ...handlers, filters }
}

const applyButton = () => screen.getByRole('button', { name: /Aplicar filtros/ })

describe('FilterSidebar (panel de filtros)', () => {
  describe('Estado inicial', () => {
    it('refleja los filtros que llegan aplicados desde la URL', () => {
      renderSidebar({ filters: APPLIED })

      expect(screen.getByRole('button', { name: 'Venta' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Alquiler' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: '80–150' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('checkbox', { name: 'Negociable' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Destacado' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Con cochera' })).not.toBeChecked()
    })

    it('muestra el rango de precio aplicado en el valor del panel', () => {
      renderSidebar({ filters: APPLIED })

      expect(screen.getByLabelText('Precio mínimo')).toHaveAttribute('aria-valuenow', '200000')
      expect(screen.getByLabelText('Precio máximo')).toHaveAttribute('aria-valuenow', '600000')
      expect(screen.getByText(/S\/\. 200,000/)).toBeInTheDocument()
    })

    it('parte sin filtros con el rango completo del catálogo', () => {
      renderSidebar()

      expect(screen.getByLabelText('Precio mínimo')).toHaveAttribute('aria-valuenow', '0')
      expect(screen.getByLabelText('Precio máximo')).toHaveAttribute('aria-valuenow', '1000000')
      expect(screen.getByRole('button', { name: 'Venta' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('checkbox', { name: 'Negociable' })).not.toBeChecked()
    })

    it('se sincroniza cuando los filtros cambian desde la URL', () => {
      const { rerender } = renderSidebar()

      rerender(
        <FilterSidebar
          filters={{ ...emptyFilters(BOUNDS.min, BOUNDS.max), operacion: 'ALQUILER', habitaciones: 2 }}
          bounds={BOUNDS}
          currency="S/."
          onApply={jest.fn()}
          onClear={jest.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Alquiler' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Aplicación del borrador combinado', () => {
    it('no emite nada hasta pulsar Aplicar filtros', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar()

      await user.click(screen.getByRole('button', { name: 'Venta' }))
      await user.click(screen.getByRole('checkbox', { name: 'Negociable' }))

      expect(onApply).not.toHaveBeenCalled()
    })

    it('emite un único objeto con todos los filtros combinados', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar()

      await user.click(screen.getByRole('button', { name: 'Venta' }))
      await user.click(screen.getByRole('button', { name: '+150' }))
      await user.click(screen.getByRole('button', { name: '4', exact: true }))
      await user.click(screen.getByRole('checkbox', { name: 'Negociable' }))
      await user.click(screen.getByRole('checkbox', { name: 'Con cochera' }))
      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledTimes(1)
      expect(onApply).toHaveBeenCalledWith({
        operacion: 'VENTA',
        priceMin: 0,
        priceMax: 1000000,
        metraje: 'large',
        habitaciones: 4,
        negociable: true,
        destacado: false,
        cochera: true,
      })
    })

    it('arranca el borrador desde los filtros aplicados, no desde cero', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({ filters: APPLIED })

      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledWith(APPLIED)
    })

    it('deselecciona la modalidad y el metraje al volver a pulsarlos', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({ filters: APPLIED })

      await user.click(screen.getByRole('button', { name: 'Venta' }))
      await user.click(screen.getByRole('button', { name: '80–150' }))
      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledWith({ ...APPLIED, operacion: '', metraje: '' })
    })

    it('deselecciona las habitaciones al volver a pulsar el mismo número', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({ filters: APPLIED })

      await user.click(screen.getByRole('button', { name: '3', exact: true }))
      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledWith({ ...APPLIED, habitaciones: null })
    })
  })

  describe('Rango de precio', () => {
    // Los sliders son `input[type=range]`: no admiten `userEvent.clear()`
    // porque no son campos editables, se mueven disparando el `change`
    // con el nuevo valor.
    const moveMin = (value) =>
      fireEvent.change(screen.getByLabelText('Precio mínimo'), { target: { value: String(value) } })
    const moveMax = (value) =>
      fireEvent.change(screen.getByLabelText('Precio máximo'), { target: { value: String(value) } })

    it('emite el rango movido tal cual', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar()

      moveMin(250000)
      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ priceMin: 250000, priceMax: 1000000 }),
      )
    })

    it('mantiene el mínimo por debajo del máximo cuando se cruzan los sliders', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({
        filters: { ...emptyFilters(BOUNDS.min, BOUNDS.max), priceMin: 0, priceMax: 400000 },
      })

      moveMin(800000)
      await user.click(applyButton())

      // `clampPrice` calcula el máximo sobre el mínimo sin recortar, así que
      // al cruzar los sliders el rango queda invertido pero ordenado.
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ priceMin: 400000, priceMax: 800000 }),
      )
    })

    it('no deja que el precio máximo baje por debajo del mínimo', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({
        filters: { ...emptyFilters(BOUNDS.min, BOUNDS.max), priceMin: 300000, priceMax: 1000000 },
      })

      moveMax(150000)
      await user.click(applyButton())

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ priceMin: 150000, priceMax: 300000 }),
      )
    })

    it('el valor mostrado del rango se actualiza antes de aplicar', () => {
      renderSidebar()

      moveMin(250000)

      expect(screen.getByLabelText('Precio mínimo')).toHaveAttribute('aria-valuenow', '250000')
      expect(screen.getByText(/S\/\. 250,000/)).toBeInTheDocument()
    })
  })

  describe('Reset de filtros', () => {
    it('el botón Limpiar delega el reset sin tocar el borrador', async () => {
      const user = userEvent.setup()
      const { onClear, onApply } = renderSidebar({ filters: APPLIED })

      await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }))

      expect(onClear).toHaveBeenCalledTimes(1)
      expect(onApply).not.toHaveBeenCalled()
    })

    it('el reset se puede invocar sin filtros aplicados', async () => {
      const user = userEvent.setup()
      const { onClear } = renderSidebar()

      await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }))

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it('tras el reset desde la URL, el panel vuelve a mostrar los filtros por defecto', async () => {
      const { onClear, rerender } = renderSidebar({ filters: APPLIED })

      onClear()

      rerender(
        <FilterSidebar
          filters={emptyFilters(BOUNDS.min, BOUNDS.max)}
          bounds={BOUNDS}
          currency="S/."
          onApply={jest.fn()}
          onClear={jest.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Venta' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByLabelText('Precio mínimo')).toHaveAttribute('aria-valuenow', '0')
      expect(screen.getByRole('checkbox', { name: 'Negociable' })).not.toBeChecked()
    })
  })
})