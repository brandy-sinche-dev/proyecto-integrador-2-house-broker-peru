// =============================================================
// Pruebas unitarias del servicio aiConcierge (Motor IA y Fallback)
// HouseBroker Perú
// =============================================================

import { matchPropertiesLocally, askConciergeAI } from './aiConcierge'

const mockCatalog = [
  {
    id: 'prop-1',
    title: 'Penthouse de lujo frente al mar en Miraflores',
    price: 350000,
    moneda: 'USD',
    mode: 'VENTA',
    address: 'Malecón de la Reserva, Miraflores',
    property_type: 'DEPARTAMENTO',
    dormitorios: 3,
    banos: 3,
    area_total: 180,
    is_active: true,
    destacado: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prop-2',
    title: 'Casa moderna con jardín y piscina en San Isidro',
    price: 680000,
    moneda: 'USD',
    mode: 'VENTA',
    address: 'Av. Pezet, San Isidro',
    property_type: 'CASA',
    dormitorios: 4,
    banos: 4,
    area_total: 320,
    is_active: true,
    destacado: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prop-3',
    title: 'Oficina ejecutiva corporativa en San Isidro',
    price: 2400,
    moneda: 'USD',
    mode: 'ALQUILER',
    address: 'Av. Las Begonias, San Isidro',
    property_type: 'OFICINA',
    dormitorios: 0,
    banos: 2,
    area_total: 120,
    is_active: true,
    destacado: false,
    created_at: new Date().toISOString(),
  },
]

describe('Servicio aiConcierge', () => {
  describe('matchPropertiesLocally (Motor de Fallback Heurístico)', () => {
    it('filtra y asigna alto matchScore para consultas de departamentos en Miraflores', () => {
      const res = matchPropertiesLocally('busco depa en miraflores con 3 dormitorios', mockCatalog)

      expect(res.reply).toMatch(/miraflores/i)
      expect(res.recommendations.length).toBeGreaterThan(0)
      expect(res.recommendations[0].property.id).toBe('prop-1')
      expect(res.recommendations[0].matchScore).toBeGreaterThanOrEqual(90)
    })

    it('recomienda casas en San Isidro cuando se solicita ese criterio', () => {
      const res = matchPropertiesLocally('casa en San Isidro', mockCatalog)

      expect(res.recommendations.some((r) => r.property.id === 'prop-2')).toBe(true)
    })

    it('responde cortésmente ante saludos sin forzar recomendaciones irrelevantes', () => {
      const res = matchPropertiesLocally('¡Hola, buenos días!', mockCatalog)

      expect(res.reply).toMatch(/Concierge IA/i)
      expect(res.recommendations).toHaveLength(0)
    })

    it('brinda información de contacto directo cuando se menciona asesor o agente humano', () => {
      const res = matchPropertiesLocally('quiero hablar con un asesor humano', mockCatalog)

      expect(res.reply).toMatch(/\+51 908 941 175/i)
      expect(res.recommendations).toHaveLength(0)
    })
  })

  describe('askConciergeAI (Orquestador Principal con Gemini)', () => {
    it('procesa solicitudes y retorna respuesta estructurada', async () => {
      const res = await askConciergeAI('oficina en san isidro', [], mockCatalog)

      expect(res.reply).toBeDefined()
      expect(Array.isArray(res.recommendations)).toBe(true)
    })
  })
})
