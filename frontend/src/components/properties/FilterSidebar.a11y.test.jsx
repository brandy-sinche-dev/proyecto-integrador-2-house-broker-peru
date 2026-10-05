// =============================================================
// Pruebas de accesibilidad del panel lateral de filtros
// TASK-A11Y-PROP-03: WCAG 2.2 nivel AA con React Testing Library
// =============================================================
//
// El proyecto no tiene axe-core ni `@testing-library/jest-dom`
// de auditoria automatica (ver docs/12_Pruebas_Automatizadas.md), asi que
// estas pruebas cubren solo lo que RTL puede comprobar de forma fiable:
// nombres accesibles, roles, estados y teclado. Lo que depende del CSS --
// el anillo de foco de la barra de busqueda y del select de orden-- no es
// automatizable en Jest porque los imports de estilos se mapean a un stub,
// y queda como checklist manual con AXE DevTools en
// docs/15_TASK_A11Y_PROP_03.md.

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSidebar } from './FilterSidebar'
import { emptyFilters } from './filters'

const BOUNDS = { min: 0, max: 1000000 }

function renderSidebar(filters = emptyFilters(BOUNDS.min, BOUNDS.max)) {
  const handlers = { onApply: jest.fn(), onClear: jest.fn() }

  render(
    <FilterSidebar
      filters={filters}
      bounds={BOUNDS}
      currency="S/."
      onApply={handlers.onApply}
      onClear={handlers.onClear}
    />,
  )

  return handlers
}

