import { useState, useEffect, useRef } from 'react'
import type { NavTarget } from './Header'
import type { Property } from '../services/types'
import { getProperties } from '../services/properties'
import mockProperties from '../services/mocks/data/properties'
import { askConciergeAI, type ChatMessage } from '../services/aiConcierge'
import './AssistantWidget.css'

interface AssistantWidgetProps {
  open: boolean
  savedCount: number
  visitsCount: number
  onToggle: () => void
  onNavigate: (target: NavTarget) => void
  onOpenProperty?: (id: string) => void
  onBookVisit?: (title: string, id?: string) => void
}

const QUICK_CHIPS = [
  '🏢 Depas en Miraflores',
  '🏡 Casas con 3 dorms',
  '💼 Oficinas en San Isidro',
  '🔑 Alquiler hasta $2,000',
  '👤 Contactar asesor',
]

export function AssistantWidget({
  open,
  savedCount,
  visitsCount,
  onToggle,
  onNavigate,
  onOpenProperty,
  onBookVisit,
}: AssistantWidgetProps) {
  const [properties, setProperties] = useState<Property[]>(mockProperties)
  const [inputText, setInputText] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mensaje de bienvenida dinámico según guardados / visitas
  const welcomeContext =
    savedCount > 0 || visitsCount > 0
      ? `Veo que guardaste ${savedCount} inmueble${savedCount === 1 ? '' : 's'} y agendaste ${visitsCount} visita${visitsCount === 1 ? '' : 's'}. ¿Quieres que coordine algo más?`
      : 'Dime zona, presupuesto y número de dormitorios, y te armo una selección al instante.'

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '¡Hola! Soy tu Concierge IA de House Broker Perú.',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'welcome-2',
      sender: 'bot',
      text: welcomeContext,
      timestamp: new Date().toISOString(),
    },
  ])

  // Carga propiedades reales si están disponibles
  useEffect(() => {
    let mounted = true
    getProperties()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setProperties(data)
        }
      })
      .catch(() => {
        // Usa mockProperties de fallback
      })
    return () => {
      mounted = false
    }
  }, [])

  // Auto scroll al final de la conversación
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [messages, isThinking, open])

  // Actualizar mensaje de bienvenida si cambian savedCount o visitsCount
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome-2'
          ? {
              ...m,
              text:
                savedCount > 0 || visitsCount > 0
                  ? `Veo que guardaste ${savedCount} inmueble${savedCount === 1 ? '' : 's'} y agendaste ${visitsCount} visita${visitsCount === 1 ? '' : 's'}. ¿Quieres que coordine algo más?`
                  : 'Dime zona, presupuesto y número de dormitorios, y te armo una selección al instante.',
            }
          : m
      )
    )
  }, [savedCount, visitsCount])

  const handleSendMessage = async (rawQuery: string) => {
    const query = rawQuery.trim()
    if (!query || isThinking) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsThinking(true)

    try {
      const response = await askConciergeAI(query, [...messages, userMsg], properties)

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.reply,
        recommendations: response.recommendations,
        agentTransfer: response.agentTransfer,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Disculpa, tuve un inconveniente al procesar tu solicitud. Por favor intenta nuevamente o déjanos un mensaje directo.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const teaser =
    savedCount > 0 || visitsCount > 0
      ? `Tienes ${savedCount} guardado${savedCount === 1 ? '' : 's'} y ${visitsCount} visita${visitsCount === 1 ? '' : 's'} agendada${visitsCount === 1 ? '' : 's'}.`
      : 'Cuéntame qué buscas y te propongo opciones.'

  return (
    <div className="hai">
      {open && (
        <section className="hai__panel" role="dialog" aria-label="Concierge IA">
          <header className="hai__panel-head">
            <span className="hai__dot" aria-hidden="true" />
            <div className="hai__panel-title-wrap">
              <span className="hai__panel-title">
                Concierge IA
                <span className="hai__model-tag">Gemini IA</span>
              </span>
              <span className="hai__panel-subtitle">Asistente Inmobiliario VIP</span>
            </div>
            <button
              type="button"
              className="hai__close"
              onClick={onToggle}
              aria-label="Cerrar Concierge IA"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="m2 2 8 8M10 2l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="hai__messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`hai__bubble-row hai__bubble-row--${m.sender}`}
              >
                <p className={`hai__bubble hai__bubble--${m.sender}`}>{m.text}</p>

                {m.agentTransfer && (
                  <div className="hai__agent-card">
                    <div className="hai__agent-head">
                      <div className="hai__agent-avatar" aria-hidden="true">👨‍💼</div>
                      <div className="hai__agent-meta">
                        <span className="hai__agent-status">🟢 Asesor en línea ahora</span>
                        <strong className="hai__agent-name">{m.agentTransfer.name}</strong>
                        <span className="hai__agent-role">{m.agentTransfer.role}</span>
                      </div>
                    </div>
                    <p className="hai__agent-hint">
                      Puedes coordinar tu visita directamente con tu asesor por WhatsApp o llamando:
                    </p>
                    <div className="hai__agent-actions">
                      <a
                        href={m.agentTransfer.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hai__agent-btn-wa"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.99.59 3.92 1.71 5.56L2 22l4.67-1.78c1.58 1.02 3.44 1.57 5.37 1.57h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 2.99 14.69 2 12.04 2z" />
                        </svg>
                        Chatear por WhatsApp
                      </a>
                      <a
                        href={'tel:' + m.agentTransfer.phone.replace(/\s+/g, '')}
                        className="hai__agent-btn-call"
                      >
                        📞 Llamar
                      </a>
                    </div>
                  </div>
                )}

                {m.recommendations && m.recommendations.length > 0 && (
                  <div className="hai__recs-container">
                    {m.recommendations.map((rec) => {
                      const imgUrl =
                        rec.property.images?.[0]?.url || '/properties/demo/depa1.jpg'
                      const priceFormatted = `${
                        rec.property.moneda === 'USD' ? '$' : 'S/'
                      } ${rec.property.price.toLocaleString('en-US')}`

                      return (
                        <article key={rec.property.id} className="hai__rec-card">
                          <div className="hai__rec-thumb-wrap">
                            <img
                              src={imgUrl}
                              alt={rec.property.title}
                              className="hai__rec-thumb"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src =
                                  '/properties/demo/depa1.jpg'
                              }}
                            />
                            <span className="hai__match-badge">
                              ✨ {rec.matchScore}% MATCH AI
                            </span>
                          </div>
                          <div className="hai__rec-body">
                            <span className="hai__rec-price">{priceFormatted}</span>
                            <strong className="hai__rec-title" title={rec.property.title}>
                              {rec.property.title}
                            </strong>
                            <div className="hai__rec-specs">
                              <span>📍 {rec.property.address || 'Lima'}</span>
                              <span>•</span>
                              <span>🛏️ {rec.property.dormitorios ?? '-'} dorms</span>
                            </div>
                            {rec.highlightReason && (
                              <div className="hai__rec-highlight">
                                💡 {rec.highlightReason}
                              </div>
                            )}
                            <div className="hai__rec-actions">
                              <button
                                type="button"
                                className="hai__rec-btn-detail"
                                onClick={() => {
                                  if (onOpenProperty) {
                                    onOpenProperty(rec.property.id)
                                  } else {
                                    onNavigate('propiedades')
                                  }
                                }}
                              >
                                Ver inmueble
                              </button>
                              <button
                                type="button"
                                className="hai__rec-btn-visit"
                                onClick={() => {
                                  if (onBookVisit) {
                                    onBookVisit(rec.property.title, rec.property.id)
                                  } else {
                                    onNavigate('visitas')
                                  }
                                }}
                              >
                                Agendar visita
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="hai__thinking" aria-live="polite">
                <div className="hai__dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Concierge IA analizando propiedades...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="hai__chips" aria-label="Consultas sugeridas">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="hai__chip"
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            className="hai__input-bar"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage(inputText)
            }}
          >
            <input
              type="text"
              className="hai__input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe qué buscas (ej: depa en Miraflores)..."
              disabled={isThinking}
              aria-label="Mensaje para el Concierge IA"
            />
            <button
              type="submit"
              className="hai__send-btn"
              disabled={!inputText.trim() || isThinking}
              aria-label="Enviar mensaje"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.289Z" />
              </svg>
            </button>
          </form>

          <div className="hai__quick">
            <button type="button" onClick={() => onNavigate('guardados')}>
              Ver guardados
            </button>
            <button type="button" onClick={() => onNavigate('visitas')}>
              Mis visitas
            </button>
          </div>
        </section>
      )}

      <div className="hai__dock">
        <div className="hai__card">
          <span className="hai__title">
            <span className="hai__dot" aria-hidden="true" />
            Concierge IA
          </span>
          <span className="hai__msg">{teaser}</span>
        </div>
        <button
          type="button"
          className="hai__btn"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Abrir Concierge IA"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M3 3h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8.5L4.8 17v-3H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
