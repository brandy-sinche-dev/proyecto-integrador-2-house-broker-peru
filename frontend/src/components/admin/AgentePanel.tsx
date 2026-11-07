import { useState, useEffect } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppointmentListTable } from '../crm/AppointmentListTable'
import { ClientDirectory, ClientProfileView } from '../crm/ClientProfileView'
import { MensajesChat, INITIAL_CONVERSATIONS } from './MensajesChat'
import { Icon } from './icons'

const C = {
  bronze: 'var(--brand-bronze-deep, #562B05)',
  gold:   'var(--brand-gold, #cfa861)',
  cream:  'var(--brand-cream, #fbf9f8)',
  bg:     '#f5f3ef',
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const CITAS_MOCK = [
  { id: 'C001', hora: '10:00 AM', propiedad: 'Dept. Miraflores – Av. Pardo 320', cliente: 'Carlos Pérez',  telefono: '+51 987 654 321', estado: 'CONFIRMED',   fecha: 'Hoy' },
  { id: 'C002', hora: '12:30 PM', propiedad: 'Casa San Isidro – Golf Los Incas', cliente: 'María Ríos',    telefono: '+51 976 543 210', estado: 'PENDING',     fecha: 'Hoy' },
  { id: 'C003', hora: '03:00 PM', propiedad: 'Flat Barranco – Jr. Unión 15',     cliente: 'José Mamani',   telefono: '+51 965 432 109', estado: 'CONFIRMED',   fecha: 'Mañana' },
  { id: 'C004', hora: '11:00 AM', propiedad: 'Pent. Surco – Av. El Polo',        cliente: 'Ana Torres',    telefono: '+51 954 321 098', estado: 'CANCELLED',   fecha: 'Hoy' },
]

const PROPIEDADES_MOCK = [
  { id: 'P001', nombre: 'Dept. Miraflores – Av. Pardo 320', estado: 'DISPONIBLE', citas: 3, precio: '$280,000' },
  { id: 'P002', nombre: 'Casa San Isidro – Golf Los Incas', estado: 'RESERVADO',  citas: 1, precio: '$650,000' },
  { id: 'P003', nombre: 'Flat Barranco – Jr. Unión 15',     estado: 'DISPONIBLE', citas: 2, precio: '$195,000' },
  { id: 'P004', nombre: 'Pent. Surco – Av. El Polo',        estado: 'SUSPENDIDO', citas: 0, precio: '$420,000' },
]

// ── Estado badges ──────────────────────────────────────────────────────────
const SCITA: Record<string, { color: string; bg: string }> = {
  CONFIRMED:   { color: '#166534', bg: '#dcfce7' },
  PENDING:     { color: '#854d0e', bg: '#fef9c3' },
  CANCELLED:   { color: '#991b1b', bg: '#fee2e2' },
  COMPLETED:   { color: '#1e3a5f', bg: '#dbeafe' },
}
const SPROP: Record<string, { color: string; bg: string }> = {
  DISPONIBLE: { color: '#166534', bg: '#dcfce7' },
  RESERVADO:  { color: '#854d0e', bg: '#fef9c3' },
  VENDIDO:    { color: '#6b21a8', bg: '#f3e8ff' },
  SUSPENDIDO: { color: '#991b1b', bg: '#fee2e2' },
}

// ── Micro-componentes ──────────────────────────────────────────────────────
function Badge({ text, s }: { text: string; s: { color: string; bg: string } }) {
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{text}</span>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' }}>{children}</div>
}

function SectionTitle({ iconEl, children }: { iconEl: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 1.5rem', color: C.bronze, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
      {iconEl}{children}
    </h2>
  )
}

// ── Secciones ──────────────────────────────────────────────────────────────
function Dashboard({
  unreadCount = 2,
  onGoToChat,
}: {
  unreadCount?: number
  onGoToChat?: () => void
}) {
  const hoy = CITAS_MOCK.filter(c => c.fecha === 'Hoy')
  const confirmadas = CITAS_MOCK.filter(c => c.estado === 'CONFIRMED').length
  const pendientes  = CITAS_MOCK.filter(c => c.estado === 'PENDING').length
  const clientesConCitas = new Set(CITAS_MOCK.map(c => c.cliente)).size

  const StatCard = ({
    label,
    value,
    sub,
    highlight = false,
    onClick,
  }: {
    label: string
    value: string | number
    sub: string
    highlight?: boolean
    onClick?: () => void
  }) => (
    <div
      onClick={onClick}
      style={{
        background: highlight ? '#fffbeb' : 'white',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${highlight ? '#f59e0b' : C.gold}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.72rem', color: highlight ? '#92400e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '1.9rem', fontWeight: 800, color: highlight ? '#b45309' : C.bronze }}>{value}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: highlight ? '#d97706' : '#9ca3af' }}>{sub}</p>
    </div>
  )

  return (
    <div>
      <SectionTitle iconEl={Icon.dashboard}>Dashboard de Actividad</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Citas hoy"          value={hoy.length}             sub={`${confirmadas} confirmadas`} />
        <StatCard label="Pendientes"          value={pendientes}             sub="requieren acción" />
        <StatCard
          label="Mensajes / Chat"
          value={unreadCount}
          sub={unreadCount > 0 ? 'nuevos por responder' : 'al día'}
          highlight={unreadCount > 0}
          onClick={onGoToChat}
        />
        <StatCard label="Mis propiedades"     value={PROPIEDADES_MOCK.length} sub={`${PROPIEDADES_MOCK.filter(p => p.estado === 'DISPONIBLE').length} disponibles`} />
        <StatCard label="Clientes con citas"  value={clientesConCitas} sub="según la agenda mostrada" />
      </div>

      <Card>
        <p style={{ margin: '0 0 1rem', fontWeight: 700, color: C.bronze, fontSize: '0.9rem' }}>Citas de Hoy</p>
        {hoy.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 0', borderBottom: '1px solid #f5f3ef' }}>
            <div style={{ background: C.bg, borderRadius: '8px', padding: '0.4rem 0.7rem', fontWeight: 700, fontSize: '0.8rem', color: C.bronze, minWidth: '80px', textAlign: 'center' }}>
              {c.hora}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{c.propiedad}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{c.cliente} · {c.telefono}</p>
            </div>
            <Badge text={c.estado} s={SCITA[c.estado] ?? { color: '#000', bg: '#eee' }} />
          </div>
        ))}
      </Card>
    </div>
  )
}

function Cronograma() {
  return <AppointmentListTable />
}

function MisPropiedades() {
  const [estadosProp, setEstadosProp] = useState<Record<string, string>>(Object.fromEntries(PROPIEDADES_MOCK.map(p => [p.id, p.estado])))
  const opts = ['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'SUSPENDIDO']

  return (
    <div>
      <SectionTitle iconEl={Icon.properties}>Mis Propiedades</SectionTitle>
      {PROPIEDADES_MOCK.map(p => (
        <Card key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>{p.precio} · {p.citas} cita(s)</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Badge text={estadosProp[p.id]} s={SPROP[estadosProp[p.id]] ?? { color: '#000', bg: '#eee' }} />
              <select value={estadosProp[p.id]} onChange={e => setEstadosProp(prev => ({ ...prev, [p.id]: e.target.value }))}
                style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: `1px solid ${C.gold}`, color: C.bronze, fontSize: '0.8rem', cursor: 'pointer', background: 'white' }}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── Menú ───────────────────────────────────────────────────────────────────
const MENU = [
  { id: 'dashboard',   label: 'Dashboard',       iconEl: Icon.dashboard },
  { id: 'cronograma',  label: 'Cronograma',       iconEl: Icon.calendar },
  { id: 'propiedades', label: 'Mis Propiedades',  iconEl: Icon.properties },
  { id: 'clientes',    label: 'Clientes',         iconEl: Icon.clients },
  { id: 'mensajes',    label: 'Mensajes / Chat',  iconEl: Icon.chat },
]

// ── Panel ──────────────────────────────────────────────────────────────────
export function AgentePanel() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const clientProfileMatch = useMatch('/agente/clientes/:clientId')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedChatClient, setSelectedChatClient] = useState<string | null>(null)

  // Calcular número de mensajes no leídos
  const [unreadChatCount, setUnreadChatCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('hb_agent_chat_conversations')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter((c: any) => c.unread).length
      }
    } catch {
      // ignore
    }
    return INITIAL_CONVERSATIONS.filter((c) => c.unread).length
  })

  // Sincronizar unread count con eventos de chat
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('hb_agent_chat_conversations')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setUnreadChatCount(parsed.filter((c: any) => c.unread).length)
          }
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('hb_agent_new_message', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('hb_agent_new_message', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const selectedTab = clientProfileMatch ? 'clientes' : activeTab

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: '232px', background: C.bronze, color: C.cream, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '2rem 1.5rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: C.gold, color: C.bronze, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            {Icon.user}
          </div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{user?.full_name ?? 'Agente'}</p>
          <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Agente Inmobiliario</p>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {MENU.map(item => {
            const active = selectedTab === item.id
            const isChat = item.id === 'mensajes'
            return (
              <button key={item.id} onClick={() => {
                setActiveTab(item.id)
                if (item.id === 'clientes') navigate('/agente/clientes')
                else if (clientProfileMatch) navigate('/agente')
              }} style={{
                width: '100%', textAlign: 'left', padding: '0.8rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: active ? C.gold : 'transparent', border: 'none',
                color: active ? C.bronze : 'rgba(251,249,248,0.75)',
                cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: '0.875rem',
                borderLeft: active ? `4px solid ${C.bronze}` : '4px solid transparent',
                transition: 'all 0.15s',
              }}>
                {item.iconEl}
                <span style={{ flex: 1 }}>{item.label}</span>
                {isChat && unreadChatCount > 0 && (
                  <span
                    aria-label={`${unreadChatCount} mensajes no leídos`}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      lineHeight: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                  >
                    {unreadChatCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <button onClick={signOut} style={{
          margin: '0 1rem 1.5rem', padding: '0.65rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600
        }}>
          {Icon.logout} Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Banner de alerta de mensajes nuevos */}
        {unreadChatCount > 0 && selectedTab !== 'mensajes' && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderLeft: '5px solid #f59e0b',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  flexShrink: 0,
                }}
              >
                {Icon.chat}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '0.92rem' }}>
                  💬 Tienes {unreadChatCount} {unreadChatCount === 1 ? 'nuevo mensaje' : 'nuevos mensajes'} de clientes esperando respuesta
                </p>
                <p style={{ margin: '3px 0 0', color: '#b45309', fontSize: '0.8rem' }}>
                  Carlos Pérez y María Ríos enviaron consultas sobre inmuebles a través del Concierge IA.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('mensajes')
                if (clientProfileMatch) navigate('/agente')
              }}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'background 0.15s ease',
              }}
            >
              Atender en Chat ({unreadChatCount})
            </button>
          </div>
        )}

        <div style={{ flex: 1 }}>
          {clientProfileMatch ? (
            <ClientProfileView clientId={clientProfileMatch.params.clientId ?? ''} />
          ) : selectedTab === 'dashboard' ? (
            <Dashboard
              unreadCount={unreadChatCount}
              onGoToChat={() => setActiveTab('mensajes')}
            />
          ) : selectedTab === 'cronograma' ? (
            <Cronograma />
          ) : selectedTab === 'propiedades' ? (
            <MisPropiedades />
          ) : selectedTab === 'clientes' ? (
            <ClientDirectory
              onSelectChat={(clientName) => {
                setSelectedChatClient(clientName)
                setActiveTab('mensajes')
              }}
            />
          ) : selectedTab === 'mensajes' ? (
            <div>
              <SectionTitle iconEl={Icon.chat}>Centro de Mensajes y Coordinación con Clientes</SectionTitle>
              <MensajesChat
                initialClientId={selectedChatClient}
                onNavigateTab={(tab) => {
                  setActiveTab(tab)
                  if (clientProfileMatch) navigate('/agente')
                }}
                onOpenCrmProfile={(id) => navigate(`/agente/clientes/${encodeURIComponent(id)}`)}
                onUnreadCountChange={(count) => setUnreadChatCount(count)}
              />
            </div>
          ) : (
            <Dashboard
              unreadCount={unreadChatCount}
              onGoToChat={() => setActiveTab('mensajes')}
            />
          )}
        </div>
        <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem' }}>
          © {new Date().getFullYear()} House Broker Perú &nbsp;·&nbsp; Panel de Agente
        </footer>
      </main>
    </div>
  )
}
