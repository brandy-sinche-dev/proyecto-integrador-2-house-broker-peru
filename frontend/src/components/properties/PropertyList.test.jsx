// =============================================================
// Pruebas de integración del catálogo de propiedades
// TASK-TEST-PROP-02: Jest + React Testing Library
// =============================================================
//
// Se monta `PropertyList` dentro de un `MemoryRouter` (requerido
// por el hook de filtros basado en la URL) y se simula la API con
// `axios-mock-adapter` devolviendo una lista paginada. Se valida:
//   - carga (esqueleto) y renderizado de la primera página,
//   - cambio de página con el control de paginación,
//   - ordenamiento, modos de vista, búsqueda y filtros de la URL,
//   - estados vacío y de error con reintento,
//   - propagación de acciones de las tarjetas a la app.

import { act, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import api from '../../services/axios'
import { PropertyList } from './PropertyList'

const LIST_PATH = '/v1/properties'

function makeProperty(index, overrides = {}) {
  const n = index + 1
  return {
    id: `prop-${n}`,
    title: `Propiedad ${String(n).padStart(2, '0')}`,
    price: 100000 + n * 1000,
    moneda: 'PEN',
    mode: n % 2 === 0 ? 'ALQUILER' : 'VENTA',
    address: `Av. Ejemplo ${n}`,
    property_type: ['DEPARTAMENTO', 'CASA', 'TERRENO', 'OFICINA'][index % 4],
    is_active: true,
    created_at: `2026-01-${String(n).padStart(2, '0')}T00:00:00Z`,
    area_total: 60 + n * 10,
    area_construida: 60 + n * 10,
    dormitorios: (n % 5) + 1,
    banos: (n % 3) + 1,
    estacionamientos: n % 2,
    negociable: n % 3 === 0,
    destacado: n % 4 === 0,
    ...overrides,
  }
}

const manyProperties = (count) => Array.from({ length: count }, (_, i) => makeProperty(i))

const paginated = (results) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

function baseProps(overrides = {}) {
  return {
    mode: 'inicio',
    saved: [],
    visits: [],
    onToggleSave: jest.fn(),
    onToggleVisit: jest.fn(),
    onNavigate: jest.fn(),
    ...overrides,
  }
}

function renderList({ initialEntries = ['/'], props = {} } = {}) {
  const merged = baseProps(props)
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <PropertyList {...merged} />
    </MemoryRouter>,
  )
  return { ...utils, props: merged }
}

const cardTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)

