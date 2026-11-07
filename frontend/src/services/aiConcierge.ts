import type { Property } from './types'

export interface RecommendedProperty {
  property: Property
  matchScore: number
  highlightReason: string
}

export interface AgentTransferInfo {
  name: string
  role: string
  phone: string
  email: string
  whatsappUrl: string
}

export interface ChatMessage {
  id: string
  sender: 'bot' | 'user'
  text: string
  recommendations?: RecommendedProperty[]
  agentTransfer?: AgentTransferInfo
  timestamp: string
}

export interface ConciergeResponse {
  reply: string
  recommendations: RecommendedProperty[]
  agentTransfer?: AgentTransferInfo
}

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()
const GEMINI_MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-3.5-flash-lite'

const DEFAULT_AGENT: AgentTransferInfo = {
  name: 'Yohan Nato',
  role: 'Asesor Inmobiliario Senior · House Broker Perú',
  phone: '+51 908 941 175',
  email: 'yohan.nato@housebroker.pe',
  whatsappUrl:
    'https://api.whatsapp.com/send?phone=51908941175&text=Hola%20Yohan,%20te%20contacto%20desde%20el%20portal%20de%20House%20Broker%20Per%C3%BA%20para%20coordinar%20asesor%C3%ADa%20personalizada.',
}

/**
 * Normaliza un texto removiendo tildes y pasando a minúsculas.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Motor heurístico de fallback cuando no hay conexión con Gemini o se agota la cuota.
 */
export function matchPropertiesLocally(
  query: string,
  properties: Property[]
): ConciergeResponse {
  const q = normalize(query)

  // Detección de solicitud de asesor humano
  if (
    q.includes('asesor') ||
    q.includes('agente') ||
    q.includes('humano') ||
    q.includes('persona') ||
    q.includes('contacto') ||
    q.includes('hablar')
  ) {
    return {
      reply:
        '¡Con gusto! Te pongo en contacto directo con Yohan Nato (+51 908 941 175), nuestro asesor inmobiliario senior asignado para que coordines tu visita de inmediato:',
      recommendations: [],
      agentTransfer: DEFAULT_AGENT,
    }
  }

  // Filtro por distritos frecuentes
  const districts = [
    'miraflores',
    'san isidro',
    'surco',
    'san borja',
    'barranco',
    'la molina',
    'magdalena',
    'jesus maria',
    'lince',
    'san miguel',
    'comas',
    'villa el salvador',
    'pucusana',
    'cieneguilla',
    'lurin',
  ]
  const matchedDistrict = districts.find((d) => q.includes(d))

  // Filtro por tipo
  let targetType: string | null = null
  if (q.includes('depa') || q.includes('departamento')) targetType = 'DEPARTAMENTO'
  else if (q.includes('casa') || q.includes('playa') || q.includes('campo')) targetType = 'CASA'
  else if (q.includes('oficina') || q.includes('corporativo')) targetType = 'OFICINA'
  else if (q.includes('terreno') || q.includes('lote') || q.includes('industrial')) targetType = 'TERRENO'

  // Filtro por dormitorios
  let targetBedrooms: number | null = null
  const bedMatch = q.match(/(\d+)\s*(dorm|hab|cuarto)/)
  if (bedMatch) {
    targetBedrooms = parseInt(bedMatch[1], 10)
  }

  // Scoring
  const scored = properties
    .filter((p) => p.is_active !== false)
    .map((p) => {
      let score = 50 // base
      const addrNorm = normalize(p.address || '')
      const titleNorm = normalize(p.title || '')

      if (matchedDistrict && (addrNorm.includes(matchedDistrict) || titleNorm.includes(matchedDistrict))) {
        score += 30
      }
      if (targetType && p.property_type === targetType) {
        score += 20
      }
      if (targetBedrooms !== null && p.dormitorios === targetBedrooms) {
        score += 15
      }
      if (p.destacado) {
        score += 5
      }

      return {
        property: p,
        score,
      }
    })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 3).filter((item) => item.score > 60)

  if (top.length === 0) {
    if (q.includes('hola') || q.includes('buenos') || q.includes('buenas')) {
      return {
        reply:
          '¡Hola! Soy tu Concierge IA de House Broker Perú. Dime en qué distrito buscas, tu presupuesto estimado o dormitorios y te mostraré las mejores opciones.',
        recommendations: [],
      }
    }

    const featured = properties.filter((p) => p.destacado && p.is_active !== false).slice(0, 2)
    return {
      reply:
        'Aquí tienes algunas de nuestras propiedades más destacadas en Lima. Si deseas afinar la búsqueda, puedes indicarme el distrito, presupuesto o tipo de propiedad.',
      recommendations: featured.map((p, idx) => ({
        property: p,
        matchScore: 95 - idx * 4,
        highlightReason: 'Propiedad exclusiva seleccionada por House Broker Perú',
      })),
    }
  }

  const recs: RecommendedProperty[] = top.map((item, idx) => ({
    property: item.property,
    matchScore: Math.min(99, 98 - idx * 3),
    highlightReason: `Excelente coincidencia en ${item.property.address || 'Lima'} para tu búsqueda.`,
  }))

  const locationHint = matchedDistrict ? ` en ${matchedDistrict.toUpperCase()}` : ''
  return {
    reply: `He seleccionado estas ${recs.length} excelentes opciones${locationHint} que se adaptan a lo que estás buscando:`,
    recommendations: recs,
  }
}

