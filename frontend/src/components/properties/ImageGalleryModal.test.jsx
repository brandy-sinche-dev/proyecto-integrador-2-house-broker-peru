// =============================================================
// Pruebas unitarias del modal de galería de imágenes
// Pruebas Unitarias de Componentes (Frontend) - HouseBroker Perú
// =============================================================

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageGalleryModal } from './ImageGalleryModal'

const IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
]

describe('Componente ImageGalleryModal (Pruebas Unitarias)', () => {
  it('retorna null cuando el arreglo de imágenes está vacío o es nulo', () => {
    const { container: c1 } = render(<ImageGalleryModal images={[]} onClose={jest.fn()} />)
    expect(c1).toBeEmptyDOMElement()

    const { container: c2 } = render(<ImageGalleryModal images={null} onClose={jest.fn()} />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('muestra la imagen correspondiente al initialIndex y el contador', () => {
    render(<ImageGalleryModal images={IMAGES} initialIndex={1} onClose={jest.fn()} />)

    const img = screen.getByRole('img', { name: 'Galería de inmueble' })
    expect(img).toHaveAttribute('src', IMAGES[1])
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('avanza a la siguiente imagen con el botón Siguiente y cicla al inicio', async () => {
    const user = userEvent.setup()
    render(<ImageGalleryModal images={IMAGES} initialIndex={1} onClose={jest.fn()} />)

    const nextBtn = screen.getByRole('button', { name: '❯' })
    const img = screen.getByRole('img', { name: 'Galería de inmueble' })

    // De la imagen 2 pasa a la imagen 3
    await user.click(nextBtn)
    expect(img).toHaveAttribute('src', IMAGES[2])
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    // De la imagen 3 cicla de regreso a la imagen 1
    await user.click(nextBtn)
    expect(img).toHaveAttribute('src', IMAGES[0])
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('retrocede a la imagen anterior con el botón Anterior y cicla al final', async () => {
    const user = userEvent.setup()
    render(<ImageGalleryModal images={IMAGES} initialIndex={0} onClose={jest.fn()} />)

    const prevBtn = screen.getByRole('button', { name: '❮' })
    const img = screen.getByRole('img', { name: 'Galería de inmueble' })

    // De la imagen 1 retrocede y cicla a la imagen 3 (última)
    await user.click(prevBtn)
    expect(img).toHaveAttribute('src', IMAGES[2])
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    // Retrocede a la imagen 2
    await user.click(prevBtn)
    expect(img).toHaveAttribute('src', IMAGES[1])
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('no muestra los botones de navegación anterior/siguiente si solo hay 1 imagen', () => {
    render(<ImageGalleryModal images={[IMAGES[0]]} onClose={jest.fn()} />)

    expect(screen.queryByRole('button', { name: '❮' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '❯' })).not.toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('llama a onClose al hacer clic en el botón de cerrar', async () => {
    const user = userEvent.setup()
    const handleClose = jest.fn()

    render(<ImageGalleryModal images={IMAGES} onClose={handleClose} />)

    const closeBtn = screen.getByRole('button', { name: '×' })
    await user.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('permite navegar con teclas de flecha y cerrar con Escape', () => {
    const handleClose = jest.fn()
    render(<ImageGalleryModal images={IMAGES} initialIndex={0} onClose={handleClose} />)

    const img = screen.getByRole('img', { name: 'Galería de inmueble' })

    // ArrowRight: siguiente imagen
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(img).toHaveAttribute('src', IMAGES[1])

    // ArrowLeft: imagen previa
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(img).toHaveAttribute('src', IMAGES[0])

    // Escape: cerrar modal
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
