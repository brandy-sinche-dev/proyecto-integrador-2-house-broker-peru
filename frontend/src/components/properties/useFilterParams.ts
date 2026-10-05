import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'
import type { Filters } from './filters'
import { emptyFilters } from './filters'

export function useFilterParams(bounds: { min: number; max: number }) {
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Leer parámetros de la URL y mapearlos al objeto Filters
  const filters = useMemo<Filters>(() => {
    const defaultState = emptyFilters(bounds.min, bounds.max)

    const operacion = searchParams.get('operacion') as Filters['operacion']
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')
    const metraje = searchParams.get('metraje') as Filters['metraje']
    const habitaciones = searchParams.get('habitaciones')

    return {
      operacion: operacion === 'VENTA' || operacion === 'ALQUILER' ? operacion : defaultState.operacion,
      priceMin: priceMin !== null && !isNaN(Number(priceMin)) ? Number(priceMin) : bounds.min,
      priceMax: priceMax !== null && !isNaN(Number(priceMax)) ? Number(priceMax) : bounds.max,
      metraje: metraje && ['small', 'mid', 'large'].includes(metraje) ? metraje : defaultState.metraje,
      habitaciones: habitaciones !== null && !isNaN(Number(habitaciones)) ? Number(habitaciones) : defaultState.habitaciones,
      negociable: searchParams.get('negociable') === 'true',
      destacado: searchParams.get('destacado') === 'true',
      cochera: searchParams.get('cochera') === 'true',
    }
  }, [searchParams, bounds.min, bounds.max])

  const query = useMemo(() => searchParams.get('q') ?? '', [searchParams])

  // 2. Aplicar nuevos filtros escribiéndolos en la URL
  const applyFilters = useCallback(
    (newFilters: Filters) => {
      // Se parte de los parámetros actuales y no de uno vacío porque la búsqueda
      // por texto también vive en la URL (`?q=`): al aplicar un filtro hay que
      // conservarla. Por eso cada filtro vuelve a su valor por defecto con
      // `delete` en vez de simplemente no escribirse.
      const params = new URLSearchParams(searchParams)

      if (newFilters.operacion) params.set('operacion', newFilters.operacion)
      else params.delete('operacion')

      // Guardar precios en URL si son diferentes a los bounds actuales
      if (newFilters.priceMin > bounds.min) params.set('priceMin', String(newFilters.priceMin))
      else params.delete('priceMin')
      // Guardar priceMax si se especificó un límite superior válido
      if (bounds.max > 1 && newFilters.priceMax < bounds.max) {
        params.set('priceMax', String(newFilters.priceMax))
      } else {
        params.delete('priceMax')
      }

      if (newFilters.metraje) params.set('metraje', newFilters.metraje)
      else params.delete('metraje')
      if (newFilters.habitaciones !== null) params.set('habitaciones', String(newFilters.habitaciones))
      else params.delete('habitaciones')
      if (newFilters.negociable) params.set('negociable', 'true')
      else params.delete('negociable')
      if (newFilters.destacado) params.set('destacado', 'true')
      else params.delete('destacado')
      if (newFilters.cochera) params.set('cochera', 'true')
      else params.delete('cochera')

      setSearchParams(params, { replace: true })
    },
    [bounds.min, bounds.max, searchParams, setSearchParams]
  )

  // La búsqueda por texto se escribe con su propia función porque el input la
  // publica con debounce (TASK-WPO-PROP-03) y no con cada pulsación.
  const setQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams)
      if (q.trim()) params.set('q', q)
      else params.delete('q')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 3. Limpiar filtros y la URL a su estado inicial
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  return { filters, query, setQuery, applyFilters, clearFilters }
}