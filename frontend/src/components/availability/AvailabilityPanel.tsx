import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../Button'
import { getErrorMessage } from '../../services/axios'
import { getProperty } from '../../services/properties'
import { getPropertySchedules } from '../../services/availability'
import {
  accessDeniedReason,
  canManageAvailability,
  readSessionUser,
  type SessionUser,
} from '../../services/session'
import { PROPERTY_STATUS_LABELS, type Property, type PropertySchedules } from '../../services/types'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { ScheduleManager } from './ScheduleManager'
import './AvailabilityPanel.css'

type PanelStatus = 'loading' | 'ready' | 'error'

interface AvailabilityPanelProps {
  propertyId: string
  /** Permite inyectar la sesión en pruebas y en vistas que ya la tengan. */
  user?: SessionUser | null
}

function Denied({ reason, name }: { reason: string; name?: string }) {
  return (
    <div className="havail__denied" role="alert">
      <span className="havail__denied-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="havail__denied-title">No puedes gestionar este inmueble</p>
      <p className="havail__denied-sub">{reason}</p>
      {name && <p className="havail__denied-sub">Inmueble: {name}.</p>}
      <div className="havail__denied-actions">
        <Link to="/">
          <Button type="button" variant="neutral">
            Volver al catálogo
          </Button>
        </Link>
      </div>
    </div>
  )
}

/**
 * Panel de disponibilidad del agente (RF-PROP-04): estado operativo del
 * inmueble y agenda semanal de visitas.
 *
 * Antes de montar los controles comprueba en cliente que quien navega tiene
 * autoridad sobre el inmueble. Si no la tiene, muestra el motivo y no llega a
 * renderizar un solo botón de edición. Es una comprobación de interfaz, no una
 * frontera de seguridad: el backend vuelve a validar en cada `PATCH`/`PUT`.
 */
export function AvailabilityPanel({ propertyId, user }: AvailabilityPanelProps) {
  const [status, setStatus] = useState<PanelStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [schedules, setSchedules] = useState<PropertySchedules | null>(null)
  const [currentStatus, setCurrentStatus] = useState<Property['status']>(undefined)

  // La sesión se resuelve en el inicializador y no en un efecto a propósito:
  // leerla después de montar haría que el panel llegara a pintar un instante
  // el aviso de "sin permiso" antes de conocer al usuario de la sesión.
  const [sessionUser] = useState<SessionUser | null>(() =>
    user !== undefined ? user : readSessionUser(),
  )

  const fetchAvailability = useCallback(() => {
    Promise.all([getProperty(propertyId), getPropertySchedules(propertyId)])
      .then(([loadedProperty, loadedSchedules]) => {
        setProperty(loadedProperty)
        setCurrentStatus(loadedProperty.status)
        setSchedules(loadedSchedules)
        setStatus('ready')
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No se pudo cargar la disponibilidad del inmueble.'))
        setStatus('error')
      })
  }, [propertyId])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // Volver a pedir los datos es el único momento en que hay que volver al
  // estado de carga: al montar ya se parte de ahí, así que el efecto no
  // necesita escribir estado de forma síncrona.
  const reload = () => {
    setStatus('loading')
    setError(null)
    fetchAvailability()
  }

  if (status === 'loading') {
    return (
      <main className="havail havail--loading" aria-busy="true" aria-live="polite">
        <p className="havail__loading-text">Cargando disponibilidad del inmueble…</p>
      </main>
    )
  }

  if (status === 'error' || !property) {
    return (
      <main className="havail">
        <div className="havail__denied" role="alert">
          <p className="havail__denied-title">No se pudo abrir el panel</p>
          <p className="havail__denied-sub">{error}</p>
          <div className="havail__denied-actions">
            <Button type="button" variant="neutral" onClick={reload}>
              Reintentar
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!canManageAvailability(property, sessionUser)) {
    return (
      <main className="havail">
        <Denied reason={accessDeniedReason(property, sessionUser)} name={property.title} />
      </main>
    )
  }

  const statusValue = currentStatus ?? 'DISPONIBLE'

  return (
    <main className="havail">
      <header className="havail__head">
        <p className="havail__eyebrow">Panel del agente</p>
        <h1 className="havail__title">{property.title}</h1>
        <p className="havail__sub">
          {property.address} · Estado actual: {PROPERTY_STATUS_LABELS[statusValue]}
        </p>
      </header>

      <PropertyStatusSelector
        propertyId={property.id}
        status={statusValue}
        onChanged={(result) => setCurrentStatus(result.status)}
      />

      <ScheduleManager
        propertyId={property.id}
        schedules={schedules}
        status={statusValue}
        onSaved={setSchedules}
      />
    </main>
  )
}