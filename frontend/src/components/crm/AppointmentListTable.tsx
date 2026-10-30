import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../services/axios'
import { listAppointments, updateAppointmentStatus } from '../../services/appointments'
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
  type AppointmentStatusInput,
  type PaginatedAppointments,
} from '../../services/types'
import './AppointmentListTable.css'

const APPOINTMENTS_QUERY_KEY = ['appointments'] as const
const PAGE_SIZE = 10

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  RESCHEDULED: 'Reprogramada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

const actionsFor = (status: AppointmentStatus): Array<Exclude<AppointmentStatus, 'PENDING'>> => {
  switch (status) {
    case 'PENDING':
      return ['CONFIRMED', 'CANCELLED']
    case 'CONFIRMED':
      return ['COMPLETED', 'NO_SHOW', 'CANCELLED']
    case 'RESCHEDULED':
      return ['CONFIRMED', 'CANCELLED']
    default:
      return []
  }
}

const formatScheduledAt = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value))

interface StatusChangeVariables extends AppointmentStatusInput {
  id: string
}

interface MutationContext {
  previous: Array<[readonly unknown[], PaginatedAppointments | undefined]>
}

export function AppointmentListTable() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null)
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [toast, setToast] = useState('')

  const appointmentsQuery = useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, { status: statusFilter || undefined, page, limit: PAGE_SIZE }],
    queryFn: () => listAppointments({
      page,
      limit: PAGE_SIZE,
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
  })

  const updateStatus = useMutation<
    Awaited<ReturnType<typeof updateAppointmentStatus>>,
    Error,
    StatusChangeVariables,
    MutationContext
  >({
    mutationFn: ({ id, ...input }) => updateAppointmentStatus(id, input),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: APPOINTMENTS_QUERY_KEY })
      const previous = queryClient.getQueriesData<PaginatedAppointments>({
        queryKey: APPOINTMENTS_QUERY_KEY,
      })
      queryClient.setQueriesData<PaginatedAppointments>(
        { queryKey: APPOINTMENTS_QUERY_KEY },
        (current) => current && ({
          ...current,
          results: current.results.map((appointment) =>
            appointment.id === id ? { ...appointment, status } : appointment,
          ),
        }),
      )
      return { previous }
    },
    onError: (error, variables, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data))
      const message = getErrorMessage(error, 'No se pudo actualizar la cita.')
      if (variables.status === 'CANCELLED') setCancelError(message)
      else setErrorMessage(message)
    },
    onSuccess: (_result, { status }) => {
      setErrorMessage('')
      setCancelError('')
      setCancelAppointment(null)
      setReason('')
      setPage(1)
      setToast(`Cita actualizada: ${STATUS_LABELS[status]}.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY }),
  })

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const count = appointmentsQuery.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const changeStatus = (appointment: Appointment, status: Exclude<AppointmentStatus, 'PENDING'>) => {
    setErrorMessage('')
    if (status === 'CANCELLED') {
      setCancelAppointment(appointment)
      setReason('')
      setCancelError('')
      return
    }
    updateStatus.mutate({ id: appointment.id, status })
  }

  const confirmCancellation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cancelAppointment || reason.trim().length < 5 || updateStatus.isPending) return
    updateStatus.mutate({ id: cancelAppointment.id, status: 'CANCELLED', reason: reason.trim() })
  }

  return (
    <section className="appointment-list" aria-labelledby="appointment-list-title" aria-busy={appointmentsQuery.isFetching}>
      <header className="appointment-list__header">
        <div>
          <h2 id="appointment-list-title">Gestión de Citas</h2>
          <p>Consulta y actualiza las solicitudes de visita.</p>
        </div>
        <label className="appointment-list__filter">
          <span>Estado</span>
          <select
            aria-label="Filtrar citas por estado"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as AppointmentStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
      </header>

      {errorMessage && <p className="appointment-list__error" role="alert">{errorMessage}</p>}
      {appointmentsQuery.isPending && <p className="appointment-list__message" role="status">Cargando citas…</p>}
      {appointmentsQuery.isError && !errorMessage && (
        <p className="appointment-list__error" role="alert">
          {getErrorMessage(appointmentsQuery.error, 'No se pudieron cargar las citas.')}
        </p>
      )}

      {appointmentsQuery.data && (
        <>
          <div className="appointment-list__table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Propiedad</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Agente</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointmentsQuery.data.results.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{formatScheduledAt(appointment.scheduled_at)}</td>
                    <td>
                      <strong>{appointment.property.title}</strong>
                      <span className="appointment-list__secondary">{appointment.property.address}</span>
                    </td>
                    <td>{appointment.client.full_name}</td>
                    <td>{appointment.agent.full_name}</td>
                    <td>
                      <span className={`appointment-list__status appointment-list__status--${appointment.status.toLowerCase()}`}>
                        {STATUS_LABELS[appointment.status]}
                      </span>
                    </td>
                    <td>
                      <div className="appointment-list__actions">
                        {actionsFor(appointment.status).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={status === 'CANCELLED' ? 'appointment-list__action appointment-list__action--danger' : 'appointment-list__action'}
                            disabled={updateStatus.isPending}
                            onClick={() => changeStatus(appointment, status)}
                          >
                            {status === 'CONFIRMED'
                              ? 'Confirmar'
                              : status === 'CANCELLED'
                                ? 'Cancelar'
                                : STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {appointmentsQuery.data.results.length === 0 && (
                  <tr><td className="appointment-list__empty" colSpan={6}>No hay citas para este filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="appointment-list__pagination" aria-label="Paginación de citas">
            <span aria-live="polite">{count} cita(s) · Página {page} de {pageCount}</span>
            <div>
              <button type="button" disabled={page <= 1 || appointmentsQuery.isFetching} onClick={() => setPage((value) => value - 1)}>
                Anterior
              </button>
              <button type="button" disabled={page >= pageCount || appointmentsQuery.isFetching} onClick={() => setPage((value) => value + 1)}>
                Siguiente
              </button>
            </div>
          </footer>
        </>
      )}

      {cancelAppointment && (
        <div className="appointment-list__overlay">
          <section
            className="appointment-list__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-cancel-title"
          >
            <h3 id="appointment-cancel-title">¿Cancelar esta cita?</h3>
            <p>{cancelAppointment.property.title} · {cancelAppointment.client.full_name}</p>
            <form onSubmit={confirmCancellation}>
              <label htmlFor="appointment-cancel-reason">Motivo de cancelación</label>
              <textarea
                id="appointment-cancel-reason"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setCancelError('')
                }}
                autoFocus
              />
              {cancelError && <p className="appointment-list__error" role="alert">{cancelError}</p>}
              <div className="appointment-list__dialog-actions">
                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => {
                    setCancelAppointment(null)
                    setCancelError('')
                  }}
                >
                  Volver
                </button>
                <button type="submit" disabled={reason.trim().length < 5 || updateStatus.isPending}>
                  {updateStatus.isPending ? 'Cancelando…' : 'Confirmar cancelación'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="appointment-list__toast" role="status" aria-live="polite" aria-label="Notificación">
          {toast}
          <button type="button" aria-label="Cerrar notificación" onClick={() => setToast('')}>×</button>
        </div>
      )}
    </section>
  )
}