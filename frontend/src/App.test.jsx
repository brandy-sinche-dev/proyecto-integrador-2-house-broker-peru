import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import api from './services/axios'
import App from './App'

const properties = [1, 2].map((n) => ({
  id: `prop-${n}`,
  title: `Departamento ${n}`,
  price: 420000,
  moneda: 'PEN',
  mode: 'VENTA',
  address: `Av. Ejemplo ${n}`,
  property_type: 'DEPARTAMENTO',
  is_active: true,
  status: 'DISPONIBLE',
  is_bookable: true,
  created_at: '2026-01-02T00:00:00Z',
}))

function renderApp(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

function storedVisits() {
  return JSON.parse(localStorage.getItem('hb_visits'))
}

async function openBooking(user, source, title = properties[0].title) {
  if (source === 'catálogo') {
    const heading = await screen.findByRole('heading', { name: title })
    await user.click(within(heading.closest('article')).getByRole('button', { name: 'Agendar visita' }))
  } else {
    await user.click(await screen.findByRole('button', { name: 'Agendar visita' }))
  }
  expect(screen.getByRole('heading', { name: 'Reservar Visita' })).toBeInTheDocument()
}

async function selectSlot(user) {
  // El selector actual no asocia su etiqueta al input de fecha.
  fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-12-10' } })
  await user.click(screen.getByRole('button', { name: '09:00 AM' }))
}

describe('App: confirmación simulada de visitas', () => {
  let mock

  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(api)
    mock.onGet('/v1/properties').reply(200, { count: 2, next: null, previous: null, results: properties })
    properties.forEach((property) => {
      mock.onGet(`/v1/properties/${property.id}`).reply(200, property)
    })
  })

  afterEach(() => {
    mock.restore()
    localStorage.clear()
  })

  it.each(['catálogo', 'detalle'])('abrir y cancelar desde %s conserva las visitas existentes', async (source) => {
    localStorage.setItem('hb_visits', JSON.stringify(['otra-propiedad']))
    const user = userEvent.setup()
    renderApp(source === 'catálogo' ? '/' : '/properties/prop-1')

    await openBooking(user, source)
    expect(storedVisits()).toEqual(['otra-propiedad'])
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
    await selectSlot(user)
    await user.click(screen.getByRole('button', { name: 'X' }))

    expect(screen.queryByRole('heading', { name: 'Reservar Visita' })).not.toBeInTheDocument()
    expect(storedVisits()).toEqual(['otra-propiedad'])
    await openBooking(user, source)
    expect(document.querySelector('input[type="date"]')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
  })

  it.each(['catálogo', 'detalle'])('confirmar desde %s añade el id solo al enviar', async (source) => {
    localStorage.setItem('hb_visits', JSON.stringify(['otra-propiedad']))
    const user = userEvent.setup()
    renderApp(source === 'catálogo' ? '/' : '/properties/prop-1')

    await openBooking(user, source)
    await selectSlot(user)
    expect(storedVisits()).toEqual(['otra-propiedad'])
    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))

    expect(screen.getByRole('heading', { name: /Visita Agendada con Éxito/ })).toBeInTheDocument()
    expect(storedVisits()).toEqual(['otra-propiedad', 'prop-1'])
    await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(storedVisits()).toEqual(['otra-propiedad', 'prop-1'])
    if (source === 'catálogo') {
      expect(screen.getByRole('button', { name: 'Visita agendada' })).toBeInTheDocument()
    }
  })

  it('confirmar de nuevo desde detalle no duplica ni elimina la visita', async () => {
    localStorage.setItem('hb_visits', JSON.stringify(['prop-1']))
    const user = userEvent.setup()
    renderApp('/properties/prop-1')

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await openBooking(user, 'detalle')
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
      await selectSlot(user)
      await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
      await user.click(screen.getByRole('button', { name: 'Aceptar' }))
      expect(storedVisits()).toEqual(['prop-1'])
    }
  })

  it.each(['cancelar', 'confirmar'])('abrir otro inmueble tras %s reinicia fecha, hora y éxito', async (action) => {
    const user = userEvent.setup()
    renderApp()
    await openBooking(user, 'catálogo')
    await selectSlot(user)
    if (action === 'confirmar') {
      await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
      await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    } else {
      await user.click(screen.getByRole('button', { name: 'X' }))
    }

    await openBooking(user, 'catálogo', properties[1].title)
    const form = screen.getByRole('button', { name: 'Confirmar Reserva' }).closest('form')
    expect(within(form).getByText(properties[1].title)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Visita Agendada con Éxito/ })).not.toBeInTheDocument()
    expect(document.querySelector('input[type="date"]')).toHaveValue('')
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-12-11' } })
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '11:00 AM' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
    expect(storedVisits()).toEqual(action === 'confirmar' ? ['prop-1', 'prop-2'] : ['prop-2'])
  })
})