describe('FilterSidebar (accesibilidad)', () => {
  describe('Nombres accesibles de los toggles', () => {
    // Los botones muestran "≤ 80", "80–150", "+150" y "5+": texto visual
    // insuficiente como nombre accesible, porque un lector de pantalla no
    // puede deducir que el ultimo es "cinco o mas". Con aria-label explicito
    // cada boton se anuncia con su significado (WCAG 2.4.4, 4.1.2).
    it.each([
      ['Hasta 80 m²'],
      ['Entre 80 y 150 m²'],
      ['Más de 150 m²'],
      ['1 habitación'],
      ['2 habitaciones'],
      ['3 habitaciones'],
      ['4 habitaciones'],
      ['5 o más habitaciones'],
    ])('expone "%s" como nombre accesible del botón', (name) => {
      renderSidebar()

      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    })

    it('conserva el texto visible en el botón aunque el nombre accesible sea más largo', () => {
      renderSidebar()

      const btn = screen.getByRole('button', { name: '5 o más habitaciones' })
      expect(btn).toHaveTextContent('5+')
    })

    it('expone el estado de selección con aria-pressed', async () => {
      const user = userEvent.setup()
      renderSidebar()

      const hasta80 = screen.getByRole('button', { name: 'Hasta 80 m²' })
      expect(hasta80).toHaveAttribute('aria-pressed', 'false')

      await user.click(hasta80)
      expect(hasta80).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Asociación explícita de etiquetas (WCAG 1.3.1)', () => {
    // Antes el markup solo tenia asociacion implicita (input dentro de
    // label). El issue pide id + htmlFor explicitos: es lo que permite
    // localizar el control por `getByLabelText` y moverlo de sitio sin
    // romper la relacion.
    it.each(['Negociable', 'Destacado', 'Con cochera'])(
      'enlaza el checkbox "%s" con su label mediante id/htmlFor',
      (name) => {
        renderSidebar()

        const checkbox = screen.getByRole('checkbox', { name })
        expect(checkbox).toHaveAttribute('id')

        const label = document.querySelector(`label[for="${checkbox.id}"]`)
        expect(label).not.toBeNull()
        expect(label).toHaveTextContent(name)
      },
    )

    it('da un id distinto a cada checkbox', () => {
      renderSidebar()

      const ids = ['Negociable', 'Destacado', 'Con cochera'].map(
        (name) => screen.getByRole('checkbox', { name }).id,
      )

      expect(new Set(ids).size).toBe(ids.length)
    })

    it('no incluye el ícono decorativo en el nombre accesible del checkbox', () => {
      renderSidebar()

      // El `<svg>` del check marcado va dentro del label: sin `aria-hidden`
      // contaminaria el nombre. La busqueda por nombre exacto lo detecta.
      expect(screen.getByRole('checkbox', { name: 'Negociable' })).toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /Negociable.*svg/ })).toBeNull()
    })
  })

  describe('Sliders de precio (WCAG 4.1.2)', () => {
    it.each(['Precio mínimo', 'Precio máximo'])(
      'publica el valor de "%s" con aria-valuetext en soles',
      (name) => {
        renderSidebar({
          ...emptyFilters(BOUNDS.min, BOUNDS.max),
          priceMin: 250000,
          priceMax: 750000,
        })

        const slider = screen.getByRole('slider', { name })
        // Sin aria-valuetext el lector anuncia "250000"; con el, "S/. 250,000".
        expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('S/. '))
      },
    )

    it('expone los limites del rango como atributos', () => {
      renderSidebar()

      const slider = screen.getByRole('slider', { name: 'Precio mínimo' })
      expect(slider).toHaveAttribute('aria-valuemin', String(BOUNDS.min))
      expect(slider).toHaveAttribute('aria-valuemax', String(BOUNDS.max))
    })

    it('refleja en aria-valuenow y aria-valuetext el borrador vigente', () => {
      renderSidebar({ ...emptyFilters(BOUNDS.min, BOUNDS.max), priceMin: 200000 })

      const slider = screen.getByRole('slider', { name: 'Precio mínimo' })
      expect(slider).toHaveAttribute('aria-valuenow', '200000')
      expect(slider).toHaveAttribute('aria-valuetext', 'S/. 200,000')
    })

    it('actualiza el valor anunciado al mover el slider', () => {
      renderSidebar({ ...emptyFilters(BOUNDS.min, BOUNDS.max), priceMin: 200000 })

      // El incremento con flechas es comportamiento nativo del navegador y
      // jsdom no lo implementa, asi que el movimiento se dispara con el
      // mismo `change` que emite el componente real.
      fireEvent.change(screen.getByRole('slider', { name: 'Precio mínimo' }), {
        target: { value: '200500' },
      })

      const slider = screen.getByRole('slider', { name: 'Precio mínimo' })
      expect(slider).toHaveAttribute('aria-valuenow', '200500')
      expect(slider).toHaveAttribute('aria-valuetext', 'S/. 200,500')
    })

    it('expone el rango combinado en una región viva', () => {
      renderSidebar({ ...emptyFilters(BOUNDS.min, BOUNDS.max), priceMin: 200000, priceMax: 600000 })

      const live = screen.getByText(/200,000.*600,000/)
      expect(live).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Agrupación con nombre (WCAG 1.3.1, 4.1.2)', () => {
    it.each(['Modalidad', 'Metraje techado', 'Habitaciones principales'])(
      'el grupo de "%s" expone role="group" con nombre accesible',
      (name) => {
        renderSidebar()

        // Se consulta por el atributo, no por rol: el `<fieldset>` con su
        // `<legend>` ya es un group con ese mismo nombre, asi que
        // `getByRole('group')` devuelve dos elementos y la asercion sobre
        // el contenedor con `aria-label` explicito seria ambigua.
        const grupo = document.querySelector(`[role="group"][aria-label="${name}"]`)
        expect(grupo).not.toBeNull()
        expect(grupo).toHaveAttribute('aria-label', name)
        expect(screen.getAllByRole('group', { name }).length).toBeGreaterThan(0)
      },
    )

    it('el panel es una región con nombre accesible', () => {
      renderSidebar()

      expect(screen.getByRole('complementary', { name: 'Filtros de búsqueda' })).toBeInTheDocument()
    })
  })

  describe('Teclado', () => {
    // Orden visual = orden de tabulacion. Si el DOM se reordenara sin
    // `tabindex`, esta lista lo detectaria.
    const ORDEN_ESPERADO = [
      'Limpiar todos los filtros',
      'Venta',
      'Alquiler',
      'Precio mínimo',
      'Precio máximo',
      'Hasta 80 m²',
      'Entre 80 y 150 m²',
      'Más de 150 m²',
      '1 habitación',
      '2 habitaciones',
      '3 habitaciones',
      '4 habitaciones',
      '5 o más habitaciones',
      'Negociable',
      'Destacado',
      'Con cochera',
      'Aplicar filtros',
    ]

    // Un control puede obtener su nombre de tres sitios, y esta suite
    // recorre los tres: `aria-label` (sliders y toggles), texto propio
    // (botones) y `<label>` enlazado (checkboxes, cuyo `textContent` es "").
    const identificador = (el) => {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')
      const label = el.closest('label')
      if (label) return label.textContent.trim()
      return el.textContent.trim() || el.tagName
    }

    it('recorre todos los controles en el orden en que se ven', async () => {
      const user = userEvent.setup()
      renderSidebar()

      const visitados = []
      for (let i = 0; i < ORDEN_ESPERADO.length; i += 1) {
        await user.tab()
        visitados.push(identificador(document.activeElement))
      }

      expect(visitados).toEqual(ORDEN_ESPERADO)
    })

    it('no atrapa el foco: al terminar el panel el foco sale del documento', async () => {
      const user = userEvent.setup()
      renderSidebar()

      for (let i = 0; i < ORDEN_ESPERADO.length; i += 1) {
        await user.tab()
      }
      await user.tab()

      // Un focus traparia devolveria el foco al primer control del panel.
      expect(document.activeElement).toBe(document.body)
    })

    it('recorre los controles en reversa con Shift+Tab', async () => {
      const user = userEvent.setup()
      renderSidebar()

      for (let i = 0; i < ORDEN_ESPERADO.length; i += 1) {
        await user.tab()
      }

      const reversa = []
      for (let i = 0; i < 3; i += 1) {
        await user.tab({ shift: true })
        reversa.push(identificador(document.activeElement))
      }

      expect(reversa).toEqual(['Con cochera', 'Destacado', 'Negociable'])
    })

    it.each([
      ['Venta', 'Alquiler'],
      ['Hasta 80 m²', 'Entre 80 y 150 m²'],
      ['2 habitaciones', '3 habitaciones'],
    ])('activa "%s" con Enter y con Espacio', async (nombre, siguiente) => {
      const user = userEvent.setup()
      renderSidebar()

      const boton = screen.getByRole('button', { name: nombre })

      boton.focus()
      await user.keyboard('{Enter}')
      expect(boton).toHaveAttribute('aria-pressed', 'true')

      // El segundo paso deselecciona: comprueba que Espacio tambien
      // dispara el manejador y no solo Enter.
      await user.keyboard(' ')
      expect(boton).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: siguiente })).toHaveAttribute('aria-pressed', 'false')
    })

    it('marca y desmarca un checkbox con Espacio', async () => {
      const user = userEvent.setup()
      renderSidebar()

      const checkbox = screen.getByRole('checkbox', { name: 'Negociable' })

      checkbox.focus()
      await user.keyboard(' ')
      expect(checkbox).toBeChecked()

      await user.keyboard(' ')
      expect(checkbox).not.toBeChecked()
    })

    it('emite el borrador al pulsar Aplicar con Enter', async () => {
      const user = userEvent.setup()
      const { onApply } = renderSidebar({ ...emptyFilters(BOUNDS.min, BOUNDS.max), negociable: true })

      screen.getByRole('button', { name: /Aplicar filtros/ }).focus()
      await user.keyboard('{Enter}')

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ negociable: true }))
    })
  })
})
