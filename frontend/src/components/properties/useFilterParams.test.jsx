// =============================================================
// Pruebas unitarias de combinación de filtros y URL parsing
// TASK-TEST-PROP-03: Jest + React Testing Library
// =============================================================
//
// `useFilterParams` usa la URL como única fuente de verdad de los
// filtros del catálogo: la lee al entrar (parseo) y la reescribe al
// aplicar o limpiar (query string). Por eso el hook se monta con
// `renderHook` dentro de un `MemoryRouter` y, para poder observar lo
// que realmente se escribe en la URL, se añade un *probe* que expone
// `location.search` y el tipo de navegación de React Router.
//
// Se valida:
//   - la query string generada tras aplicar filtros (qué se escribe y
//     qué se omite cuando el valor es el por defecto),
//   - el parseo de una URL inicial arbitraria, incluidos los valores
//     inválidos que deben caer al default,
//   - la función de reset de filtros (`clearFilters`) y la remoción
//     de un filtro puntual desde los chips.

import { act, renderHook, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import { useFilterParams } from './useFilterParams'
import { emptyFilters } from './filters'

// Bounds del catálogo simulado: min y max de precio de las propiedades
// cargadas. `PropertyList` los calcula a partir del listado, así que
// nunca son 0/0 (cuando no hay propiedades devuelve { min: 0, max: 1 }).
const BOUNDS = { min: 100000, max: 500000 }

// Catálogo vacío: bounds degenerado que activa el guard `bounds.max > 1`
// de `applyFilters`, el caso donde el rango de precio no debe ir a la URL.
const EMPTY_BOUNDS = { min: 0, max: 1 }

// Un mismo caso puede montar el hook más de una vez para comparar dos
// escenarios (por ejemplo, con y sin un límite de precio). Cada montaje
// recibe un id propio para que su probe sea único en el documento y las
// consultas no se confundan entre montajes.
let mounts = 0

function Probe({ id }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  return (
    <>
      <span data-testid={`search-${id}`}>{location.search}</span>
      <span data-testid={`navigation-type-${id}`}>{navigationType}</span>
    </>
  )
}

// Monta el hook con una URL inicial concreta y devuelve sus utilidades
// más los lectores del estado real del router.
function renderHookInUrl(initialEntry = '/', bounds = BOUNDS) {
  const id = ++mounts

  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Probe id={id} />
      {children}
    </MemoryRouter>
  )

  const view = renderHook(() => useFilterParams(bounds), { wrapper })

  return {
    ...view,
    search: () => screen.getByTestId(`search-${id}`).textContent,
    navigationType: () => screen.getByTestId(`navigation-type-${id}`).textContent,
  }
}

// Aplica los filtros dentro de `act` porque `applyFilters` escribe en la
// URL y eso dispara un re-render del hook (lee los search params).
function applyFilters(view, filters) {
  act(() => {
    view.result.current.applyFilters(filters)
  })
}

function clearFilters(view) {
  act(() => {
    view.result.current.clearFilters()
  })
}

const empty = () => emptyFilters(BOUNDS.min, BOUNDS.max)

// Filtros completos con los 9 campos activados: sirve para los casos de
// combinación total y de round-trip.
const ALL_FILTERS = {
  operacion: 'ALQUILER',
  moneda: 'PEN',
  priceMin: 250000,
  priceMax: 300000,
  metraje: 'mid',
  habitaciones: 3,
  negociable: true,
  destacado: true,
  cochera: true,
}

const ALL_FILTERS_QUERY =
  '?operacion=ALQUILER&moneda=PEN&priceMin=250000&priceMax=300000&metraje=mid&habitaciones=3&negociable=true&destacado=true&cochera=true'

