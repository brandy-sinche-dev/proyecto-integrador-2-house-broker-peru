// =============================================================
// Pruebas de los servicios HTTP del catálogo
// TASK-TEST-PROP-02: mocks de respuestas HTTP (axios-mock-adapter)
// =============================================================
//
// Estas pruebas simulan la API con `axios-mock-adapter` sobre la
// misma instancia de Axios (`services/axios`), por lo que también
// se ejercita el interceptor de errores (normalización de mensajes).
// El endpoint de lista se mockea con la forma paginada del contrato
// (`count` / `next` / `previous` / `results`).

import MockAdapter from 'axios-mock-adapter'
import api from './axios'
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from './properties'

const LIST_PATH = '/v1/properties'

const sampleProperty = {
  id: 'prop-1',
  title: 'Departamento en Miraflores',
  price: 420000,
  moneda: 'PEN',
  mode: 'VENTA',
  address: 'Av. Larco 123, Miraflores',
  property_type: 'DEPARTAMENTO',
  is_active: true,
  created_at: '2026-01-02T00:00:00Z',
}

describe('services/properties (mocks HTTP del catálogo)', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('getProperties', () => {
    it('desempaqueta la lista paginada y devuelve únicamente results', async () => {
      mock.onGet(LIST_PATH).reply(200, {
        count: 1,
        next: null,
        previous: null,
        results: [sampleProperty],
      })

      await expect(getProperties()).resolves.toEqual([sampleProperty])
    })

    it('conserva compatibilidad cuando la API responde un arreglo plano', async () => {
      mock.onGet(LIST_PATH).reply(200, [sampleProperty])

      await expect(getProperties()).resolves.toEqual([sampleProperty])
    })

    it('rechaza la promesa cuando el servidor responde 500', async () => {
      mock.onGet(LIST_PATH).reply(500, { detail: 'Error interno' })

      await expect(getProperties()).rejects.toMatchObject({
        status: 500,
        userMessage: 'Error interno',
      })
    })
  })

  describe('getProperty (detalle)', () => {
    it('devuelve el detalle de una propiedad existente', async () => {
      mock.onGet(`${LIST_PATH}/prop-1`).reply(200, sampleProperty)

      await expect(getProperty('prop-1')).resolves.toEqual(sampleProperty)
    })

    it('rechaza con mensaje normalizado cuando la propiedad no existe (404)', async () => {
      mock.onGet(`${LIST_PATH}/no-existe`).reply(404, {
        detail: 'Propiedad no encontrada',
      })

      await expect(getProperty('no-existe')).rejects.toMatchObject({
        status: 404,
        userMessage: 'Propiedad no encontrada',
      })
    })
  })

  describe('createProperty / updateProperty / deleteProperty', () => {
    it('crea una propiedad enviando el payload como JSON', async () => {
      const input = {
        title: 'Casa nueva',
        price: 250000,
        address: 'Calle Nueva 1',
        property_type: 'CASA',
        mode: 'VENTA',
      }
      mock.onPost(LIST_PATH).reply(201, { id: 'prop-2', ...input, is_active: true })

      const created = await createProperty(input)

      expect(created).toMatchObject({ id: 'prop-2', title: 'Casa nueva' })
      expect(JSON.parse(mock.history.post[0].data)).toEqual(input)
    })

    it('actualiza una propiedad existente', async () => {
      const input = {
        title: 'Casa editada',
        price: 260000,
        address: 'Calle Nueva 1',
        property_type: 'CASA',
        mode: 'ALQUILER',
      }
      mock.onPut(`${LIST_PATH}/prop-2`).reply(200, { id: 'prop-2', ...input })

      await expect(updateProperty('prop-2', input)).resolves.toMatchObject({
        title: 'Casa editada',
        mode: 'ALQUILER',
      })
    })

    it('da de baja lógica una propiedad (is_active = false)', async () => {
      mock
        .onDelete(`${LIST_PATH}/prop-2`)
        .reply(200, { ...sampleProperty, id: 'prop-2', is_active: false })

      await expect(deleteProperty('prop-2')).resolves.toMatchObject({
        id: 'prop-2',
        is_active: false,
      })
    })
  })
})
