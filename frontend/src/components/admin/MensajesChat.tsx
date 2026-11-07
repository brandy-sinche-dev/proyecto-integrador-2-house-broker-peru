import { useState, useEffect, useRef } from 'react'
import { Icon } from './icons'
import './MensajesChat.css'

export interface ChatMessage {
  id: string
  sender: 'client' | 'agent' | 'system'
  text: string
  time: string
}

export interface Conversation {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail: string
  propertyTitle: string
  propertyPrice: string
  unread: boolean
  online: boolean
  lastTime: string
  messages: ChatMessage[]
}

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    clientId: 'client-1',
    clientName: 'Carlos Pérez',
    clientPhone: '+51 987 654 321',
    clientEmail: 'carlos.perez@gmail.com',
    propertyTitle: 'Departamento amoblado en Miraflores',
    propertyPrice: '$280,000',
    unread: true,
    online: true,
    lastTime: 'Hace 5 min',
    messages: [
      {
        id: 'm1',
        sender: 'system',
        text: '🤖 Conversación transferida desde Concierge IA: El cliente solicitó contactar a un asesor para coordinar visita a este departamento.',
        time: '10:14 AM',
      },
      {
        id: 'm2',
        sender: 'client',
        text: 'Hola Yohan, vi el departamento amoblado en Miraflores a través del Concierge IA y me gustó mucho. ¿Podríamos visitarlo este sábado a las 11:00 am? Iría con mi esposa.',
        time: '10:15 AM',
      },
    ],
  },
  {
    id: 'conv-2',
    clientId: 'client-2',
    clientName: 'María Ríos',
    clientPhone: '+51 976 543 210',
    clientEmail: 'maria.rios@gmail.com',
    propertyTitle: 'Casa moderna con jardín y piscina en San Isidro',
    propertyPrice: '$650,000',
    unread: true,
    online: false,
    lastTime: 'Hace 25 min',
    messages: [
      {
        id: 'm3',
        sender: 'system',
        text: '🤖 Consulta web: Cliente interesada en opciones de negociación y financiamiento directo.',
        time: '09:38 AM',
      },
      {
        id: 'm4',
        sender: 'client',
        text: 'Buenas tardes Sr. Yohan, estuve revisando la casa en San Isidro. ¿El precio de $650,000 es negociable si el pago es al contado?',
        time: '09:40 AM',
      },
    ],
  },
  {
    id: 'conv-3',
    clientId: 'client-3',
    clientName: 'Roberto Luna',
    clientPhone: '+51 987 555 666',
    clientEmail: 'roberto.luna@empresa.pe',
    propertyTitle: 'Oficina ejecutiva corporativa en San Isidro',
    propertyPrice: '$3,200/mes',
    unread: false,
    online: true,
    lastTime: 'Ayer',
    messages: [
      {
        id: 'm5',
        sender: 'client',
        text: 'Estimado Yohan, ¿la oficina incluye los 4 estacionamientos privados en sótano?',
        time: 'Ayer 03:15 PM',
      },
      {
        id: 'm6',
        sender: 'agent',
        text: 'Hola Roberto, sí, incluye los 4 estacionamientos en sótano 2 y un depósito de 15m² con acceso directo por ascensor.',
        time: 'Ayer 03:22 PM',
      },
      {
        id: 'm7',
        sender: 'client',
        text: 'Excelente. Nos vemos el jueves a las 3:00 pm en el lobby del edificio para la visita técnica.',
        time: 'Ayer 03:30 PM',
      },
    ],
  },
  {
    id: 'conv-4',
    clientId: 'client-4',
    clientName: 'Ana Torres',
    clientPhone: '+51 954 321 098',
    clientEmail: 'ana.torres@gmail.com',
    propertyTitle: 'Terreno comercial en Surco',
    propertyPrice: '$420,000',
    unread: false,
    online: false,
    lastTime: 'Hace 2 días',
    messages: [
      {
        id: 'm8',
        sender: 'client',
        text: 'Muchas gracias por enviarme los parámetros urbanísticos del terreno en Surco.',
        time: 'Miér 11:10 AM',
      },
      {
        id: 'm9',
        sender: 'agent',
        text: 'A usted, Sra. Ana. Quedo atento si desea coordinar una visita con su arquitecto en cualquier momento.',
        time: 'Miér 11:25 AM',
      },
    ],
  },
]