/**
 * Consulta a Gemini 3.5 Flash Lite para procesar la consulta con inteligencia conversacional
 * y devolver respuestas contextuales con propiedades coincidentes o derivación a asesor humano.
 */
export async function askConciergeAI(
  userPrompt: string,
  history: ChatMessage[],
  properties: Property[]
): Promise<ConciergeResponse> {
  if (!GEMINI_API_KEY) {
    return matchPropertiesLocally(userPrompt, properties)
  }

  try {
    const catalogContext = properties
      .filter((p) => p.is_active !== false)
      .slice(0, 25)
      .map((p) => ({
        id: p.id,
        title: p.title,
        type: p.property_type,
        mode: p.mode,
        price: `${p.moneda} ${p.price}`,
        address: p.address,
        bedrooms: p.dormitorios ?? 0,
        bathrooms: p.banos ?? 0,
        area: `${p.area_total ?? p.area_construida ?? 0}m2`,
      }))

    const systemPrompt = `Eres el Concierge IA de House Broker Perú, una boutique inmobiliaria de alto nivel en Lima, Perú.
Tu tono es educado, cordial, conciso y profesional.
Dispones de este catálogo actual de inmuebles disponibles:
${JSON.stringify(catalogContext)}

REGLAS ESTRICTAS:
1. Responde en español en tono elegante (1 a 3 oraciones).
2. Si el usuario solicita hablar con un agente, asesor humano o persona, responde presentándole con mucho gusto a nuestro asesor senior Yohan Nato e incluye "transferToAgent": true en el JSON.
3. Si el usuario busca inmuebles, analiza distrito, tipo, dormitorios o presupuesto y selecciona de 1 a 3 inmuebles del catálogo.
4. Para cada recomendación asigna un "matchScore" entre 82 y 99 y un "highlight" de una línea justificando la elección.
5. Si no hay inmuebles que coincidan exactamente, explica amablemente y sugiere la opción más cercana del catálogo.
6. Responde EXCLUSIVAMENTE con un JSON válido con este formato:
{
  "reply": "Texto de respuesta",
  "transferToAgent": false,
  "recommendations": [
    { "id": "id_del_inmueble", "matchScore": 98, "highlight": "Motivo clave" }
  ]
}`

    const recentHistory = history.slice(-4).map((h) => `${h.sender === 'user' ? 'Cliente' : 'Concierge'}: ${h.text}`).join('\n')

    const promptText = `${systemPrompt}\n\n${recentHistory ? `Historial:\n${recentHistory}\n\n` : ''}Mensaje del Cliente: ${userPrompt}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      }
    )

    if (!response.ok) {
      console.warn('Gemini API returned error status:', response.status, 'Falling back to local matching.')
      return matchPropertiesLocally(userPrompt, properties)
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      return matchPropertiesLocally(userPrompt, properties)
    }

    const parsed = JSON.parse(rawText) as {
      reply?: string
      transferToAgent?: boolean
      recommendations?: Array<{ id: string; matchScore?: number; highlight?: string }>
    }

    const mappedRecs: RecommendedProperty[] = []
    if (Array.isArray(parsed.recommendations)) {
      for (const rec of parsed.recommendations) {
        const prop = properties.find((p) => p.id === rec.id)
        if (prop) {
          mappedRecs.push({
            property: prop,
            matchScore: rec.matchScore || 95,
            highlightReason: rec.highlight || 'Propiedad seleccionada para tu búsqueda',
          })
        }
      }
    }

    const q = normalize(userPrompt)
    const isAgentRequested =
      Boolean(parsed.transferToAgent) ||
      q.includes('agente') ||
      q.includes('asesor') ||
      q.includes('humano') ||
      q.includes('persona') ||
      q.includes('contacto') ||
      q.includes('hablar') ||
      normalize(parsed.reply || '').includes('asesor') ||
      normalize(parsed.reply || '').includes('agente')

    return {
      reply: parsed.reply || 'Aquí tienes las opciones seleccionadas según tus preferencias.',
      recommendations: mappedRecs,
      agentTransfer: isAgentRequested ? DEFAULT_AGENT : undefined,
    }
  } catch (err) {
    console.error('Error invoking Gemini API:', err)
    return matchPropertiesLocally(userPrompt, properties)
  }
}
