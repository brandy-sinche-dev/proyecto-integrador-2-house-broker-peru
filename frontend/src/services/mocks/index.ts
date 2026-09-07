import MockAdapter from 'axios-mock-adapter'
import api from '../axios'
import {
  createProperty,
  deleteProperty,
  getProperties,
  getProperty,
  updateProperty,
} from './properties'

// Rutas del contrato definido en TASK-ARC-PROP-01 (openapi_spec.yaml)
const PROPERTIES_PATH = '/v1/properties'
const PROPERTY_DETAIL_PATH = /^\/v1\/properties\/[^/]+$/

export const setupMocks = (): MockAdapter => {
  const mock = new MockAdapter(api, { onNoMatch: 'passthrough' })

  mock.onGet(PROPERTIES_PATH).reply((config) => getProperties(config))
  mock.onPost(PROPERTIES_PATH).reply((config) => createProperty(config))
  mock.onGet(PROPERTY_DETAIL_PATH).reply((config) => {
    const id = (config.url ?? '').split('/').pop() ?? ''
    return getProperty(config, id)
  })
  mock.onPut(PROPERTY_DETAIL_PATH).reply((config) => {
    const id = (config.url ?? '').split('/').pop() ?? ''
    return updateProperty(config, id)
  })
  mock.onDelete(PROPERTY_DETAIL_PATH).reply((config) => {
    const id = (config.url ?? '').split('/').pop() ?? ''
    return deleteProperty(config, id)
  })

  return mock
}