describe('useFilterParams (combinación de filtros y URL parsing)', () => {
  describe('Generación de la query string tras aplicar filtros', () => {
    it('no escribe ningún parámetro cuando los filtros están en su valor por defecto', () => {
      const view = renderHookInUrl()

      applyFilters(view, empty())

      expect(view.search()).toBe('')
    })

    it.each(['VENTA', 'ALQUILER'])('serializa la modalidad %s', (operacion) => {
      const view = renderHookInUrl()

      applyFilters(view, { ...empty(), operacion })

      expect(view.search()).toBe(`?operacion=${operacion}`)
    })

    it('omite la modalidad cuando se deselecciona', () => {
      const view = renderHookInUrl('/?operacion=VENTA')

      applyFilters(view, { ...view.result.current.filters, operacion: '' })

      expect(view.search()).toBe('')
    })

    it.each(['PEN', 'USD'])('serializa la moneda %s', (moneda) => {
      const view = renderHookInUrl()

      applyFilters(view, { ...empty(), moneda })

      expect(view.search()).toBe(`?moneda=${moneda}`)
    })

    it('omite la moneda cuando se deselecciona', () => {
      const view = renderHookInUrl('/?moneda=USD')

      applyFilters(view, { ...view.result.current.filters, moneda: '' })

      expect(view.search()).toBe('')
    })

    it('reinicia el rango de precio cuando cambia la moneda', () => {
      const view = renderHookInUrl('/?moneda=USD&priceMin=200000&priceMax=300000')

      applyFilters(view, { ...view.result.current.filters, moneda: 'PEN' })

      // Cambiar de divisa invalida el rango anterior: no debe viajar a la URL.
      expect(view.search()).toBe('?moneda=PEN')
    })

    it('escribe priceMin solo cuando supera el mínimo del catálogo', () => {
      const enElMinimo = renderHookInUrl()
      applyFilters(enElMinimo, { ...empty(), priceMin: BOUNDS.min })
      expect(enElMinimo.search()).toBe('')

      const porEncima = renderHookInUrl()
      applyFilters(porEncima, { ...empty(), priceMin: 250000 })
      expect(porEncima.search()).toBe('?priceMin=250000')
    })

    it('escribe priceMax solo cuando queda por debajo del máximo del catálogo', () => {
      const enElMaximo = renderHookInUrl()
      applyFilters(enElMaximo, { ...empty(), priceMax: BOUNDS.max })
      expect(enElMaximo.search()).toBe('')

      const porDebajo = renderHookInUrl()
      applyFilters(porDebajo, { ...empty(), priceMax: 300000 })
      expect(porDebajo.search()).toBe('?priceMax=300000')
    })

    it('omite el rango de precio cuando el catálogo no tiene rango (bounds.max = 1)', () => {
      const view = renderHookInUrl('/', EMPTY_BOUNDS)

      applyFilters(view, { ...emptyFilters(0, 1), priceMin: 0, priceMax: 0 })

      expect(view.search()).toBe('')
    })

    it.each(['small', 'mid', 'large'])('serializa el metraje %s', (metraje) => {
      const view = renderHookInUrl()

      applyFilters(view, { ...empty(), metraje })

      expect(view.search()).toBe(`?metraje=${metraje}`)
    })

    it('omite el metraje cuando se deselecciona', () => {
      const view = renderHookInUrl('/?metraje=large')

      applyFilters(view, { ...view.result.current.filters, metraje: '' })

      expect(view.search()).toBe('')
    })

    it('serializa las habitaciones y trata el 0 como un valor presente', () => {
      const conTres = renderHookInUrl()
      applyFilters(conTres, { ...empty(), habitaciones: 3 })
      expect(conTres.search()).toBe('?habitaciones=3')

      const conCero = renderHookInUrl()
      applyFilters(conCero, { ...empty(), habitaciones: 0 })
      expect(conCero.search()).toBe('?habitaciones=0')
    })

    it('omite las habitaciones cuando vale null', () => {
      const view = renderHookInUrl('/?habitaciones=4')

      applyFilters(view, { ...view.result.current.filters, habitaciones: null })

      expect(view.search()).toBe('')
    })

    it.each(['negociable', 'destacado', 'cochera'])(
      'escribe %s=true solo cuando la característica está activa',
      (key) => {
        const activa = renderHookInUrl()
        applyFilters(activa, { ...empty(), [key]: true })
        expect(activa.search()).toBe(`?${key}=true`)

        const inactiva = renderHookInUrl(`/?${key}=true`)
        applyFilters(inactiva, { ...inactiva.result.current.filters, [key]: false })
        expect(inactiva.search()).toBe('')
      },
    )

    it('combina los nueve filtros en el orden en que los declara el hook', () => {
      const view = renderHookInUrl()

      applyFilters(view, ALL_FILTERS)

      expect(view.search()).toBe(ALL_FILTERS_QUERY)
    })

    it.each([
      [
        'modalidad y características',
        { operacion: 'VENTA', cochera: true },
        '?operacion=VENTA&cochera=true',
      ],
      [
        'rango de precio y habitaciones',
        { priceMin: 200000, priceMax: 450000, habitaciones: 2 },
        '?priceMin=200000&priceMax=450000&habitaciones=2',
      ],
      [
        'metraje con las tres características',
        { metraje: 'small', negociable: true, destacado: true, cochera: true },
        '?metraje=small&negociable=true&destacado=true&cochera=true',
      ],
      [
        'modalidad, precio y cochera',
        { operacion: 'ALQUILER', priceMax: 250000, cochera: true },
        '?operacion=ALQUILER&priceMax=250000&cochera=true',
      ],
    ])('combina filtros de %s', (_label, patch, expected) => {
      const view = renderHookInUrl()

      applyFilters(view, { ...empty(), ...patch })

      expect(view.search()).toBe(expected)
    })

    it('reemplaza la entrada del historial en vez de apilar una por cada filtro', () => {
      const view = renderHookInUrl()

      expect(view.navigationType()).toBe('POP')

      applyFilters(view, { ...empty(), operacion: 'VENTA' })
      expect(view.navigationType()).toBe('REPLACE')

      applyFilters(view, { ...view.result.current.filters, metraje: 'mid' })
      expect(view.navigationType()).toBe('REPLACE')
    })

    it('reconstruye los mismos filtros al releer la query string que acaba de escribir', () => {
      const view = renderHookInUrl()

      applyFilters(view, ALL_FILTERS)

      expect(view.result.current.filters).toEqual(ALL_FILTERS)
    })
  })

  describe('Simulación de URL inicial (filtros cargados aplicados)', () => {
    it('carga los filtros por defecto cuando la URL no tiene query string', () => {
      const view = renderHookInUrl()

      expect(view.result.current.filters).toEqual(empty())
      expect(view.search()).toBe('')
    })

    it('carga todos los filtros aplicados desde la URL', () => {
      const view = renderHookInUrl(ALL_FILTERS_QUERY)

      expect(view.result.current.filters).toEqual(ALL_FILTERS)
    })

    it.each([
      ['operacion', 'ALQUILER'],
      ['moneda', 'PEN'],
      ['priceMin', 250000],
      ['priceMax', 300000],
      ['metraje', 'mid'],
      ['habitaciones', 3],
      ['negociable', true],
      ['destacado', true],
      ['cochera', true],
    ])('mapea el parámetro %s de la URL al objeto de filtros', (param, expected) => {
      const view = renderHookInUrl(ALL_FILTERS_QUERY)

      expect(view.result.current.filters[param]).toEqual(expected)
    })

    it('convierte los precios y las habitaciones a número', () => {
      const view = renderHookInUrl('/?priceMin=120000&priceMax=480000&habitaciones=2')

      expect(view.result.current.filters).toMatchObject({
        priceMin: 120000,
        priceMax: 480000,
        habitaciones: 2,
      })
    })

    it.each(['COMPRA', 'venta', ''])('descarta la modalidad inválida "%s"', (operacion) => {
      const view = renderHookInUrl(`/?operacion=${operacion}`)

      expect(view.result.current.filters.operacion).toBe('')
    })

    it.each(['huge', 'SMALL', ''])('descarta el metraje inválido "%s"', (metraje) => {
      const view = renderHookInUrl(`/?metraje=${metraje}`)

      expect(view.result.current.filters.metraje).toBe('')
    })

    it.each(['abc', 'NaN', '12px', '-'])(
      'descarta el precio mínimo no numérico "%s" y cae al mínimo del catálogo',
      (priceMin) => {
        const view = renderHookInUrl(`/?priceMin=${priceMin}`)

        expect(view.result.current.filters.priceMin).toBe(BOUNDS.min)
      },
    )

    it.each(['abc', 'NaN', '30k'])(
      'descarta el precio máximo no numérico "%s" y cae al máximo del catálogo',
      (priceMax) => {
        const view = renderHookInUrl(`/?priceMax=${priceMax}`)

        expect(view.result.current.filters.priceMax).toBe(BOUNDS.max)
      },
    )

    it.each(['xyz', 'tres', '-'])(
      'descarta las habitaciones no numéricas "%s" y las deja en null',
      (habitaciones) => {
        const view = renderHookInUrl(`/?habitaciones=${habitaciones}`)

        expect(view.result.current.filters.habitaciones).toBeNull()
      },
    )

    it.each(['1', 'TRUE', 'True', 'si', ''])('trata "%s" como característica desactivada', (value) => {
      const view = renderHookInUrl(`/?negociable=${value}&destacado=${value}&cochera=${value}`)

      expect(view.result.current.filters).toMatchObject({
        negociable: false,
        destacado: false,
        cochera: false,
      })
    })

    it('respeta los precios fuera de los bounds del catálogo', () => {
      const view = renderHookInUrl('/?priceMin=999999999&priceMax=1')

      expect(view.result.current.filters).toMatchObject({ priceMin: 999999999, priceMax: 1 })
    })

    it('usa los bounds del catálogo vacío cuando no hay catálogo que los fije', () => {
      const view = renderHookInUrl('/?operacion=VENTA', EMPTY_BOUNDS)

      expect(view.result.current.filters).toEqual({ ...emptyFilters(0, 1), operacion: 'VENTA' })
    })

    it('toma el primer valor cuando un parámetro viene duplicado en la URL', () => {
      const view = renderHookInUrl('/?operacion=ALQUILER&operacion=VENTA&cochera=false&cochera=true')

      expect(view.result.current.filters).toMatchObject({ operacion: 'ALQUILER', cochera: false })
    })

    it('ignora parámetros ajenos a los filtros del catálogo', () => {
      const view = renderHookInUrl('/?utm_source=instagram&pagina=2&operacion=VENTA')

      expect(view.result.current.filters).toEqual({ ...empty(), operacion: 'VENTA' })
    })

    // `Number('')` es 0, así que un parámetro numérico presente pero vacío
    // se interpreta como 0 en vez de caer al default del catálogo. Es
    // inocuo porque `applyFilters` nunca escribe un parámetro numérico
    // vacío, pero el comportamiento queda fijado para que no cambie por
    // accidente al tocar el parseo.
    it.each(['priceMin', 'priceMax', 'habitaciones'])(
      'interpreta "%s=" (presente pero vacío) como 0',
      (param) => {
        const view = renderHookInUrl(`/?${param}=`)

        expect(view.result.current.filters[param]).toBe(0)
      },
    )
  })

  describe('Reset de filtros', () => {
    it('vacía la query string y restaura los filtros por defecto', () => {
      const view = renderHookInUrl(ALL_FILTERS_QUERY)
      expect(view.result.current.filters).toEqual(ALL_FILTERS)

      clearFilters(view)

      expect(view.search()).toBe('')
      expect(view.result.current.filters).toEqual(empty())
    })

    it('reemplaza la entrada del historial en vez de apilar', () => {
      const view = renderHookInUrl(ALL_FILTERS_QUERY)

      clearFilters(view)

      expect(view.navigationType()).toBe('REPLACE')
    })

    it('es idempotente cuando la URL ya está vacía', () => {
      const view = renderHookInUrl()

      clearFilters(view)
      clearFilters(view)

      expect(view.search()).toBe('')
      expect(view.result.current.filters).toEqual(empty())
    })

    it('borra también los parámetros ajenos que vinieran en la URL', () => {
      const view = renderHookInUrl('/?utm_source=instagram&operacion=VENTA')

      clearFilters(view)

      expect(view.search()).toBe('')
      expect(view.result.current.filters).toEqual(empty())
    })

    it.each([
      [
        'metraje',
        { operacion: 'VENTA', metraje: 'mid', habitaciones: 3 },
        { metraje: '' },
        '?operacion=VENTA&habitaciones=3',
      ],
      [
        'modalidad',
        { operacion: 'ALQUILER', metraje: 'large', cochera: true },
        { operacion: '' },
        '?metraje=large&cochera=true',
      ],
      [
        'habitaciones',
        { operacion: 'ALQUILER', habitaciones: 3, destacado: true },
        { habitaciones: null },
        '?operacion=ALQUILER&destacado=true',
      ],
      [
        'rango de precio',
        { priceMin: 200000, priceMax: 300000, metraje: 'small' },
        { priceMin: BOUNDS.min, priceMax: BOUNDS.max },
        '?metraje=small',
      ],
      [
        'característica',
        { operacion: 'VENTA', negociable: true, cochera: true },
        { cochera: false },
        '?operacion=VENTA&negociable=true',
      ],
    ])(
      'al quitar el chip de %s solo borra ese parámetro de la URL',
      (_label, active, patch, expected) => {
        const view = renderHookInUrl()

        applyFilters(view, { ...empty(), ...active })
        applyFilters(view, { ...view.result.current.filters, ...patch })

        expect(view.search()).toBe(expected)
      },
    )

    it('deja la URL vacía tras quitar uno a uno todos los chips activos', () => {
      const view = renderHookInUrl()

      applyFilters(view, ALL_FILTERS)

      const removals = [
        { metraje: '' },
        { habitaciones: null },
        { negociable: false },
        { destacado: false },
        { cochera: false },
        { priceMin: BOUNDS.min, priceMax: BOUNDS.max },
        { operacion: '' },
        { moneda: '' },
      ]

      removals.forEach((patch) => {
        applyFilters(view, { ...view.result.current.filters, ...patch })
      })

      expect(view.search()).toBe('')
      expect(view.result.current.filters).toEqual(empty())
    })

    it('vuelve al estado inicial tras aplicar filtros y luego resetear', () => {
      const view = renderHookInUrl()

      applyFilters(view, ALL_FILTERS)
      expect(view.search()).toBe(ALL_FILTERS_QUERY)

      clearFilters(view)

      expect(view.search()).toBe('')
      expect(view.result.current.filters).toEqual(empty())
    })

    it('permite volver a aplicar filtros después de un reset', () => {
      const view = renderHookInUrl()

      applyFilters(view, { ...empty(), operacion: 'VENTA' })
      clearFilters(view)
      applyFilters(view, { ...empty(), metraje: 'large' })

      expect(view.search()).toBe('?metraje=large')
    })
  })
})