const QUICK_AGENT_REPLIES = [
  '¡Hola! Con mucho gusto, el sábado a las 11:00 AM queda reservado.',
  'Le confirmo que la propiedad cuenta con documentación 100% en regla.',
  '¿Desea que le comparta el dossier digital y video tour por WhatsApp?',
  'Excelente, acabo de registrar su visita en el cronograma comercial.',
]

const STORAGE_KEY = 'hb_agent_chat_conversations'

interface MensajesChatProps {
  initialClientId?: string | null
  onNavigateTab?: (tab: string) => void
  onOpenCrmProfile?: (clientId: string) => void
  onUnreadCountChange?: (count: number) => void
}

export function MensajesChat({
  initialClientId,
  onNavigateTab,
  onOpenCrmProfile,
  onUnreadCountChange,
}: MensajesChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return INITIAL_CONVERSATIONS
  })

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (initialClientId) {
      const matched = INITIAL_CONVERSATIONS.find(
        (c) => c.clientId === initialClientId || c.clientName.toLowerCase().includes(initialClientId.toLowerCase())
      )
      if (matched) return matched.id
    }
    return INITIAL_CONVERSATIONS[0].id
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sincronizar unread count con el padre
  useEffect(() => {
    const unreadTotal = conversations.filter((c) => c.unread).length
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadTotal)
    }
  }, [conversations, onUnreadCountChange])

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch {
      // ignore
    }
  }, [conversations])

  // Escuchar mensajes entrantes del Concierge IA o storage
  useEffect(() => {
    const handleIncoming = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConversations(parsed)
          }
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('hb_agent_new_message', handleIncoming)
    window.addEventListener('storage', handleIncoming)
    return () => {
      window.removeEventListener('hb_agent_new_message', handleIncoming)
      window.removeEventListener('storage', handleIncoming)
    }
  }, [])

  // Si cambia initialClientId desde fuera
  useEffect(() => {
    if (initialClientId) {
      const matched = conversations.find(
        (c) =>
          c.clientId === initialClientId ||
          c.clientName.toLowerCase().includes(initialClientId.toLowerCase())
      )
      if (matched) {
        setActiveConvId(matched.id)
        markAsRead(matched.id)
      }
    }
  }, [initialClientId])

  const activeConv =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0]

  // Auto scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [activeConv?.messages])

  const markAsRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread: false } : c))
    )
  }

  const handleSelectConv = (id: string) => {
    setActiveConvId(id)
    markAsRead(id)
  }

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim()
    if (!text || !activeConv) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text,
      time: timeStr,
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            unread: false,
            lastTime: 'Ahora',
            messages: [...c.messages, newMsg],
          }
        }
        return c
      })
    )

    setInputText('')
  }

  // Filtrar conversaciones según búsqueda
  const filteredConvs = conversations.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.propertyTitle.toLowerCase().includes(q) ||
      c.clientPhone.includes(q)
    )
  })

  // URL WhatsApp directa para el cliente activo
  const waCleanPhone = activeConv ? activeConv.clientPhone.replace(/\D/g, '') : ''
  const waUrl = activeConv
    ? `https://api.whatsapp.com/send?phone=${waCleanPhone}&text=${encodeURIComponent(
        `Hola ${activeConv.clientName}, te saluda Yohan Nato de House Broker Perú sobre ${activeConv.propertyTitle}.`
      )}`
    : '#'

  return (
    <div className="msg-chat" role="region" aria-label="Módulo de Chat con Clientes">
      {/* ── Columna Izquierda: Lista de Conversaciones ── */}
      <aside className="msg-chat__list" aria-label="Lista de conversaciones de clientes">
        <div className="msg-chat__list-head">
          <div className="msg-chat__list-title">
            <span>Conversaciones</span>
            <span style={{ fontSize: '0.75rem', color: '#8c827a', fontWeight: 600 }}>
              {filteredConvs.length} cliente{filteredConvs.length === 1 ? '' : 's'}
            </span>
          </div>
          <input
            type="text"
            className="msg-chat__search"
            placeholder="Buscar por cliente o propiedad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar conversación"
          />
        </div>

        <div className="msg-chat__convs" role="list">
          {filteredConvs.map((conv) => {
            const isActive = conv.id === activeConv?.id
            const initials = conv.clientName
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            const lastMsg = conv.messages[conv.messages.length - 1]

            return (
              <button
                key={conv.id}
                type="button"
                className={`msg-chat__item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectConv(conv.id)}
                aria-pressed={isActive}
              >
                <div className="msg-chat__avatar">
                  {initials}
                  {conv.online && <span className="msg-chat__online-dot" title="En línea" />}
                </div>
                <div className="msg-chat__item-info">
                  <div className="msg-chat__item-top">
                    <span className="msg-chat__item-name">{conv.clientName}</span>
                    <span className="msg-chat__item-time">{conv.lastTime}</span>
                  </div>
                  <div className="msg-chat__item-prop" title={conv.propertyTitle}>
                    {conv.propertyTitle}
                  </div>
                  <div
                    className={`msg-chat__item-last ${
                      conv.unread ? 'msg-chat__item-last--unread' : ''
                    }`}
                  >
                    {lastMsg?.sender === 'agent' ? 'Tú: ' : ''}
                    {lastMsg?.text ?? 'Sin mensajes'}
                  </div>
                </div>
                {conv.unread && (
                  <span className="msg-chat__badge" aria-label="Mensaje no leído">
                    1
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Columna Derecha: Hilo de la Conversación Activa ── */}
      {activeConv ? (
        <section className="msg-chat__main" aria-label={`Chat activo con ${activeConv.clientName}`}>
          {/* Header de conversación */}
          <header className="msg-chat__header">
            <div className="msg-chat__client-meta">
              <h3>
                {activeConv.clientName}
                {activeConv.online ? (
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                    🟢 En línea
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500 }}>
                    ⚪ Desconectado
                  </span>
                )}
              </h3>
              <p>
                {activeConv.clientPhone} · {activeConv.clientEmail}
              </p>
            </div>

            <div className="msg-chat__actions">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="msg-chat__btn-wa"
                title="Abrir chat en WhatsApp"
              >
                {Icon.whatsapp} WhatsApp
              </a>

              {onNavigateTab && (
                <button
                  type="button"
                  className="msg-chat__btn-agenda"
                  onClick={() => onNavigateTab('cronograma')}
                  title="Ver en Cronograma de visitas"
                >
                  📅 Ver en Agenda
                </button>
              )}

              {onOpenCrmProfile && (
                <button
                  type="button"
                  className="msg-chat__btn-crm"
                  onClick={() => onOpenCrmProfile(activeConv.clientId)}
                  title="Abrir ficha CRM completa"
                >
                  📋 Ficha CRM
                </button>
              )}
            </div>
          </header>

          {/* Contexto del inmueble de interés */}
          <div className="msg-chat__context-bar">
            <span>📍 <strong>Inmueble de interés:</strong> {activeConv.propertyTitle} ({activeConv.propertyPrice})</span>
          </div>

          {/* Hilo de mensajes */}
          <div className="msg-chat__body" role="log" aria-live="polite">
            {activeConv.messages.map((m) => {
              if (m.sender === 'system') {
                return (
                  <div key={m.id} className="msg-chat__bubble--system">
                    {m.text}
                  </div>
                )
              }

              const isAgent = m.sender === 'agent'
              return (
                <div
                  key={m.id}
                  className={`msg-chat__bubble-wrap msg-chat__bubble-wrap--${
                    isAgent ? 'agent' : 'client'
                  }`}
                >
                  <span className="msg-chat__sender-name">
                    {isAgent ? 'Tú (Asesor House Broker)' : activeConv.clientName}
                  </span>
                  <div
                    className={`msg-chat__bubble msg-chat__bubble--${
                      isAgent ? 'agent' : 'client'
                    }`}
                  >
                    {m.text}
                    <div className="msg-chat__bubble-meta">
                      <span>{m.time}</span>
                      {isAgent && <span title="Entregado y leído">✓✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chips de respuestas predefinidas para el asesor */}
          <div className="msg-chat__chips" aria-label="Respuestas rápidas para el asesor">
            {QUICK_AGENT_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                className="msg-chat__chip"
                onClick={() => handleSendMessage(reply)}
              >
                💬 {reply}
              </button>
            ))}
          </div>

          {/* Barra de entrada de texto */}
          <form
            className="msg-chat__footer"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <input
              type="text"
              className="msg-chat__input"
              placeholder={`Escribe un mensaje para ${activeConv.clientName}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label="Escribir mensaje para el cliente"
            />
            <button
              type="submit"
              className="msg-chat__send-btn"
              disabled={!inputText.trim()}
              aria-label="Enviar respuesta al cliente"
            >
              {Icon.send} Enviar
            </button>
          </form>
        </section>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          Selecciona una conversación para comenzar a chatear.
        </div>
      )}
    </div>
  )
}
