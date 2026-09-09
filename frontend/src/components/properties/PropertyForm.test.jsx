// =============================================================
// Suite de pruebas unitarias del formulario de propiedades
// TASK-TEST-PROP-01: Jest + React Testing Library
// =============================================================

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyForm } from './PropertyForm'
import { createProperty, updateProperty } from '../../services/properties'

// Se simula (mock) el módulo de servicios para que el formulario no
// dependa de la API real ni de axios durante las pruebas.
// createProperty / updateProperty se convierten en funciones jest.fn()
// que la prueba puede controlar y sobre las que puede hacer asserts.
jest.mock('../../services/properties', () => ({
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
}))

// Fixture: propiedad de ejemplo usada para probar el modo edición.
// Reproduce la forma del contrato definido en services/types.ts
const mockProperty = {
  id: 'prop-1',
  title: 'Penthouse en San Isidro',
  price: 850000,
  address: 'Av. El Derby 123, San Isidro',
  property_type: 'DEPARTAMENTO',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

// Helper: llena los 3 campos obligatorios del primer paso interactuando
// como lo haría un usuario real (user-event dispara eventos reales).
async function fillFirstStep(user, { title, address, type }) {
  await user.type(screen.getByLabelText(/Título/), title)
  await user.type(screen.getByLabelText(/Dirección/), address)
  await user.selectOptions(screen.getByLabelText(/Tipo de propiedad/), type)
}

// Helper: recorre todo el formulario hasta el paso final (Precio),
// dejando un precio válido de 520000 como valor por defecto.
async function completeForm(user, overrides = {}) {
  await fillFirstStep(user, {
    title: 'Departamento en Miraflores',
    address: 'Av. La Paz 250, Miraflores',
    type: 'DEPARTAMENTO',
    ...overrides,
  })
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByLabelText(/Precio/), '520000')
}

