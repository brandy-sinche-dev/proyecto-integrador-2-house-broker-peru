import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Property, TransactionMode } from '../../services/types'
import { getProperty } from '../../services/properties'
import { getErrorMessage } from '../../services/axios'
import { formatMoney } from './money'
import './PropertyDetail.css'

interface PropertyDetailProps {
  onBack: () => void
  onBookVisit?: (title: string) => void // <-- Prop agregada para abrir el modal de visitas
}

type Status = 'loading' | 'error' | 'ready'

const OP_LABEL: Record<TransactionMode, string> = {
  VENTA: 'En venta',
  ALQUILER: 'En alquiler',
}

const TYPE_LABEL: Record<string, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

export function PropertyDetail({ onBack, onBookVisit }: PropertyDetailProps) {
  const { id = '' } = useParams()
  const [property, setProperty] = useState<Property | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    getProperty(id)
      .then((data) => {
        setProperty(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No se pudo cargar la propiedad.'))
        setStatus('error')
      })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const notFound = !id

  const retry = () => {
    setError(null)
    setStatus('loading')
    load()
  }

  const cover = property
    ? property.images?.find((img) => img.es_principal)?.url ??
      property.images?.[0]?.url ??
      property.link_galeria
    : undefined

  return (
    <main className="hpd">
      <button type="button" className="hpd__back" onClick={onBack}>
        ← Volver al catálogo
      </button>

      {status === 'loading' && !notFound && (
        <div className="hpd__skeleton" aria-hidden="true">
          <div className="hpd__skeleton-media" />
          <div className="hpd__skeleton-line" />
          <div className="hpd__skeleton-line hpd__skeleton-line--short" />
        </div>
      )}

      {(notFound || status === 'error') && (
        <div className="hpd__state">
          <p className="hpd__state-title">No pudimos mostrar la propiedad</p>
          <p className="hpd__state-sub">{notFound ? 'Propiedad no encontrada.' : error}</p>
          {!notFound && (
            <button type="button" className="hpd__retry" onClick={retry}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {status === 'ready' && property && (
        <article className="hpd__card">
          <div className={`hpd__media hpd__media--${property.property_type.toLowerCase()}`}>
            {cover && (
              <img
                className="hpd__img"
                src={cover}
                alt={`Vista de ${property.title}`}
                width={960}
                height={540}
                fetchPriority="high"
                decoding="async"
              />
            )}
          </div>

          <div className="hpd__body">
            <span className="hpd__badge">{OP_LABEL[property.mode] ?? property.mode}</span>
            <h1 className="hpd__title">{property.title}</h1>
            <p className="hpd__price">{formatMoney(property.price, property.moneda)}</p>
            <p className="hpd__address">{property.address}</p>

            <dl className="hpd__specs">
              <div className="hpd__spec">
                <dt>Tipo</dt>
                <dd>{TYPE_LABEL[property.property_type] ?? property.property_type}</dd>
              </div>
              {property.area_total != null && (
                <div className="hpd__spec">
                  <dt>Área total</dt>
                  <dd>{property.area_total} m²</dd>
                </div>
              )}
              {property.area_construida != null && (
                <div className="hpd__spec">
                  <dt>Área construida</dt>
                  <dd>{property.area_construida} m²</dd>
                </div>
              )}
              {property.dormitorios != null && (
                <div className="hpd__spec">
                  <dt>Dormitorios</dt>
                  <dd>{property.dormitorios}</dd>
                </div>
              )}
              {property.banos != null && (
                <div className="hpd__spec">
                  <dt>Baños</dt>
                  <dd>{property.banos}</dd>
                </div>
              )}
              {property.estacionamientos != null && (
                <div className="hpd__spec">
                  <dt>Estacionamientos</dt>
                  <dd>{property.estacionamientos}</dd>
                </div>
              )}
              {property.mantenimiento != null && (
                <div className="hpd__spec">
                  <dt>Mantenimiento</dt>
                  <dd>{formatMoney(property.mantenimiento, property.moneda)} / mes</dd>
                </div>
              )}
            </dl>

            <div className="hpd__actions">
              <a className="hpd__cta hpd__cta--primary" href="mailto:asesores@housebroker.pe">
                Contactar asesor
              </a>
              {onBookVisit && (
                <button
                  type="button"
                  className="hpd__cta hpd__cta--ghost"
                  onClick={() => onBookVisit(property.title)}
                >
                  Agendar visita
                </button>
              )}
              {property.link_planos && (
                <a className="hpd__cta hpd__cta--ghost" href={property.link_planos}>
                  Ver planos
                </a>
              )}
            </div>
          </div>
        </article>
      )}
    </main>
  )
}
