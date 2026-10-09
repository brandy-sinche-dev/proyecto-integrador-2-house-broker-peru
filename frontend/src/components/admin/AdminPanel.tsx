import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Icon } from './icons'

// ── Paleta de marca ────────────────────────────────────────────────────────
const C = {
  bronze: 'var(--brand-bronze-deep, #562B05)',
  gold:   'var(--brand-gold, #cfa861)',
  cream:  'var(--brand-cream, #fbf9f8)',
  bg:     '#f5f3ef',
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const KPIs = {
  agentesActivos: 8, totalAgentes: 12, clientesTotal: 245,
  citasPendientes: 14, citasMes: 87, propiedades: 34,
  propDisponibles: 22, visualizaciones: 1250, ingresosMes: '$48,500',
}

const AGENTES_MOCK = [
  { id: 'A001', nombre: 'Lucía Vargas',  email: 'lvargas@hb.pe',  sede: 'Miraflores', citas: 12, estado: 'Activo',     comision: '2.5%' },
  { id: 'A002', nombre: 'Rodrigo Soto',  email: 'rsoto@hb.pe',    sede: 'San Isidro', citas: 8,  estado: 'Activo',     comision: '3.0%' },
  { id: 'A003', nombre: 'Paola Quispe',  email: 'pquispe@hb.pe',  sede: 'Surco',      citas: 5,  estado: 'Activo',     comision: '2.5%' },
  { id: 'A004', nombre: 'Carlos Medina', email: 'cmedina@hb.pe',  sede: 'Barranco',   citas: 0,  estado: 'Suspendido', comision: '2.0%' },
]

const PROPIEDADES_MOCK = [
  { id: 'PROP-001', titulo: 'Dept. Miraflores – Av. Pardo 320',   agente: 'Lucía Vargas',  precio: '$280,000', estado: 'DISPONIBLE', tipo: 'DEPARTAMENTO', visitas: 34 },
  { id: 'PROP-002', titulo: 'Casa San Isidro – Golf Los Incas',    agente: 'Rodrigo Soto',  precio: '$650,000', estado: 'RESERVADO',  tipo: 'CASA',         visitas: 12 },
  { id: 'PROP-003', titulo: 'Flat Barranco – Jr. Unión 15',        agente: 'Paola Quispe',  precio: '$195,000', estado: 'DISPONIBLE', tipo: 'DEPARTAMENTO', visitas: 21 },
  { id: 'PROP-004', titulo: 'Pent. Surco – Av. El Polo',           agente: 'Lucía Vargas',  precio: '$420,000', estado: 'SUSPENDIDO', tipo: 'DEPARTAMENTO', visitas: 5  },
  { id: 'PROP-005', titulo: 'Terreno La Molina – Km 14',           agente: 'Rodrigo Soto',  precio: '$320,000', estado: 'VENDIDO',    tipo: 'TERRENO',      visitas: 8  },
]

const CITAS_MOCK = [
  { id: 'C001', propiedad: 'Dept. Miraflores',  cliente: 'Carlos Pérez',  agente: 'Lucía Vargas',  fecha: 'Hoy 10:00',    estado: 'CONFIRMED',   origen: 'CLIENT_WEB' },
  { id: 'C002', propiedad: 'Casa San Isidro',   cliente: 'María Ríos',    agente: 'Rodrigo Soto',  fecha: 'Hoy 12:30',    estado: 'PENDING',     origen: 'AI_CHAT' },
  { id: 'C003', propiedad: 'Flat Barranco',     cliente: 'José Mamani',   agente: 'Paola Quispe',  fecha: 'Mañana 15:00', estado: 'CONFIRMED',   origen: 'AGENT' },
  { id: 'C004', propiedad: 'Pent. Surco',       cliente: 'Ana Torres',    agente: 'Lucía Vargas',  fecha: 'Hoy 11:00',    estado: 'CANCELLED',   origen: 'CLIENT_WEB' },
  { id: 'C005', propiedad: 'Terreno La Molina', cliente: 'Roberto Luna',  agente: 'Rodrigo Soto',  fecha: 'Ayer 09:00',   estado: 'COMPLETED',   origen: 'AGENT' },
]

const CLIENTES_MOCK = [
  { id: 'CL001', nombre: 'Carlos Pérez',  email: 'cperez@gmail.com',  zona: 'Miraflores', presupuesto: '–', interes: 5, visitas: 3, estado: 'Activo' },
  { id: 'CL002', nombre: 'María Ríos',    email: 'mrios@gmail.com',   zona: 'San Isidro', presupuesto: '+',      interes: 4, visitas: 1, estado: 'Activo' },
  { id: 'CL003', nombre: 'José Mamani',   email: 'jmamani@gmail.com', zona: 'Barranco',   presupuesto: '–', interes: 3, visitas: 2, estado: 'Seguimiento' },
  { id: 'CL004', nombre: 'Ana Torres',    email: 'atorres@gmail.com', zona: 'Surco',       presupuesto: '–', interes: 2, visitas: 1, estado: 'Frío' },
  { id: 'CL005', nombre: 'Roberto Luna',  email: 'rluna@gmail.com',   zona: 'La Molina',  presupuesto: '–', interes: 4, visitas: 2, estado: 'Activo' },
  { id: 'CL006', nombre: 'Lucía Méndez',  email: 'lmendez@gmail.com', zona: 'San Borja',  presupuesto: '–', interes: 5, visitas: 4, estado: 'Activo' },
  { id: 'CL007', nombre: 'Eduardo Ruiz',  email: 'eruiz@gmail.com',   zona: 'Chancay',    presupuesto: '–', interes: 3, visitas: 0, estado: 'Nuevo' },
  { id: 'CL008', nombre: 'Sofía Vargas',  email: 'svargas@gmail.com', zona: 'Miraflores', presupuesto: '–', interes: 4, visitas: 1, estado: 'Activo' },
  { id: 'CL009', nombre: 'Pedro Castillo',email: 'pcastillo@gmail.com',zona: 'Lima Centro',presupuesto: '–', interes: 2, visitas: 1, estado: 'Frío' },
  { id: 'CL010', nombre: 'Carmen Rosa',   email: 'crosa@gmail.com',   zona: 'Surquillo',  presupuesto: '–', interes: 5, visitas: 2, estado: 'Activo' },
]

// ── Estilos de estado ──────────────────────────────────────────────────────
const SCITA: Record<string, { color: string; bg: string }> = {
  CONFIRMED:   { color: '#166534', bg: '#dcfce7' },
  PENDING:     { color: '#854d0e', bg: '#fef9c3' },
  CANCELLED:   { color: '#991b1b', bg: '#fee2e2' },
  COMPLETED:   { color: '#1e3a5f', bg: '#dbeafe' },
  RESCHEDULED: { color: '#6b21a8', bg: '#f3e8ff' },
  NO_SHOW:     { color: '#374151', bg: '#f3f4f6' },
}
const SPROP: Record<string, { color: string; bg: string }> = {
  DISPONIBLE: { color: '#166534', bg: '#dcfce7' },
  RESERVADO:  { color: '#854d0e', bg: '#fef9c3' },
  VENDIDO:    { color: '#6b21a8', bg: '#f3e8ff' },
  ALQUILADO:  { color: '#1e3a5f', bg: '#dbeafe' },
  SUSPENDIDO: { color: '#991b1b', bg: '#fee2e2' },
}
const SUSER: Record<string, { color: string; bg: string }> = {
  Activo:     { color: '#166534', bg: '#dcfce7' },
  Suspendido: { color: '#991b1b', bg: '#fee2e2' },
}
const SCLI: Record<string, { color: string; bg: string }> = {
  Activo:      { color: '#166534', bg: '#dcfce7' },
  Seguimiento: { color: '#854d0e', bg: '#fef9c3' },
  Frío:        { color: '#6b7280', bg: '#f3f4f6' },
}

// ── Micro-componentes ──────────────────────────────────────────────────────
function Badge({ text, s }: { text: string; s: { color: string; bg: string } }) {
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function KPICard({ label, value, sub, iconEl, accent = false }: {
  label: string; value: string | number; sub?: string; iconEl: React.ReactNode; accent?: boolean
}) {
  const textMain  = accent ? C.gold   : C.bronze
  const textSub   = accent ? '#d1b87a': '#9ca3af'
  const textLabel = accent ? C.gold   : '#6b7280'
  return (
    <div style={{ background: accent ? C.bronze : 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${C.gold}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: textLabel, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.9rem', fontWeight: 800, color: textMain }}>{value}</p>
          {sub && <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: textSub }}>{sub}</p>}
        </div>
        <div style={{ color: accent ? C.gold : C.bronze, opacity: 0.7 }}>{iconEl}</div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 1.5rem', color: C.bronze, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
      {children}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' }}>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: C.bronze, color: C.cream, whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td style={{ padding: '0.8rem 1rem', fontSize: '0.87rem', fontWeight: bold ? 700 : 400, color: bold ? C.bronze : '#374151', verticalAlign: 'middle' }}>{children}</td>
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: 'flex', gap: '1px' }}>
      {Array.from({ length: 5 }, (_, i) =>
        <span key={i}>{Icon.star_filled(i < n ? '#f59e0b' : '#e5e7eb')}</span>
      )}
    </span>
  )
}