describe('PropertyForm', () => {
  // Antes de cada prueba se reinician los mocks para que una prueba
  // no contamine a la siguiente, y se les asigna una respuesta resuelta.
  beforeEach(() => {
    createProperty.mockReset()
    updateProperty.mockReset()
    createProperty.mockResolvedValue({ id: 'nueva-prop', ...mockProperty })
    updateProperty.mockResolvedValue(mockProperty)
  })

  // ---------------------------------------------------------
  // Criterio 1: renderizado correcto del formulario
  // ---------------------------------------------------------
  describe('Renderizado del formulario', () => {
    it('muestra el primer paso con sus campos y botones de navegación', () => {
      // render() monta el componente en un DOM simulado (jsdom).
      // Se pasan callbacks vacíos porque en esta prueba solo interesa el render.
      render(<PropertyForm onCancel={jest.fn()} onSaved={jest.fn()} />)

      // Se verifica que el título del paso y los campos iniciales existan.
      expect(screen.getByRole('heading', { name: 'Básicos y ubicación' })).toBeInTheDocument()
      // Toggles de finalidad (Venta / Alquiler)
      expect(screen.getByText('Venta')).toBeInTheDocument()
      expect(screen.getByText('Alquiler')).toBeInTheDocument()
      // Campos obligatorios del primer paso
      expect(screen.getByLabelText(/Tipo de propiedad/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Título/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument()
      // Botones de navegación del pie del formulario
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    })

    it('marca como requeridos los campos obligatorios con asterisco', () => {
      render(<PropertyForm onCancel={jest.fn()} onSaved={jest.fn()} />)

      // Son 3 campos obligatorios (Tipo, Título, Dirección),
      // cada uno muestra el símbolo "*" junto a su etiqueta.
      expect(screen.getAllByText('*')).toHaveLength(3)
    })
  })

  // ---------------------------------------------------------
  // Criterio 2: mensajes de error ante entradas inválidas
  // ---------------------------------------------------------
  describe('Validación de campos', () => {
    it('muestra los mensajes de error al enviar el paso vacío', async () => {
      // userEvent.setup() crea un usuario virtual que interactúa
      // de forma realista (click, typing, etc.).
      const user = userEvent.setup()
      render(<PropertyForm onCancel={jest.fn()} onSaved={jest.fn()} />)

      // Pulsar "Continuar" sin llenar nada debe validar el paso.
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      // Se verifican los 3 mensajes de validación.
      expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
      expect(screen.getByText('La dirección es obligatoria.')).toBeInTheDocument()
      expect(
        screen.getByText('Selecciona un tipo de propiedad.'),
      ).toBeInTheDocument()

      // Además no se debe avanzar al siguiente paso.
      expect(screen.getByRole('heading', { name: 'Básicos y ubicación' })).toBeInTheDocument()
    })

    it('no muestra errores una vez que los campos son válidos', async () => {
      const user = userEvent.setup()
      render(<PropertyForm onCancel={jest.fn()} onSaved={jest.fn()} />)

      // Primero se provoca el error vaciando el paso.
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()

      // Se corrigen los datos y se vuelve a continuar.
      await fillFirstStep(user, {
        title: 'Casa en La Molina',
        address: 'Calle Los Álamos 120, La Molina',
        type: 'CASA',
      })
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      // queryByText devuelve null si el texto ya no existe, lo que
      // confirma que el error desapareció y se avanzó al paso 2.
      expect(screen.queryByText('El título es obligatorio.')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Datos físicos y métricas' })).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------
  // Criterio 3: simulación de eventos y submit
  // ---------------------------------------------------------
  describe('Interacción del usuario', () => {
    it('avanza y retrocede entre los pasos del formulario', async () => {
      const user = userEvent.setup()
      render(<PropertyForm onCancel={jest.fn()} onSaved={jest.fn()} />)

      // Completa el paso 1 de forma válida y avanza.
      await fillFirstStep(user, {
        title: 'Oficina en San Isidro',
        address: 'Av. Juan de Arona 151, San Isidro',
        type: 'OFICINA',
      })
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(screen.getByRole('heading', { name: 'Datos físicos y métricas' })).toBeInTheDocument()

      // Retrocede con el botón "Anterior" y se comprueba que los
      // datos escritos se conservan en el estado del formulario.
      await user.click(screen.getByRole('button', { name: 'Anterior' }))

      expect(screen.getByRole('heading', { name: 'Básicos y ubicación' })).toBeInTheDocument()
      expect(screen.getByLabelText(/Título/)).toHaveValue('Oficina en San Isidro')
    })

    it('envía el formulario completo y crea la propiedad', async () => {
      const user = userEvent.setup()
      // onSaved es el callback que App usa para volver al listado;
      // aquí verificamos que se dispare al guardar exitosamente.
      const onSaved = jest.fn()
      render(<PropertyForm onCancel={jest.fn()} onSaved={onSaved} />)

      // Llena todos los pasos y pulsa "Publicar propiedad".
      await completeForm(user)
      await user.click(screen.getByRole('button', { name: 'Publicar propiedad' }))

      // submit() es asíncrono: waitFor espera a que la promesa resuelva.
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
      // Se verifica que createProperty se llamó con el payload correcto,
      // tal como lo define el contrato (PropertyInput).
      expect(createProperty).toHaveBeenCalledWith({
        title: 'Departamento en Miraflores',
        address: 'Av. La Paz 250, Miraflores',
        price: 520000,
        property_type: 'DEPARTAMENTO',
      })
    })

    it('no envía el formulario cuando el precio es inválido', async () => {
      const user = userEvent.setup()
      const onSaved = jest.fn()
      render(<PropertyForm onCancel={jest.fn()} onSaved={onSaved} />)

      // Se llega al paso final sin escribir precio (queda vacío).
      await fillFirstStep(user, {
        title: 'Terreno en Chorrillos',
        address: 'Av. Huaylas 550, Chorrillos',
        type: 'TERRENO',
      })
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      await user.click(screen.getByRole('button', { name: 'Publicar propiedad' }))

      // La validación de precio debe bloquear el guardado:
      // ni se llama al servicio ni se dispara onSaved.
      expect(createProperty).not.toHaveBeenCalled()
      expect(onSaved).not.toHaveBeenCalled()
      // Y la prueba confirma que el usuario se queda en el campo precio.
      expect(screen.getByLabelText(/Precio/)).toBeInTheDocument()
    })

    it('edita una propiedad existente llamando a updateProperty', async () => {
      const user = userEvent.setup()
      const onSaved = jest.fn()
      // Al pasar la prop "property" el formulario entra en modo edición.
      render(
        <PropertyForm property={mockProperty} onCancel={jest.fn()} onSaved={onSaved} />,
      )

      // Verifica que los datos existentes se precargan en los campos.
      expect(screen.getByLabelText(/Título/)).toHaveValue('Penthouse en San Isidro')
      // La finalidad por defecto (VENTA) está activa.
      expect(screen.getByText('Venta')).toHaveClass('htoggle__item--active')

      // Se modifica el título como haría un usuario.
      await user.clear(screen.getByLabelText(/Título/))
      await user.type(screen.getByLabelText(/Título/), 'Penthouse Renovado')
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      // En el último paso el botón cambia a "Guardar cambios".
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // En modo edición se llama a updateProperty con el id y el payload.
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
      expect(updateProperty).toHaveBeenCalledWith('prop-1', {
        title: 'Penthouse Renovado',
        address: 'Av. El Derby 123, San Isidro',
        price: 850000,
        property_type: 'DEPARTAMENTO',
      })
    })
  })
})