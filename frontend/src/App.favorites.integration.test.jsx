// =============================================================
// Pruebas de integración de favoritos (HU-PROP-05)
// TASK-TEST-PROP-05: MSW simula guardado, error y eliminación
// =============================================================
//
// Se renderiza la App completa (router + AuthProvider) y MSW intercepta las
// peticiones reales de Axios, de modo que la sección "Mis guardados" se
// alimenta del estado que devuelve el servidor simulado.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import App from './App'
import { AuthProvider } from './context/AuthContext'

const API = 'http://localhost:8000/api'

const sessionUser = {
  id: 'user-test',
  email: 'cliente@test.pe',
  full_name: 'Cliente de Pruebas',
  role: 'CLIENTE',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

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

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function loggedIn() {
  return http.post(`${API}/v1/auth/refresh`, () =>
    HttpResponse.json({
      access: 'access-test',
      token_type: 'Bearer',
      expires_in: 300,
      user: sessionUser,
    }),
  )
}

function catalog() {
  return http.get(`${API}/v1/properties`, () =>
    HttpResponse.json({
      count: properties.length,
      next: null,
      previous: null,
      results: properties,
    }),
  )
}

function favorites(results = []) {
  return http.get(`${API}/v1/favorites/`, () =>
    HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    }),
  )
}

function favoriteStatus() {
  return screen.getByRole('status', { name: 'Favoritos' })
}

async function goToCatalog(user) {
  await user.click(await screen.findByRole('button', { name: 'Propiedades' }))
}

async function goToSaved(user) {
  await user.click(await screen.findByRole('button', { name: /^Guardados/ }))
}

describe('App: favoritos con MSW (TASK-TEST-PROP-05)', () => {
  it('quita un favorito de "Mis guardados" y lo refleja en tiempo real', async () => {
    const deleted = []
    server.use(
      loggedIn(),
      catalog(),
      favorites([{ property: properties[0], added_at: '2026-01-05T00:00:00Z' }]),
      http.delete(`${API}/v1/favorites/:propertyId/`, ({ params }) => {
        deleted.push(params.propertyId)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp()

    await goToSaved(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis guardados' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Departamento 1' })).toBeInTheDocument()

    const status = favoriteStatus()
    await user.click(screen.getByRole('button', { name: 'Quitar Departamento 1 de guardados' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 3, name: 'Departamento 1' })).not.toBeInTheDocument(),
    )
    expect(deleted).toEqual(['prop-1'])
    expect(status).toHaveTextContent('Departamento 1 quitado de favoritos.')
    expect(screen.getByRole('button', { name: /^Guardados/ })).toBeInTheDocument()
  })

  it('guarda desde el catálogo y el inmueble aparece en "Mis guardados"', async () => {
    const posted = []
    server.use(
      loggedIn(),
      catalog(),
      favorites([]),
      http.post(`${API}/v1/favorites/`, async ({ request }) => {
        const body = await request.json()
        posted.push(body)
        return HttpResponse.json(
          { property: { ...properties[0], is_favorite: true }, added_at: '2026-01-05T00:00:00Z' },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    const heart = await screen.findByRole('button', { name: 'Guardar Departamento 1' })
    await user.click(heart)

    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(favoriteStatus()).toHaveTextContent('Departamento 1 añadido a favoritos.'))
    expect(posted).toEqual([{ property_id: 'prop-1' }])

    await goToSaved(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis guardados' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Departamento 1' })).toBeInTheDocument()
  })

  it('restaura el estado y anuncia el error cuando el guardado falla', async () => {
    server.use(
      loggedIn(),
      catalog(),
      favorites([]),
      http.post(`${API}/v1/favorites/`, async () => {
        await delay(50)
        return HttpResponse.json({ detail: 'El servidor no está disponible.' }, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderApp()

    await goToCatalog(user)
    const heart = await screen.findByRole('button', { name: 'Guardar Departamento 1' })
    await user.click(heart)
    expect(heart).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() =>
      expect(favoriteStatus()).toHaveTextContent(
        'No se pudo actualizar Departamento 1. Se restauró el estado anterior de favoritos.',
      ),
    )
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Guardar Departamento 1' })).toBeInTheDocument()
  })

  it('mantiene la sección "Mis guardados" vacía si el servidor no devuelve favoritos', async () => {
    server.use(loggedIn(), catalog(), favorites([]))
    const user = userEvent.setup()
    renderApp()

    await goToSaved(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis guardados' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })
})
