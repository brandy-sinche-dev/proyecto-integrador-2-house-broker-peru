// =============================================================
// Pruebas del cliente HTTP de favoritos (HU-PROP-05)
// TASK-TEST-PROP-05: mocks de endpoints con MSW
// =============================================================
//
// MSW intercepta las peticiones reales de Axios (XHR en jsdom), por lo que
// estas pruebas cubren también el interceptor que normaliza los errores.

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { addFavorite, getFavorites, removeFavorite } from './favorites'

const API = 'http://localhost:8000/api'
const FAVORITES = `${API}/v1/favorites/`

const property = {
  id: 'prop-1',
  title: 'Departamento en Miraflores',
  price: 420000,
  moneda: 'PEN',
  mode: 'VENTA',
  address: 'Av. Larco 123',
  property_type: 'DEPARTAMENTO',
  is_active: true,
  status: 'DISPONIBLE',
  is_bookable: true,
  created_at: '2026-01-02T00:00:00Z',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('services/favorites', () => {
  it('getFavorites devuelve los inmuebles marcados como favoritos', async () => {
    server.use(
      http.get(FAVORITES, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ property, added_at: '2026-01-05T00:00:00Z' }],
        }),
      ),
    )

    await expect(getFavorites()).resolves.toEqual([{ ...property, is_favorite: true }])
  })

  it('getFavorites tolera una página sin resultados', async () => {
    server.use(http.get(FAVORITES, () => HttpResponse.json({ count: 0 })))

    await expect(getFavorites()).resolves.toEqual([])
  })

  it('addFavorite envía el id del inmueble y devuelve la entrada creada', async () => {
    let body
    server.use(
      http.post(FAVORITES, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { property: { ...property, is_favorite: true }, added_at: '2026-01-05T00:00:00Z' },
          { status: 201 },
        )
      }),
    )

    await expect(addFavorite('prop-1')).resolves.toMatchObject({
      property: { id: 'prop-1', is_favorite: true },
    })
    expect(body).toEqual({ property_id: 'prop-1' })
  })

  it('removeFavorite elimina el favorito por su id', async () => {
    const deleted = []
    server.use(
      http.delete(`${API}/v1/favorites/:propertyId/`, ({ params }) => {
        deleted.push(params.propertyId)
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(removeFavorite('prop-1')).resolves.toMatchObject({ status: 204 })
    expect(deleted).toEqual(['prop-1'])
  })

  it('propaga el error del servidor normalizado por el interceptor', async () => {
    server.use(
      http.post(FAVORITES, () =>
        HttpResponse.json({ detail: 'No se pudo guardar el favorito.' }, { status: 500 }),
      ),
    )

    await expect(addFavorite('prop-1')).rejects.toMatchObject({
      status: 500,
      userMessage: 'No se pudo guardar el favorito.',
    })
  })
})