// ── Secciones ──────────────────────────────────────────────────────────────
function Dashboard() {
  const citasHoy = CITAS_MOCK.filter(c => c.fecha.startsWith('Hoy'))
  return (
    <div>
      <SectionTitle>{Icon.dashboard} Dashboard — Resumen General</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KPICard label="Agentes Activos"      value={`${KPIs.agentesActivos}/${KPIs.totalAgentes}`} sub="operando"              iconEl={Icon.agents}     />
        <KPICard label="Clientes Registrados" value={KPIs.clientesTotal}     sub="en plataforma"          iconEl={Icon.clients}    />
        <KPICard label="Citas este mes"       value={KPIs.citasMes}          sub={`${KPIs.citasPendientes} pendientes`} iconEl={Icon.calendar} />
        <KPICard label="Propiedades"          value={KPIs.propiedades}       sub={`${KPIs.propDisponibles} disponibles`} iconEl={Icon.properties} />
        <KPICard label="Visualizaciones"      value={KPIs.visualizaciones}   sub="este mes"               iconEl={Icon.eye}        />
        <KPICard label="Ingresos del Mes"     value={KPIs.ingresosMes}       sub="comisiones brutas"       iconEl={Icon.money}   accent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <Card>
          <p style={{ margin: '0 0 1rem', fontWeight: 700, color: C.bronze, fontSize: '0.9rem' }}>Citas de Hoy</p>
          {citasHoy.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid #f5f3ef' }}>
              <div style={{ background: C.bg, borderRadius: '6px', padding: '0.35rem 0.6rem', fontWeight: 700, fontSize: '0.78rem', color: C.bronze, minWidth: '64px', textAlign: 'center' }}>
                {c.fecha.replace('Hoy ', '')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.propiedad}</p>
                <p style={{ margin: '1px 0 0', fontSize: '0.77rem', color: '#6b7280' }}>{c.cliente}</p>
              </div>
              <Badge text={c.estado} s={SCITA[c.estado] ?? { color: '#000', bg: '#eee' }} />
            </div>
          ))}
        </Card>

        <Card>
          <p style={{ margin: '0 0 1rem', fontWeight: 700, color: C.bronze, fontSize: '0.9rem' }}>Rendimiento de Agentes</p>
          {[...AGENTES_MOCK].sort((a, b) => b.citas - a.citas).map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #f5f3ef' }}>
              <span style={{ fontWeight: 800, color: i === 0 ? '#b45309' : '#d1d5db', minWidth: '20px', fontSize: '0.85rem' }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.86rem' }}>{a.nombre}</p>
                <p style={{ margin: '1px 0 0', fontSize: '0.77rem', color: '#6b7280' }}>{a.sede}</p>
              </div>
              <span style={{ fontWeight: 700, color: C.bronze, fontSize: '0.86rem' }}>{a.citas} citas</span>
              <Badge text={a.estado} s={SUSER[a.estado] ?? { color: '#000', bg: '#eee' }} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function GestionAgentes() {
  const [agentes, setAgentes] = useState(AGENTES_MOCK)
  const toggle = (id: string) => setAgentes(p => p.map(a => a.id === id ? { ...a, estado: a.estado === 'Activo' ? 'Suspendido' : 'Activo' } : a))

  return (
    <div>
      <SectionTitle>{Icon.agents} Gestión de Agentes</SectionTitle>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Nombre', 'Email', 'Sede', 'Citas', 'Comisión', 'Estado', 'Acción'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {agentes.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? 'white' : '#faf9f7' }}>
                  <Td><code style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{a.id}</code></Td>
                  <Td bold>{a.nombre}</Td>
                  <Td>{a.email}</Td>
                  <Td>{a.sede}</Td>
                  <Td bold>{a.citas}</Td>
                  <Td>{a.comision}</Td>
                  <Td><Badge text={a.estado} s={SUSER[a.estado] ?? { color: '#000', bg: '#eee' }} /></Td>
                  <Td>
                    <button onClick={() => toggle(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.65rem', borderRadius: '6px', border: `1px solid ${a.estado === 'Activo' ? '#ef4444' : '#166534'}`, background: 'white', color: a.estado === 'Activo' ? '#ef4444' : '#166534', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                      {a.estado === 'Activo' ? Icon.x : Icon.check}
                      {a.estado === 'Activo' ? 'Suspender' : 'Activar'}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function GestionPropiedades() {
  const opts = ['DISPONIBLE', 'RESERVADO', 'ALQUILADO', 'VENDIDO', 'SUSPENDIDO']
  const [props, setProps] = useState(PROPIEDADES_MOCK)
  const cambiar = (id: string, v: string) => setProps(p => p.map(x => x.id === id ? { ...x, estado: v } : x))

  return (
    <div>
      <SectionTitle>{Icon.properties} Gestión de Propiedades</SectionTitle>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Propiedad', 'Tipo', 'Agente', 'Precio', 'Visitas', 'Estado', 'Cambiar'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {props.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#faf9f7' }}>
                  <Td><code style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.id}</code></Td>
                  <Td bold>{p.titulo}</Td>
                  <Td>{p.tipo}</Td>
                  <Td>{p.agente}</Td>
                  <Td bold>{p.precio}</Td>
                  <Td>{p.visitas}</Td>
                  <Td><Badge text={p.estado} s={SPROP[p.estado] ?? { color: '#000', bg: '#eee' }} /></Td>
                  <Td>
                    <select value={p.estado} onChange={e => cambiar(p.id, e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: `1px solid ${C.gold}`, color: C.bronze, fontSize: '0.8rem', cursor: 'pointer', background: 'white' }}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function GestionCitas() {
  const [citas, setCitas] = useState(CITAS_MOCK)
  const LABELS: Record<string, string> = { CONFIRMED: 'Confirmada', PENDING: 'Pendiente', CANCELLED: 'Cancelada', COMPLETED: 'Completada', RESCHEDULED: 'Reprogramada', NO_SHOW: 'No asistió' }
  const acciones: Record<string, { label: string; next: string; danger?: boolean }[]> = {
    PENDING:   [{ label: 'Confirmar', next: 'CONFIRMED' }, { label: 'Cancelar', next: 'CANCELLED', danger: true }],
    CONFIRMED: [{ label: 'Completada', next: 'COMPLETED' }, { label: 'Cancelar', next: 'CANCELLED', danger: true }],
    CANCELLED: [], COMPLETED: [], NO_SHOW: [], RESCHEDULED: [],
  }
  return (
    <div>
      <SectionTitle>{Icon.calendar} Gestión de Citas</SectionTitle>
      {citas.map(c => (
        <Card key={c.id}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Badge text={LABELS[c.estado] ?? c.estado} s={SCITA[c.estado] ?? { color: '#000', bg: '#eee' }} />
                <span style={{ fontSize: '0.72rem', color: '#d1d5db', fontFamily: 'monospace' }}>{c.id}</span>
                <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>{c.origen}</span>
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{c.propiedad}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                Cliente: {c.cliente} &nbsp;·&nbsp; Agente: {c.agente} &nbsp;·&nbsp; {c.fecha}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(acciones[c.estado] ?? []).map(a => (
                <button key={a.label}
                  onClick={() => setCitas(p => p.map(x => x.id === c.id ? { ...x, estado: a.next } : x))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.85rem', borderRadius: '6px', border: `1px solid ${a.danger ? '#ef4444' : C.bronze}`, background: 'white', color: a.danger ? '#ef4444' : C.bronze, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
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

function GestionClientes() {
  const [clientes, setClientes] = useState(CLIENTES_MOCK)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const startEdit = (cl: any) => {
    setEditingId(cl.id)
    setEditForm({ ...cl })
  }

  const saveEdit = () => {
    setClientes(prev => prev.map(c => c.id === editingId ? editForm : c))
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const deleteClient = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este cliente?')) {
      setClientes(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <div>
      <SectionTitle>{Icon.clients} Cartera de Clientes</SectionTitle>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Cliente', 'Email', 'Zona', 'Presupuesto', 'Interés', 'Visitas', 'Estado', 'Acciones'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {clientes.map((cl, i) => {
                const isEditing = editingId === cl.id
                return (
                  <tr key={cl.id} style={{ background: i % 2 === 0 ? 'white' : '#faf9f7' }}>
                    <Td bold>
                      {isEditing ? (
                        <input value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : cl.nombre}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : cl.email}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input value={editForm.zona} onChange={e => setEditForm({ ...editForm, zona: e.target.value })} style={{ width: '100px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : cl.zona}
                    </Td>
                    <Td bold>
                      {isEditing ? (
                        <input value={editForm.presupuesto} onChange={e => setEditForm({ ...editForm, presupuesto: e.target.value })} style={{ width: '100px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : cl.presupuesto}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input type="number" min="1" max="5" value={editForm.interes} onChange={e => setEditForm({ ...editForm, interes: Number(e.target.value) })} style={{ width: '50px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : <Stars n={cl.interes} />}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input type="number" min="0" value={editForm.visitas} onChange={e => setEditForm({ ...editForm, visitas: Number(e.target.value) })} style={{ width: '50px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                      ) : cl.visitas}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <select value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} style={{ padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                          <option value="Activo">Activo</option>
                          <option value="Seguimiento">Seguimiento</option>
                          <option value="Frío">Frío</option>
                        </select>
                      ) : (
                        <Badge text={cl.estado} s={SCLI[cl.estado] ?? { color: '#000', bg: '#eee' }} />
                      )}
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} style={{ background: '#166534', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Guardar</button>
                            <button onClick={cancelEdit} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(cl)} style={{ background: C.bronze, color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Editar</button>
                            <button onClick={() => deleteClient(cl.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Eliminar</button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AjustesAdmin({ adminProfile, setAdminProfile }: { adminProfile: any, setAdminProfile: any }) {
  const [form, setForm] = useState(adminProfile)
  const [success, setSuccess] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminProfile(form)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (e) => setForm({ ...form, avatarUrl: e.target?.result })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <SectionTitle>{Icon.settings} Ajustes de Administrador</SectionTitle>
      <Card>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: C.gold, color: C.bronze, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              )}
            </div>
            <div>
              <label style={{ display: 'inline-block', background: C.bg, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: C.bronze, border: `1px solid ${C.gold}` }}>
                Cambiar foto
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>JPG, GIF o PNG. Max 2MB.</p>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>Nombre completo</label>
            <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>Correo electrónico</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>Teléfono</label>
            <input type="text" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }} />
          </div>

          <button type="submit" style={{ padding: '0.75rem', background: C.bronze, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
            Guardar cambios
          </button>
          
          {success && <p style={{ color: '#166534', background: '#dcfce7', padding: '0.75rem', borderRadius: '6px', margin: 0, fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>¡Cambios guardados correctamente!</p>}
        </form>
      </Card>
    </div>
  )
}

// ── Menú ───────────────────────────────────────────────────────────────────
const MENU = [
  { id: 'dashboard',   label: 'Dashboard',       iconEl: Icon.dashboard,   comp: Dashboard         },
  { id: 'agentes',     label: 'Agentes',          iconEl: Icon.agents,      comp: GestionAgentes    },
  { id: 'propiedades', label: 'Propiedades',      iconEl: Icon.properties,  comp: GestionPropiedades},
  { id: 'citas',       label: 'Citas / CRM',      iconEl: Icon.calendar,    comp: GestionCitas      },
  { id: 'clientes',    label: 'Clientes',         iconEl: Icon.clients,     comp: GestionClientes   },
  { id: 'ajustes',     label: 'Ajustes',          iconEl: Icon.settings,    comp: AjustesAdmin      },
]

import './Panel.css'

// ── Panel ──────────────────────────────────────────────────────────────────
export function AdminPanel() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Perfil mock para poder editarlo visualmente
  const [adminProfile, setAdminProfile] = useState({
    nombre: user?.full_name ?? 'Administrador Principal',
    email: user?.email ?? 'admin@housebroker.pe',
    telefono: '+51 987 654 321',
    avatarUrl: ''
  })

  const Active = MENU.find(m => m.id === activeTab)?.comp ?? Dashboard

  return (
    <div className="panel-container">
      
      {/* Mobile Header */}
      <div className="panel-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="House Broker" style={{ height: '32px' }} />
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: C.gold }}>Panel Admin</span>
        </div>
        <button className="panel-hamburger" onClick={() => setSidebarOpen(true)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      <div className={`panel-overlay ${sidebarOpen ? 'is-open' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`panel-sidebar ${sidebarOpen ? 'is-open' : ''}`}>

        {/* Logo + perfil */}
        <div style={{ padding: '2rem 1.5rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          {/* Close button for mobile inside sidebar */}
          <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }} className="hdr__hamburger">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: C.gold, color: C.bronze, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', overflow: 'hidden' }}>
            {adminProfile.avatarUrl ? (
              <img src={adminProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              Icon.user
            )}
          </div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{adminProfile.nombre}</p>
          <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Administrador</p>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {MENU.map(item => {
            const active = activeTab === item.id
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} style={{
                width: '100%', textAlign: 'left', padding: '0.8rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: active ? C.gold : 'transparent',
                border: 'none',
                color: active ? C.bronze : 'rgba(251,249,248,0.75)',
                cursor: 'pointer', fontWeight: active ? 700 : 400,
                fontSize: '0.875rem',
                borderLeft: active ? `4px solid ${C.bronze}` : '4px solid transparent',
                transition: 'all 0.15s',
              }}>
                {item.iconEl}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
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
      <main className="panel-main">
        <div style={{ flex: 1 }}>
          <Active adminProfile={adminProfile} setAdminProfile={setAdminProfile} />
        </div>
        <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem' }}>
          © {new Date().getFullYear()} House Broker Perú &nbsp;·&nbsp; Panel de Administración
        </footer>
      </main>
    </div>
  )
}
