// =============================================================
// Pruebas de la vista de detalle de una propiedad
// TASK-WPO-PROP-02: ruta diferida con React.lazy + Suspense
// =============================================================
//
// Se monta el componente dentro de un router en memoria para
// resolver el parámetro `:id`, y se simula la API de detalle con
// `axios-mock-adapter` sobre la instancia real de Axios.

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import api from '../../services/axios'
import { PropertyDetail } from './PropertyDetail'

const DETAIL_PATH = '/v1/properties'

function makeProperty(overrides = {}) {
  return {
    id: 'prop-1',
    title: 'Departamento en Miraflores',
    price: 420000,
    moneda: 'PEN',
    mode: 'VENTA',
    address: 'Av. Larco 123, Miraflores',
    property_type: 'DEPARTAMENTO',
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  }
}

function renderDetail(id = 'prop-1') {
  const onBack = jest.fn()
  render(
    <MemoryRouter initialEntries={[`/properties/${id}`]}>
      <Routes>
        <Route path="/properties/:id" element={<PropertyDetail onBack={onBack} />} />
      </Routes>
    </MemoryRouter>,
  )
  return { onBack }
}

describe('PropertyDetail', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('muestra el detalle completo de la propiedad', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(
      200,
      makeProperty({
        dormitorios: 3,
        banos: 2,
        area_total: 120,
        area_construida: 95,
        estacionamientos: 1,
        mantenimiento: 250,
      }),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Departamento en Miraflores' }),
    ).toBeInTheDocument()
    expect(screen.getByText('S/. 420,000')).toBeInTheDocument()
    expect(screen.getByText('Av. Larco 123, Miraflores')).toBeInTheDocument()
    expect(screen.getByText('Departamento')).toBeInTheDocument()
    expect(screen.getByText('120 m²')).toBeInTheDocument()
    expect(screen.getByText('95 m²')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('S/. 250 / mes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contactar asesor' })).toHaveAttribute(
      'href',
      'mailto:asesores@housebroker.pe',
    )
  })

  it('omite las características no informadas', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(200, makeProperty())

    renderDetail()

    await screen.findByRole('heading', { level: 1, name: 'Departamento en Miraflores' })
    expect(screen.queryByText('Dormitorios')).not.toBeInTheDocument()
    expect(screen.queryByText('Baños')).not.toBeInTheDocument()
    expect(screen.queryByText('Mantenimiento')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver planos' })).not.toBeInTheDocument()
  })

  it('renderiza la portada con prioridad alta para el LCP', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(
      200,
      makeProperty({
        mode: 'ALQUILER',
        images: [
          { url: 'https://cdn.test/secundaria.jpg' },
          { url: 'https://cdn.test/principal.jpg', es_principal: true },
        ],
      }),
    )

    renderDetail()

    const img = await screen.findByRole('img', { name: 'Vista de Departamento en Miraflores' })
    expect(img).toHaveAttribute('src', 'https://cdn.test/principal.jpg')
    expect(img).toHaveAttribute('width', '960')
    expect(img).toHaveAttribute('height', '540')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(screen.getByText('En alquiler')).toBeInTheDocument()
  })

  it('usa link_galeria cuando no hay arreglo de imágenes', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(
      200,
      makeProperty({ link_galeria: 'https://cdn.test/galeria.jpg' }),
    )

    renderDetail()

    expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://cdn.test/galeria.jpg')
  })

  it('muestra el enlace a planos cuando existe', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(
      200,
      makeProperty({ link_planos: 'https://cdn.test/planos.pdf', property_type: 'BODEGA' }),
    )

    renderDetail()

    const planos = await screen.findByRole('link', { name: 'Ver planos' })
    expect(planos).toHaveAttribute('href', 'https://cdn.test/planos.pdf')
    expect(screen.getByText('BODEGA')).toBeInTheDocument()
  })

  it('muestra el error normalizado y permite reintentar', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).replyOnce(404, { detail: 'Propiedad no encontrada' })
    mock.onGet(`${DETAIL_PATH}/prop-1`).replyOnce(200, makeProperty())
    const user = userEvent.setup()

    renderDetail()

    expect(await screen.findByText('No pudimos mostrar la propiedad')).toBeInTheDocument()
    expect(screen.getByText('Propiedad no encontrada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Departamento en Miraflores' }),
    ).toBeInTheDocument()
  })

  it('invoca onBack al pulsar Volver al catálogo', async () => {
    mock.onGet(`${DETAIL_PATH}/prop-1`).reply(200, makeProperty())
    const user = userEvent.setup()
    const { onBack } = renderDetail()

    await screen.findByRole('heading', { level: 1, name: 'Departamento en Miraflores' })
    await user.click(screen.getByRole('button', { name: /Volver al catálogo/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
