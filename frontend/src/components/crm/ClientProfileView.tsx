import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listAgentAppointments } from '../../services/appointments'
import { getErrorMessage } from '../../services/axios'
import type { Appointment, AppointmentStatus } from '../../services/types'
import './ClientProfileView.css'

const QUERY_KEY = ['agent-client-appointments'] as const

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  RESCHEDULED: 'Reprogramada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

type ActivityFilter = 'ALL' | 'APPOINTMENTS' | 'CONSULTATIONS' | 'INTERACTIONS'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value))

const queryForAgent = (userId?: string) => ({
  queryKey: [...QUERY_KEY, userId],
  queryFn: listAgentAppointments,
  enabled: Boolean(userId),
})

function LoadingState() {
  return (
    <div className="client-profile__skeletons" role="status" aria-label="Cargando ficha del cliente">
      <span className="client-profile__skeleton client-profile__skeleton--title" />
      <span className="client-profile__skeleton" />
      <span className="client-profile__skeleton" />
      <span className="client-profile__skeleton client-profile__skeleton--wide" />
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  const status = error && typeof error === 'object' && 'status' in error
    ? error.status
    : undefined
  const message = status === 403
    ? 'No tienes permiso para consultar las citas asignadas a esta cuenta.'
    : getErrorMessage(error, 'No se pudo cargar la información del cliente.')

  return (
    <p className="client-profile__alert" role="alert">
      {message}
    </p>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="client-profile__empty">{children}</p>
}

export function ActivityTimeline({ appointments }: { appointments: Appointment[] }) {
  const [filter, setFilter] = useState<ActivityFilter>('ALL')
  const activities = filter === 'ALL' || filter === 'APPOINTMENTS' ? appointments : []
  const filterOptions: Array<{ value: ActivityFilter; label: string }> = [
    { value: 'ALL', label: 'Todas' },
    { value: 'APPOINTMENTS', label: 'Citas' },
    { value: 'CONSULTATIONS', label: 'Consultas' },
    { value: 'INTERACTIONS', label: 'Interacciones' },
  ]

  return (
    <section className="client-profile__section" aria-labelledby="client-activity-title">
      <div className="client-profile__section-heading">
        <div>
          <h2 id="client-activity-title">Historial de actividades</h2>
          <p>Actividad registrada por las citas asignadas a tu cuenta.</p>
        </div>
        <div className="client-profile__filters" role="group" aria-label="Filtrar actividades">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activities.length ? (
        <ol className="client-profile__timeline">
          {activities
            .slice()
            .sort((left, right) => right.created_at.localeCompare(left.created_at))
            .map((appointment) => (
              <li key={appointment.id}>
                <span className="client-profile__timeline-dot" aria-hidden="true" />
                <div>
                  <h3>Cita · {STATUS_LABELS[appointment.status]}</h3>
                  <p>{appointment.property.title}</p>
                  <time dateTime={appointment.created_at}>{formatDate(appointment.created_at)}</time>
                  <p className="client-profile__secondary">
                    Visita programada: {formatDate(appointment.scheduled_at)}
                  </p>
                </div>
              </li>
            ))}
        </ol>
      ) : filter === 'CONSULTATIONS' || filter === 'INTERACTIONS' ? (
        <EmptyState>
          La API no ofrece registros de {filter === 'CONSULTATIONS' ? 'consultas' : 'interacciones'} para clientes.
        </EmptyState>
      ) : (
        <EmptyState>No hay citas registradas para este cliente.</EmptyState>
      )}
    </section>
  )
}

export function ClientDirectory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const appointmentsQuery = useQuery(queryForAgent(user?.id))

  if (appointmentsQuery.isPending) return <LoadingState />
  if (appointmentsQuery.isError) return <ErrorState error={appointmentsQuery.error} />

  const clients = new Map<string, { appointment: Appointment; count: number }>()
  appointmentsQuery.data.forEach((appointment) => {
    const client = clients.get(appointment.client.id)
    if (client) {
      client.count += 1
      if (appointment.created_at > client.appointment.created_at) client.appointment = appointment
    } else {
      clients.set(appointment.client.id, { appointment, count: 1 })
    }
  })

  const entries = Array.from(clients.entries()).sort(([, left], [, right]) =>
    right.appointment.created_at.localeCompare(left.appointment.created_at),
  )

  return (
    <section className="client-profile" aria-labelledby="client-directory-title">
      <header className="client-profile__header">
        <h1 id="client-directory-title">Clientes con citas asignadas</h1>
        <p>Solo se muestran clientes presentes en citas que la API autoriza para tu cuenta.</p>
      </header>
      {entries.length ? (
        <ul className="client-profile__directory">
          {entries.map(([id, entry]) => (
            <li key={id}>
              <div>
                <h2>{entry.appointment.client.full_name}</h2>
                <p>{entry.appointment.client.email ?? 'Correo no disponible'}</p>
                <p>{entry.appointment.client.phone ?? 'Teléfono no disponible'}</p>
              </div>
              <span>{entry.count} {entry.count === 1 ? 'cita' : 'citas'}</span>
              <button
                type="button"
                aria-label={`Abrir ficha CRM de ${entry.appointment.client.full_name}`}
                onClick={() => navigate(`/agente/clientes/${encodeURIComponent(id)}`)}
              >
                Abrir ficha CRM
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No hay clientes en las citas asignadas a tu cuenta.</EmptyState>
      )}
    </section>
  )
}

export function ClientProfileView({ clientId }: { clientId: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const appointmentsQuery = useQuery(queryForAgent(user?.id))

  if (appointmentsQuery.isPending) return <LoadingState />
  if (appointmentsQuery.isError) return <ErrorState error={appointmentsQuery.error} />

  const appointments = appointmentsQuery.data.filter(({ client }) => client.id === clientId)
  const client = appointments[0]?.client
  const properties = new Map(
    appointments.map(({ property }) => [property.id, property]),
  )

  if (!client) {
    return (
      <section className="client-profile" aria-labelledby="client-not-found-title">
        <button className="client-profile__back" type="button" onClick={() => navigate('/agente/clientes')}>
          Volver a clientes
        </button>
        <h1 id="client-not-found-title">Cliente no disponible</h1>
        <p className="client-profile__empty">
          No se encontró este cliente entre las citas que la API autoriza para tu cuenta.
        </p>
      </section>
    )
  }

  return (
    <main className="client-profile">
      <button className="client-profile__back" type="button" onClick={() => navigate('/agente/clientes')}>
        Volver a clientes
      </button>
      <header className="client-profile__header">
        <h1>{client.full_name}</h1>
        <p>Ficha basada únicamente en la información disponible en las citas asignadas.</p>
      </header>

      <section className="client-profile__section" aria-labelledby="client-contact-title">
        <h2 id="client-contact-title">Información de contacto</h2>
        <dl className="client-profile__contact">
          <div><dt>Correo</dt><dd>{client.email ?? 'No disponible en la API de citas'}</dd></div>
          <div><dt>Teléfono</dt><dd>{client.phone ?? 'No disponible en la API de citas'}</dd></div>
        </dl>
      </section>

      <section className="client-profile__section" aria-labelledby="client-preferences-title">
        <h2 id="client-preferences-title">Preferencias de búsqueda</h2>
        <EmptyState>La API no proporciona preferencias de búsqueda para los clientes.</EmptyState>
      </section>

      <ActivityTimeline appointments={appointments} />

      <section className="client-profile__section" aria-labelledby="client-properties-title">
        <h2 id="client-properties-title">Propiedades asociadas a sus citas</h2>
        {properties.size ? (
          <ul className="client-profile__properties">
            {Array.from(properties.values()).map((property) => (
              <li key={property.id}>
                <h3>{property.title}</h3>
                <p>{property.district ? `${property.district} · ` : ''}{property.address}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No hay propiedades asociadas a las citas de este cliente.</EmptyState>
        )}
      </section>

      <section className="client-profile__section" aria-labelledby="client-notes-title">
        <h2 id="client-notes-title">Seguimiento comercial</h2>
        <EmptyState>
          La API no permite consultar ni registrar notas de seguimiento o contraofertas.
        </EmptyState>
      </section>
    </main>
  )
}
