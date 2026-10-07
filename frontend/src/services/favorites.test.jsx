import MockAdapter from 'axios-mock-adapter'
import api from './axios'
import { addFavorite, getFavorites, removeFavorite } from './favorites'

const property = () => ({
  id: 'prop-1',
  title: 'Departamento en Miraflores',
  price: 420000,
  moneda: 'PEN',
  mode: 'VENTA',
  address: 'Av. Ejemplo 1',
  property_type: 'DEPARTAMENTO',
  is_active: true,
  status: 'DISPONIBLE',
  is_bookable: true,
  created_at: '2026-01-02T00:00:00Z',
})

describe('services/favorites', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('getFavorites', () => {
    it('normaliza la página del servidor como Property[] con is_favorite=true', async () => {
      mock.onGet('/v1/favorites/').reply(200, {
        count: 1,
        next: null,
        previous: null,
        results: [{ property: property(), added_at: '2026-01-05T00:00:00Z' }],
      })

      const list = await getFavorites()

      expect(list).toHaveLength(1)
      expect(list[0]).toMatchObject({ id: 'prop-1', is_favorite: true })
    })

    it('devuelve una lista vacía si el servidor no envía results', async () => {
      mock.onGet('/v1/favorites/').reply(200, { count: 0 })

      await expect(getFavorites()).resolves.toEqual([])
    })
  })

  it('addFavorite envía el property_id y devuelve la entrada guardada', async () => {
    let body
    mock.onPost('/v1/favorites/').reply((config) => {
      body = JSON.parse(config.data)
      return [200, { property: { ...property(), is_favorite: true }, added_at: '2026-01-05T00:00:00Z' }]
    })

    const entry = await addFavorite('prop-1')

    expect(body).toEqual({ property_id: 'prop-1' })
    expect(entry.property).toMatchObject({ id: 'prop-1', is_favorite: true })
  })

  it('removeFavorite hace DELETE al recurso con trailing slash', async () => {
    let deletedUrl
    mock.onDelete(/^\/v1\/favorites\/.+\/$/).reply((config) => {
      deletedUrl = config.url
      return [204]
    })

    await removeFavorite('prop-1')

    expect(deletedUrl).toBe('/v1/favorites/prop-1/')
  })
})