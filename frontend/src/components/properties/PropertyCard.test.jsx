// =============================================================
// Pruebas unitarias de renderizado de PropertyCard
// TASK-TEST-PROP-02: Jest + React Testing Library
// =============================================================
//
// Se valida que la tarjeta muestre la información clave del
// contrato (precio, mantenimiento, título, dirección, metraje),
// las etiquetas de modalidad/tipo, las insignias (destacado /
// negociable) y que los botones de guardar/visitar notifiquen
// al componente padre.

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyCard } from './PropertyCard'

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

function renderCard({ property = {}, saved = false, visit = false, ...props } = {}) {
  const onToggleSave = jest.fn()
  const onToggleVisit = jest.fn()
  render(
    <PropertyCard
      property={makeProperty(property)}
      saved={saved}
      visit={visit}
      onToggleSave={onToggleSave}
      onToggleVisit={onToggleVisit}
      {...props}
    />,
  )
  return { onToggleSave, onToggleVisit }
}

describe('PropertyCard', () => {
  describe('Renderizado de datos clave', () => {
    it('muestra precio, título y dirección del inmueble', () => {
      renderCard()

      expect(screen.getByText('S/. 420,000')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 3, name: 'Departamento en Miraflores' }),
      ).toBeInTheDocument()
      expect(screen.getByText('Av. Larco 123, Miraflores')).toBeInTheDocument()
    })

    it('muestra el mantenimiento mensual cuando está presente', () => {
      renderCard({ property: { mantenimiento: 1200 } })

      expect(screen.getByText('Mantenimiento: S/. 1,200 / mes')).toBeInTheDocument()
    })

    it('omite el mantenimiento cuando no está definido', () => {
      renderCard()

      expect(screen.queryByText(/Mantenimiento:/)).not.toBeInTheDocument()
    })

    it('lista las características disponibles (dormitorios, baños, área, cochera)', () => {
      renderCard({
        property: { dormitorios: 3, banos: 2, area_total: 120, estacionamientos: 1 },
      })

      const specs = screen.getByRole('list', { name: 'Características de la propiedad' })
      expect(within(specs).getByText('3')).toBeInTheDocument()
      expect(within(specs).getByText('DORM.')).toBeInTheDocument()
      expect(within(specs).getByText('2')).toBeInTheDocument()
      expect(within(specs).getByText('BAÑOS')).toBeInTheDocument()
      expect(within(specs).getByText('120')).toBeInTheDocument()
      expect(within(specs).getByText('M²')).toBeInTheDocument()
      expect(within(specs).getByText('1')).toBeInTheDocument()
      expect(within(specs).getByText('COCH.')).toBeInTheDocument()
    })

    it('no renderiza la lista de características cuando no hay datos', () => {
      renderCard()

      expect(
        screen.queryByRole('list', { name: 'Características de la propiedad' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('Modalidad, tipo e insignias', () => {
    it('traduce la modalidad VENTA a "En venta"', () => {
      renderCard()

      expect(screen.getByText('En venta')).toBeInTheDocument()
    })

    it('traduce la modalidad ALQUILER a "En alquiler"', () => {
      renderCard({ property: { mode: 'ALQUILER' } })

      expect(screen.getByText('En alquiler')).toBeInTheDocument()
    })

    it.each([
      ['DEPARTAMENTO', 'DEPARTAMENTO'],
      ['CASA', 'CASA'],
      ['TERRENO', 'TERRENO'],
      ['OFICINA', 'OFICINA'],
    ])('muestra la etiqueta del tipo %s', (type, expected) => {
      renderCard({ property: { property_type: type } })

      expect(screen.getByText(expected)).toBeInTheDocument()
    })

    it('mantiene el tipo original cuando no está en el catálogo', () => {
      renderCard({ property: { property_type: 'BODEGA' } })

      expect(screen.getByText('BODEGA')).toBeInTheDocument()
    })

    it('muestra la insignia DESTACADO y resalta la modalidad', () => {
      renderCard({ property: { destacado: true } })

      expect(screen.getByText('DESTACADO')).toBeInTheDocument()
      expect(screen.getByText('En venta')).toHaveClass('hpc__badge--gold')
    })

    it('muestra la insignia NEGOCIABLE cuando no es destacado', () => {
      renderCard({ property: { negociable: true } })

      expect(screen.getByText('NEGOCIABLE')).toBeInTheDocument()
      expect(screen.getByText('En venta')).toHaveClass('hpc__badge--bronze')
    })
  })

  describe('Acciones del usuario', () => {
    it('notifica al guardar con el id de la propiedad', async () => {
      const user = userEvent.setup()
      const { onToggleSave } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Guardar Departamento en Miraflores' }))

      expect(onToggleSave).toHaveBeenCalledWith('prop-1')
    })

    it('refleja el estado guardado y permite quitarlo', async () => {
      const user = userEvent.setup()
      const { onToggleSave } = renderCard({ saved: true })

      const button = screen.getByRole('button', {
        name: 'Quitar Departamento en Miraflores de guardados',
      })
      expect(button).toHaveAttribute('aria-pressed', 'true')

      await user.click(button)
      expect(onToggleSave).toHaveBeenCalledWith('prop-1')
    })

    it('alterna el agendado de visita y notifica el id', async () => {
      const user = userEvent.setup()
      const { onToggleVisit } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Agendar visita' }))

      expect(onToggleVisit).toHaveBeenCalledWith('prop-1')
    })

    it('muestra "Visita agendada" cuando la visita está activa', () => {
      renderCard({ visit: true })

      expect(screen.getByRole('button', { name: 'Visita agendada' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('ofrece un enlace de contacto por correo', () => {
      renderCard()

      expect(screen.getByRole('link', { name: /Contactar/ })).toHaveAttribute(
        'href',
        'mailto:asesores@housebroker.pe',
      )
    })
  })

  describe('Imagen de portada (WPO)', () => {
    it('renderiza la portada con carga diferida y dimensiones reservadas', () => {
      renderCard({ property: { link_galeria: 'https://cdn.test/foto.jpg' } })

      const img = screen.getByRole('img', { name: 'Vista de Departamento en Miraflores' })
      expect(img).toHaveAttribute('src', 'https://cdn.test/foto.jpg')
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img).toHaveAttribute('decoding', 'async')
      expect(img).toHaveAttribute('width', '640')
      expect(img).toHaveAttribute('height', '256')
    })

    it('prefiere la imagen principal de images[] sobre link_galeria', () => {
      renderCard({
        property: {
          link_galeria: 'https://cdn.test/fallback.jpg',
          images: [
            { url: 'https://cdn.test/secundaria.jpg' },
            { url: 'https://cdn.test/principal.jpg', es_principal: true },
          ],
        },
      })

      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/principal.jpg')
    })

    it('usa la primera imagen cuando ninguna está marcada como principal', () => {
      renderCard({ property: { images: [{ url: 'https://cdn.test/unica.jpg' }] } })

      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/unica.jpg')
    })

    it('no renderiza imagen cuando la propiedad no tiene portada', () => {
      renderCard()

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  describe('Navegación al detalle (WPO-PROP-01)', () => {
    it('expone el título como botón que notifica el id cuando onOpen está definido', async () => {
      const user = userEvent.setup()
      const onOpen = jest.fn()
      renderCard({ onOpen })

      await user.click(screen.getByRole('button', { name: 'Departamento en Miraflores' }))

      expect(onOpen).toHaveBeenCalledWith('prop-1')
    })

    it('mantiene el título como texto plano cuando no hay onOpen', () => {
      renderCard()

      expect(
        screen.getByRole('heading', { level: 3, name: 'Departamento en Miraflores' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Departamento en Miraflores' }),
      ).not.toBeInTheDocument()
    })
  })
})
