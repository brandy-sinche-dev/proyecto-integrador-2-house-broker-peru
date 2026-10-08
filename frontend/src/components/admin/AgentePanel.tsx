import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
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

const CLIENTES_MOCK = [
  { id: 'CL001', nombre: 'Carlos Pérez', telefono: '+51 987 654 321', email: 'cperez@gmail.com', interes: 'Miraflores', presupuesto: '$250K–$300K', estado: 'Activo' },
  { id: 'CL002', nombre: 'María Ríos',   telefono: '+51 976 543 210', email: 'mrios@gmail.com',  interes: 'San Isidro', presupuesto: '$600K+',      estado: 'Activo' },
  { id: 'CL003', nombre: 'José Mamani',  telefono: '+51 965 432 109', email: 'jmamani@gmail.com',interes: 'Barranco',   presupuesto: '$180K–$200K', estado: 'Seguimiento' },
  { id: 'CL004', nombre: 'Ana Torres',   telefono: '+51 954 321 098', email: 'atorres@gmail.com',interes: 'Surco',       presupuesto: '$400K–$450K', estado: 'Frío' },
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
const SCLI: Record<string, { color: string; bg: string }> = {
  Activo:      { color: '#166534', bg: '#dcfce7' },
  Seguimiento: { color: '#854d0e', bg: '#fef9c3' },
  Frío:        { color: '#6b7280', bg: '#f3f4f6' },
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

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: C.bronze, color: C.cream }}>{children}</th>
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td style={{ padding: '0.8rem 1rem', fontSize: '0.87rem', fontWeight: bold ? 700 : 400, color: bold ? C.bronze : '#374151', verticalAlign: 'middle' }}>{children}</td>
}

// ── Secciones ──────────────────────────────────────────────────────────────
function Dashboard() {
  const hoy = CITAS_MOCK.filter(c => c.fecha === 'Hoy')
  const confirmadas = CITAS_MOCK.filter(c => c.estado === 'CONFIRMED').length
  const pendientes  = CITAS_MOCK.filter(c => c.estado === 'PENDING').length

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub: string }) => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${C.gold}` }}>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '1.9rem', fontWeight: 800, color: C.bronze }}>{value}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>{sub}</p>
    </div>
  )

  return (
    <div>
      <SectionTitle iconEl={Icon.dashboard}>Dashboard de Actividad</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Citas hoy"        value={hoy.length}             sub={`${confirmadas} confirmadas`} />
        <StatCard label="Pendientes"        value={pendientes}             sub="requieren acción" />
        <StatCard label="Mis propiedades"   value={PROPIEDADES_MOCK.length} sub={`${PROPIEDADES_MOCK.filter(p => p.estado === 'DISPONIBLE').length} disponibles`} />
        <StatCard label="Clientes activos"  value={CLIENTES_MOCK.filter(c => c.estado === 'Activo').length} sub={`de ${CLIENTES_MOCK.length} en cartera`} />
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
  const [vista, setVista] = useState<'Día'|'Semana'|'Mes'>('Semana')
  const [estados, setEstados] = useState<Record<string, string>>(Object.fromEntries(CITAS_MOCK.map(c => [c.id, c.estado])))
  const LABELS: Record<string, string> = { CONFIRMED: 'Confirmada', PENDING: 'Pendiente', CANCELLED: 'Cancelada', COMPLETED: 'Completada' }
  const acciones: Record<string, { label: string; next: string; danger?: boolean }[]> = {
    PENDING:   [{ label: 'Confirmar', next: 'CONFIRMED' }, { label: 'Cancelar', next: 'CANCELLED', danger: true }],
    CONFIRMED: [{ label: 'Completada', next: 'COMPLETED' }, { label: 'Cancelar', next: 'CANCELLED', danger: true }],
    CANCELLED: [], COMPLETED: [],
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, color: C.bronze, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {Icon.calendar} Mi Cronograma — Citas
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['Día', 'Semana', 'Mes'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: vista === v ? C.bronze : '#e5e7eb', color: vista === v ? 'white' : '#374151', fontWeight: vista === v ? 700 : 400, fontSize: '0.82rem' }}>{v}</button>
          ))}
        </div>
      </div>

      {CITAS_MOCK.map(c => (
        <Card key={c.id}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: C.bg, borderRadius: '8px', padding: '0.4rem 0.75rem', textAlign: 'center', minWidth: '72px' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b7280' }}>{c.fecha}</p>
                <p style={{ margin: 0, fontWeight: 700, color: C.bronze, fontSize: '0.85rem' }}>{c.hora}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{c.propiedad}</p>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>{c.cliente} · {c.telefono}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Badge text={LABELS[estados[c.id]] ?? estados[c.id]} s={SCITA[estados[c.id]] ?? { color: '#000', bg: '#eee' }} />
              {(acciones[estados[c.id]] ?? []).map(a => (
                <button key={a.label}
                  onClick={() => setEstados(p => ({ ...p, [c.id]: a.next }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', borderRadius: '6px', border: `1px solid ${a.danger ? '#ef4444' : C.bronze}`, background: 'white', color: a.danger ? '#ef4444' : C.bronze, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                  {a.danger ? Icon.x : Icon.check} {a.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
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

function Clientes() {
  return (
    <div>
      <SectionTitle iconEl={Icon.clients}>Interés de Clientes</SectionTitle>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Cliente', 'Contacto', 'Zona de Interés', 'Presupuesto', 'Estado'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {CLIENTES_MOCK.map((cl, i) => (
                <tr key={cl.id} style={{ background: i % 2 === 0 ? 'white' : '#faf9f7' }}>
                  <Td bold>{cl.nombre}</Td>
                  <Td>
                    <div>{cl.telefono}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{cl.email}</div>
                  </Td>
                  <Td>{cl.interes}</Td>
                  <Td bold>{cl.presupuesto}</Td>
                  <Td><Badge text={cl.estado} s={SCLI[cl.estado] ?? { color: '#000', bg: '#eee' }} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Menú ───────────────────────────────────────────────────────────────────
const MENU = [
  { id: 'dashboard',   label: 'Dashboard',       iconEl: Icon.dashboard,  comp: Dashboard        },
  { id: 'cronograma',  label: 'Cronograma',       iconEl: Icon.calendar,   comp: Cronograma       },
  { id: 'propiedades', label: 'Mis Propiedades',  iconEl: Icon.properties, comp: MisPropiedades   },
  { id: 'clientes',    label: 'Clientes',         iconEl: Icon.clients,    comp: Clientes         },
]

// ── Panel ──────────────────────────────────────────────────────────────────
export function AgentePanel() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const Active = MENU.find(m => m.id === activeTab)?.comp ?? Dashboard

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
            const active = activeTab === item.id
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                width: '100%', textAlign: 'left', padding: '0.8rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: active ? C.gold : 'transparent', border: 'none',
                color: active ? C.bronze : 'rgba(251,249,248,0.75)',
                cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: '0.875rem',
                borderLeft: active ? `4px solid ${C.bronze}` : '4px solid transparent',
                transition: 'all 0.15s',
              }}>
                {item.iconEl}{item.label}
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
        <div style={{ flex: 1 }}><Active /></div>
        <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem' }}>
          © {new Date().getFullYear()} House Broker Perú &nbsp;·&nbsp; Panel de Agente
        </footer>
      </main>
    </div>
  )
}