describe('PropertyList (integración del catálogo)', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('Carga y renderizado', () => {
    it('muestra el esqueleto de carga y luego la primera página del catálogo', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()

      expect(document.querySelector('.hprops__grid--skeleton')).toBeInTheDocument()

      expect(await screen.findByText('Mostrando 1–6 de 13 propiedades')).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6)
      expect(screen.getByText('13 propiedades encontradas')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Propiedades en Perú' })).toBeInTheDocument()
    })

    it('excluye las propiedades inactivas', async () => {
      mock.onGet(LIST_PATH).reply(
        200,
        paginated([
          makeProperty(0),
          makeProperty(1, { is_active: false }),
          makeProperty(2),
        ]),
      )

      renderList()

      expect(await screen.findByText('2 propiedades encontradas')).toBeInTheDocument()
      expect(cardTitles()).toEqual(['Propiedad 03', 'Propiedad 01'])
    })

    it('propaga las acciones de guardar y agendar visita de las tarjetas', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated([makeProperty(0)]))

      const { props } = renderList()
      await screen.findByRole('heading', { level: 3, name: 'Propiedad 01' })

      await user.click(screen.getByRole('button', { name: 'Guardar Propiedad 01' }))
      expect(props.onToggleSave).toHaveBeenCalledWith('prop-1')

      await user.click(screen.getByRole('button', { name: 'Agendar visita' }))
      expect(props.onToggleVisit).toHaveBeenCalledWith('prop-1')
    })
  })

  describe('Paginación', () => {
    it('cambia de página y deshabilita "siguiente" en la última', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()
      await screen.findByText('Mostrando 1–6 de 13 propiedades')
      expect(screen.getByRole('heading', { level: 3, name: 'Propiedad 13' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      expect(await screen.findByText('Mostrando 7–12 de 13 propiedades')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Propiedad 07' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Propiedad 01' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      expect(await screen.findByText('Mostrando 13–13 de 13 propiedades')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ir a la página siguiente' })).toBeDisabled()
    })

    it('vuelve a la primera página al cambiar un filtro', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()
      await screen.findByText('Mostrando 1–6 de 13 propiedades')

      await user.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
      expect(await screen.findByText('Mostrando 7–12 de 13 propiedades')).toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText('Ordenar propiedades'), 'price-asc')
      expect(await screen.findByText('Mostrando 1–6 de 13 propiedades')).toBeInTheDocument()
    })
  })

  describe('Ordenamiento y vista', () => {
    it('aplica todos los criterios de ordenamiento', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(
        200,
        paginated([
          makeProperty(0, { title: 'Alfa', price: 300000, area_total: 200, area_construida: 200, created_at: '2026-01-01T00:00:00Z' }),
          makeProperty(1, { title: 'Beta', price: 100000, area_total: 150, area_construida: 150, created_at: '2026-01-02T00:00:00Z' }),
          makeProperty(2, { title: 'Gamma', price: 200000, area_total: 250, area_construida: 250, created_at: '2026-01-03T00:00:00Z' }),
        ]),
      )

      renderList()
      await screen.findByText('3 propiedades encontradas')
      const select = screen.getByLabelText('Ordenar propiedades')

      expect(cardTitles()[0]).toBe('Gamma')

      await user.selectOptions(select, 'price-asc')
      expect(cardTitles()[0]).toBe('Beta')

      await user.selectOptions(select, 'price-desc')
      expect(cardTitles()[0]).toBe('Alfa')

      await user.selectOptions(select, 'area-desc')
      expect(cardTitles()[0]).toBe('Gamma')
    })

    it('cambia el modo de vista de la cuadrícula', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(3)))

      renderList()
      await screen.findByText('3 propiedades encontradas')

      expect(document.querySelector('.hprops__grid')).toHaveClass('hprops__grid--grid3')

      await user.click(screen.getByRole('button', { name: 'Lista' }))
      expect(document.querySelector('.hprops__grid')).toHaveClass('hprops__grid--list')

      await user.click(screen.getByRole('button', { name: 'Cuadrícula 2 columnas' }))
      expect(document.querySelector('.hprops__grid')).toHaveClass('hprops__grid--grid2')
    })
  })

  describe('Búsqueda y filtros', () => {
    it('filtra por texto y limpia la búsqueda con el botón Limpiar', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(
        200,
        paginated([
          makeProperty(0, { title: 'Casa Miraflores' }),
          makeProperty(1, { title: 'Casa San Isidro' }),
        ]),
      )

      renderList()
      await screen.findByText('2 propiedades encontradas')

      await user.type(screen.getByLabelText('Buscar propiedades'), 'miraflores')
      expect(await screen.findByText('1 propiedad encontrada')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Casa Miraflores' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Limpiar' }))
      expect(await screen.findByText('2 propiedades encontradas')).toBeInTheDocument()
    })

    it.each([
      ['modalidad', '/?operacion=VENTA'],
      ['rango de precio', '/?priceMin=110000&priceMax=112000'],
      ['metraje pequeño', '/?metraje=small'],
      ['metraje medio', '/?metraje=mid'],
      ['metraje grande', '/?metraje=large'],
      ['habitaciones', '/?habitaciones=3'],
      ['negociable', '/?negociable=true'],
      ['destacado', '/?destacado=true'],
      ['cochera', '/?cochera=true'],
      ['todos los filtros', '/?operacion=VENTA&priceMin=101000&priceMax=113000&metraje=mid&habitaciones=1&negociable=true&destacado=true&cochera=true'],
    ])('aplica el filtro de %s leído desde la URL', async (_label, initialPath) => {
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList({ initialEntries: [initialPath] })

      const states = await screen.findAllByText(/propiedades? encontradas?|Sin resultados/)
      expect(states.length).toBeGreaterThan(0)
    })

    it('permite eliminar cada chip de filtro activo', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList({
        initialEntries: [
          '/?operacion=VENTA&priceMin=105000&priceMax=112000&metraje=small&habitaciones=1&negociable=true&destacado=true&cochera=true',
        ],
      })
      await screen.findByRole('heading', { level: 1 })
      await user.type(screen.getByLabelText('Buscar propiedades'), 'propiedad')

      // TASK-WPO-PROP-03: el chip de búsqueda no aparece al terminar de
      // escribir, sino 300 ms después, que es cuando el debounce publica el
      // texto en la URL.
      await screen.findByRole('button', { name: 'Quitar filtro “propiedad”' })

      const chipButtons = () => screen.queryAllByRole('button', { name: /^Quitar filtro/ })
      expect(chipButtons().length).toBeGreaterThanOrEqual(8)

      while (chipButtons().length > 0) {
        await user.click(chipButtons()[0])
      }

      expect(chipButtons()).toHaveLength(0)
    })

    it('muestra el chip de modo y navega al inicio al quitarlo', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated([makeProperty(0)]))

      const { props } = renderList({
        props: { mode: 'guardados', saved: ['prop-1'] },
      })
      await screen.findByRole('heading', { level: 1, name: 'Mis guardados' })

      await user.click(screen.getByRole('button', { name: 'Quitar filtro Solo guardados' }))
      expect(props.onNavigate).toHaveBeenCalledWith('inicio')
    })

    it('etiqueta el chip del modo visitas', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated([makeProperty(0)]))

      renderList({ props: { mode: 'visitas', visits: ['prop-1'] } })
      await screen.findByRole('heading', { level: 1, name: 'Mis visitas' })

      expect(screen.getByRole('button', { name: 'Quitar filtro Solo mis visitas' })).toBeInTheDocument()
    })
  })

  // TASK-WPO-PROP-03: el debounce de 300 ms en la barra de busqueda. Con
  // temporizadores falsos se comprueba lo que el reloj real no deja ver de
  // forma fiable: que durante la escritura no hay ni una sola escritura en la
  // URL, y que al terminar hay exactamente una.
  describe('Búsqueda con debounce', () => {
    // `advanceTimers` deja que `userEvent` mueva el reloj falso por su cuenta
    // (si no, cada pulsación se quedaría colgada esperando un temporizador que
    // nadie avanza). El margen del debounce no lo avanza: eso lo hace la
    // prueba, a propósito.
    function setup() {
      return userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    }

    // El probe expone lo que realmente se escribió en la URL y con qué tipo de
    // navegación, que es lo que permite contar las escrituras por pulsación.
    function Probe({ onUrlWrite }) {
      const location = useLocation()
      const mounted = useRef(false)

      // Cada navegación de React Router genera una `key` nueva, también cuando
      // es un `replace`, así que cambiar de `key` es exactamente "se reescribió
      // la URL". El montaje inicial no cuenta como escritura.
      useEffect(() => {
        if (!mounted.current) {
          mounted.current = true
          return
        }
        onUrlWrite(location.search)
      }, [location.key, location.search, onUrlWrite])

      return (
        <>
          <span data-testid="search">{location.search}</span>
          <span data-testid="navigation-type">{useNavigationType()}</span>
        </>
      )
    }

    function renderListWithProbe({ initialEntries = ['/'], props = {}, onUrlWrite = jest.fn() } = {}) {
      const merged = baseProps(props)
      const utils = render(
        <MemoryRouter initialEntries={initialEntries}>
          <Probe onUrlWrite={onUrlWrite} />
          <PropertyList {...merged} />
        </MemoryRouter>,
      )
      return { ...utils, props: merged, onUrlWrite }
    }

    const search = () => screen.getByTestId('search').textContent
    const catalog = () => screen.getByRole('searchbox', { name: 'Buscar propiedades' })

    const CATALOG = () => [
      makeProperty(0, { title: 'Casa Miraflores' }),
      makeProperty(1, { title: 'Casa San Isidro' }),
    ]

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers()
      })
      jest.useRealTimers()
    })

    it('no escribe en la URL ni refiltra mientras se escribe', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe()
      await screen.findByText('2 propiedades encontradas')

      await user.type(catalog(), 'miraflores')

      // El input responde al instante, pero la URL sigue intacta y el catálogo
      // todavía muestra todo.
      expect(catalog()).toHaveValue('miraflores')
      expect(search()).toBe('')
      expect(screen.getByText('2 propiedades encontradas')).toBeInTheDocument()
    })

    it('publica una sola vez el texto final al dejar de escribir 300 ms', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe()
      await screen.findByText('2 propiedades encontradas')

      await user.type(catalog(), 'miraflores')
      expect(search()).toBe('')

      await act(async () => {
        jest.advanceTimersByTime(300)
      })

      expect(search()).toBe('?q=miraflores')
      expect(screen.getByText('1 propiedad encontrada')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Quitar filtro “miraflores”' })).toBeInTheDocument()
    })

    it('reinicia el margen en cada pulsación aunque la búsqueda dure más de 300 ms', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe()
      await screen.findByText('2 propiedades encontradas')

      const input = catalog()
      for (const char of 'miraflores') {
        await user.type(input, char)
        await act(async () => {
          jest.advanceTimersByTime(200)
        })
      }

      // 2 s escribiendo: si el margen no se reiniciara, habría publicaciones
      // intermedias por el camino.
      expect(search()).toBe('')

      await act(async () => {
        jest.advanceTimersByTime(300)
      })

      expect(search()).toBe('?q=miraflores')
    })

    it('no lanza una petición HTTP por carácter tipeado', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderListWithProbe()
      await screen.findByText('13 propiedades encontradas')
      expect(mock.history.get).toHaveLength(1)

      await user.type(catalog(), 'prop')
      await act(async () => {
        jest.advanceTimersByTime(300)
      })

      expect(search()).toBe('?q=prop')
      expect(mock.history.get).toHaveLength(1)
    })

    it('escribe la búsqueda una sola vez y sin apilar historial', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      const { onUrlWrite } = renderListWithProbe()
      await screen.findByText('2 propiedades encontradas')

      await user.type(catalog(), 'miraflores')

      expect(onUrlWrite).not.toHaveBeenCalled()

      await act(async () => {
        jest.advanceTimersByTime(300)
      })

      // Diez caracteres, una sola reescritura de la URL, con el texto completo.
      expect(onUrlWrite.mock.calls).toEqual([['?q=miraflores']])
      expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE')
    })

    it('muestra en el input la búsqueda que llega por la URL', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe({ initialEntries: ['/?q=miraflores'] })

      await screen.findByText('1 propiedad encontrada')
      expect(catalog()).toHaveValue('miraflores')
    })

    it('no resucita el término borrado cuando el debounce está pendiente', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe()
      await screen.findByText('2 propiedades encontradas')

      await user.type(catalog(), 'casa')
      await act(async () => {
        jest.advanceTimersByTime(300)
      })
      expect(search()).toBe('?q=casa')

      // Una pulsación más deja el debounce pendiente y después se limpia todo.
      await user.type(catalog(), 'x')
      await user.click(screen.getByRole('button', { name: 'Limpiar' }))

      expect(search()).toBe('')
      expect(catalog()).toHaveValue('')

      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      expect(search()).toBe('')
      expect(screen.getByText('2 propiedades encontradas')).toBeInTheDocument()
    })

    it('quitar el chip de búsqueda vacía el input y la URL', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(200, paginated(CATALOG()))

      renderListWithProbe({ initialEntries: ['/?q=miraflores'] })
      await screen.findByText('1 propiedad encontrada')

      await user.click(screen.getByRole('button', { name: 'Quitar filtro “miraflores”' }))

      expect(search()).toBe('')
      expect(catalog()).toHaveValue('')
      expect(screen.getByText('2 propiedades encontradas')).toBeInTheDocument()
    })

    it('conserva la búsqueda al aplicar un filtro del panel', async () => {
      const user = setup()
      mock.onGet(LIST_PATH).reply(
        200,
        paginated([
          makeProperty(0, { title: 'Casa Miraflores', negociable: true }),
          makeProperty(1, { title: 'Casa San Isidro' }),
        ]),
      )

      renderListWithProbe({ initialEntries: ['/?q=casa'] })
      await screen.findByText('2 propiedades encontradas')

      await user.click(screen.getByRole('checkbox', { name: 'Negociable' }))
      await user.click(screen.getByRole('button', { name: /Aplicar filtros/ }))

      expect(screen.getByTestId('search')).toHaveTextContent('q=casa')
      expect(screen.getByText('1 propiedad encontrada')).toBeInTheDocument()
    })
  })

  describe('Estados vacío y de error', () => {
    it('muestra el estado vacío del catálogo sin propiedades', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated([]))

      const { props } = renderList()

      expect(await screen.findByText('Sin propiedades disponibles')).toBeInTheDocument()

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ver propiedades' }))
      expect(props.onNavigate).toHaveBeenCalledWith('inicio')
    })

    it('muestra "Sin resultados" y permite limpiar los filtros', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated([makeProperty(0), makeProperty(1)]))

      renderList({ initialEntries: ['/?priceMin=999999'] })

      expect(await screen.findByText('Sin resultados')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
      expect(await screen.findByText('2 propiedades encontradas')).toBeInTheDocument()
    })

    it('muestra el error del servidor y permite reintentar', async () => {
      const user = userEvent.setup()
      mock
        .onGet(LIST_PATH)
        .replyOnce(500, { detail: 'Fallo del servidor' })
        .onGet(LIST_PATH)
        .reply(200, paginated(manyProperties(3)))

      renderList()

      expect(await screen.findByText('Ups, algo salió mal')).toBeInTheDocument()
      expect(screen.getByText('Fallo del servidor')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText('3 propiedades encontradas')).toBeInTheDocument()
    })
  })

  describe('Navegación', () => {
    it('navega a visitas y al concierge desde la barra de búsqueda', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(1)))

      const { props } = renderList()
      await screen.findByRole('heading', { level: 1 })

      await user.click(screen.getByRole('button', { name: /Visitas/ }))
      expect(props.onNavigate).toHaveBeenCalledWith('visitas')

      await user.click(screen.getByRole('button', { name: /Concierge IA/ }))
      expect(props.onNavigate).toHaveBeenCalledWith('concierge')
    })
  })

  // TASK-A11Y-PROP-03: la region viva del contador y los nombres
  // accesibles de la barra de busqueda. El anillo de foco de ambos
  // controles es CSS y no se puede verificar aqui (ver
  // docs/15_TASK_A11Y_PROP_03.md).
  describe('Accesibilidad', () => {
    const contador = () => document.querySelector('.hprops__subtitle')

    it('expone el contador de resultados en una región viva y atómica', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()
      await screen.findByText('13 propiedades encontradas')

      expect(contador()).toHaveAttribute('aria-live', 'polite')
      // `aria-atomic` hace que se anuncie el texto completo y no solo el
      // fragmento que cambió, que es lo que importa al alternar entre
      // "13 propiedades" y "Sin resultados".
      expect(contador()).toHaveAttribute('aria-atomic', 'true')
    })

    it('anuncia el nuevo conteo al aplicar un filtro desde el panel', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()
      await screen.findByText('13 propiedades encontradas')

      await user.click(screen.getByRole('checkbox', { name: 'Negociable' }))
      await user.click(screen.getByRole('button', { name: /Aplicar filtros/ }))

      // Con el filtro aplicado solo 4 de las 13 propiedades son negociables
      // (`index % 3 === 0` sobre 13 elementos).
      await waitFor(() => expect(contador()).toHaveTextContent('4 propiedades encontradas'))
      expect(contador()).toHaveAttribute('aria-live', 'polite')
    })

    it('anuncia el conteo singular cuando queda una sola propiedad', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated([makeProperty(0)]))

      renderList()

      expect(await screen.findByText('1 propiedad encontrada')).toBeInTheDocument()
      expect(contador()).toHaveAttribute('aria-live', 'polite')
    })

    it('mantiene la región viva montada al cambiar de página', async () => {
      const user = userEvent.setup()
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(13)))

      renderList()
      await screen.findByText('13 propiedades encontradas')

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      await screen.findByText('Mostrando 7–12 de 13 propiedades')

      // Si la region se desmontara y recreara en cada cambio, el lector de
      // pantalla no tendria nada que anunciar en laactualizacion siguiente.
      expect(contador()).toBeInTheDocument()
      expect(contador()).toHaveTextContent('13 propiedades encontradas')
    })

    it('da nombre accesible al campo de búsqueda y al select de orden', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(3)))

      renderList()
      await screen.findByRole('heading', { level: 1 })

      expect(screen.getByRole('searchbox', { name: 'Buscar propiedades' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Ordenar propiedades' })).toBeInTheDocument()
    })

    it('expone el grupo de vistas con nombre accesible', async () => {
      mock.onGet(LIST_PATH).reply(200, paginated(manyProperties(3)))

      renderList()
      await screen.findByRole('heading', { level: 1 })

      expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument()
    })
  })
})
