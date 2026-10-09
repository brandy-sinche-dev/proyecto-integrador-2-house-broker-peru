import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import api from './services/axios'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { parseSessionUser } from './services/session'

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
  // Misma composición que `main.tsx`: el router envuelve al `AuthProvider`,
  // porque el proveedor llama a `useNavigate` en su `signOut`.
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function storedVisits() {
  return JSON.parse(localStorage.getItem('hb_visits'))
}

// La app abre en la landing (`Home`); el catálogo es la sección
// "Propiedades" del header, así que las pruebas de catálogo deben navegar
// hasta ella antes de interactuar con las tarjetas.
async function goToCatalog(user) {
  await user.click(await screen.findByRole('button', { name: 'Propiedades' }))
}

async function openBooking(user, source, title = properties[0].title) {
  if (source === 'catálogo') {
    if (!within(document.body).queryByRole('heading', { name: title })) {
      await goToCatalog(user)
    }
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
    // `AuthProvider` refresca la sesión al montar; la sesión válida es la que
    // deja `isLoggedIn` en `true` y el modal puede mostrar "Reservar Visita".
    mock.onPost('/v1/auth/refresh').reply(200, {
      access: 'access-test',
      token_type: 'Bearer',
      expires_in: 300,
      user: {
        id: 'user-test',
        email: 'cliente@test.pe',
        full_name: 'Cliente de Pruebas',
        role: 'CLIENTE',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    })
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

describe('App: favoritos (HU-PROP-05)', () => {
  let mock

  const sessionUser = {
    id: 'user-test',
    email: 'cliente@test.pe',
    full_name: 'Cliente de Pruebas',
    role: 'CLIENTE',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
    localStorage.clear()
  })

  function loggedIn() {
    mock.onPost('/v1/auth/refresh').reply(200, {
      access: 'access-test',
      token_type: 'Bearer',
      expires_in: 300,
      user: sessionUser,
    })
  }

  function anonymous() {
    mock.onPost('/v1/auth/refresh').reply(401, {
      code: 'unauthorized',
      message: 'No hay sesión activa',
    })
  }

  function feed(properties) {
    mock.onGet('/v1/properties').reply(200, {
      count: properties.length,
      next: null,
      previous: null,
      results: properties,
    })
  }

  function favoritesPage(results = []) {
    mock.onGet('/v1/favorites/').reply(200, {
      count: results.length,
      next: null,
      previous: null,
      results,
    })
  }

  function favoriteStatus() {
    return screen.getByRole('status', { name: 'Favoritos' })
  }

  it('CA-3: un usuario anónimo ve el aviso, guarda el intento y lo descarta al cerrar', async () => {
    anonymous()
    feed(properties)
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    const heart = await screen.findByRole('button', { name: 'Guardar Departamento 1' })
    await user.click(heart)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Inicia sesión para guardar favoritos')
    expect(within(dialog).getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus()
    expect(favoriteStatus()).toBeEmptyDOMElement()
    expect(localStorage.getItem('hb_pending_favorite')).toBe('prop-1')

    await user.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('hb_pending_favorite')).toBeNull()
    expect(heart).toHaveFocus()
  })

  it('CA-1: con sesión marca optimistamente el corazón y persiste el cambio', async () => {
    loggedIn()
    feed(properties)
    favoritesPage([])
    let posted = 0
    mock.onPost('/v1/favorites/').reply((config) => {
      posted += 1
      expect(JSON.parse(config.data)).toEqual({ property_id: 'prop-1' })
      return [200, { property: { ...properties[0], is_favorite: true }, added_at: '2026-01-05T00:00:00Z' }]
    })
    let deleted = 0
    mock.onDelete('/v1/favorites/prop-1/').reply(() => {
      deleted += 1
      return [204]
    })
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    const heart = await screen.findByRole('button', { name: 'Guardar Departamento 1' })
    const status = favoriteStatus()
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toBeEmptyDOMElement()
    await user.click(heart)
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(posted).toBe(1)
    await waitFor(() => expect(status).toHaveTextContent('Departamento 1 añadido a favoritos.'))

    await user.click(screen.getByRole('button', { name: 'Quitar Departamento 1 de guardados' }))
    expect(screen.getByRole('button', { name: 'Guardar Departamento 1' })).toHaveAttribute('aria-pressed', 'false')
    expect(deleted).toBe(1)
    await waitFor(() => expect(status).toHaveTextContent('Departamento 1 quitado de favoritos.'))
  })

  it('CA-2: la sección Guardados se alimenta de los favoritos del servidor', async () => {
    loggedIn()
    feed(properties)
    favoritesPage([{ property: properties[0], added_at: '2026-01-05T00:00:00Z' }])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Guardados' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis guardados' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Departamento 1' })).toBeInTheDocument()
    expect(favoriteStatus()).toBeEmptyDOMElement()
  })

  it('conserva el anuncio al quitar con teclado la última tarjeta de Guardados', async () => {
    loggedIn()
    feed(properties)
    favoritesPage([{ property: properties[0], added_at: '2026-01-05T00:00:00Z' }])
    mock.onDelete('/v1/favorites/prop-1/').reply(204)
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    await screen.findByRole('button', { name: 'Quitar Departamento 1 de guardados' })
    await user.click(screen.getByRole('button', { name: /^Guardados/ }))
    const status = favoriteStatus()
    screen.getByRole('button', { name: 'Quitar Departamento 1 de guardados' }).focus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(status).toHaveTextContent('Departamento 1 quitado de favoritos.'))
    expect(screen.queryByRole('heading', { level: 3, name: 'Departamento 1' })).not.toBeInTheDocument()
    expect(favoriteStatus()).toBe(status)
  })

  it.each([false, true])('anuncia la restauración del estado si falla la petición (guardado=%s)', async (saved) => {
    loggedIn()
    feed(properties)
    favoritesPage(saved ? [{ property: properties[0], added_at: '2026-01-05T00:00:00Z' }] : [])
    mock.onPost('/v1/favorites/').reply(500)
    mock.onDelete('/v1/favorites/prop-1/').reply(500)
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    const label = saved ? 'Quitar Departamento 1 de guardados' : 'Guardar Departamento 1'
    await user.click(await screen.findByRole('button', { name: label }))

    await waitFor(() => expect(favoriteStatus()).toHaveTextContent(
      'No se pudo actualizar Departamento 1. Se restauró el estado anterior de favoritos.',
    ))
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', String(saved))
  })

  it('aplica un favorito pendiente al iniciar sesión y limpia el intento', async () => {
    localStorage.setItem('hb_pending_favorite', 'prop-1')
    loggedIn()
    feed(properties)
    favoritesPage([])
    mock.onPost('/v1/favorites/').reply(200, {
      property: { ...properties[0], is_favorite: true },
      added_at: '2026-01-05T00:00:00Z',
    })
    const user = userEvent.setup()
    renderApp()
    await goToCatalog(user)

    expect(
      await screen.findByRole('button', { name: 'Quitar Departamento 1 de guardados' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(mock.history.post.filter((c) => c.url === '/v1/favorites/')).toHaveLength(1)
    expect(localStorage.getItem('hb_pending_favorite')).toBeNull()
    expect(favoriteStatus()).toHaveTextContent('Departamento 1 añadido a favoritos.')
  })

  it('anuncia cuando no se puede guardar el intento pendiente tras el login', async () => {
    localStorage.setItem('hb_pending_favorite', 'prop-1')
    loggedIn()
    feed(properties)
    favoritesPage([])
    mock.onPost('/v1/favorites/').reply(500)
    renderApp()

    await waitFor(() => expect(favoriteStatus()).toHaveTextContent(
      'No se pudo guardar el favorito pendiente. Inténtalo de nuevo.',
    ))
  })

  it('normaliza el id numérico del backend para que la sesión sobreviva a la recarga', async () => {
    mock.onPost('/v1/auth/refresh').reply(200, {
      access: 'access-test',
      token_type: 'Bearer',
      expires_in: 300,
      user: { id: 1, email: sessionUser.email, full_name: sessionUser.full_name, role: 'CLIENTE' },
    })
    feed(properties)

    const user = userEvent.setup()
    renderApp()
    await goToCatalog(user)
    await screen.findByRole('heading', { level: 1, name: 'Propiedades en Perú' })

    const stored = localStorage.getItem('hb_user')
    expect(JSON.parse(stored).id).toBe('1')
    expect(parseSessionUser(stored)).toMatchObject({ id: '1', role: 'CLIENTE' })
  })
})
