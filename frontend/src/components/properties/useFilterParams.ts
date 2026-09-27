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

  // 2. Aplicar nuevos filtros escribiéndolos en la URL
  const applyFilters = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams()

      if (newFilters.operacion) params.set('operacion', newFilters.operacion)
      
      // Guardar precios en URL si son diferentes a los bounds actuales
      if (newFilters.priceMin > bounds.min) params.set('priceMin', String(newFilters.priceMin))
      // Guardar priceMax si se especificó un límite superior válido
      if (bounds.max > 1 && newFilters.priceMax < bounds.max) {
      params.set('priceMax', String(newFilters.priceMax))
      }
      
      if (newFilters.metraje) params.set('metraje', newFilters.metraje)
      if (newFilters.habitaciones !== null) params.set('habitaciones', String(newFilters.habitaciones))
      if (newFilters.negociable) params.set('negociable', 'true')
      if (newFilters.destacado) params.set('destacado', 'true')
      if (newFilters.cochera) params.set('cochera', 'true')

      setSearchParams(params, { replace: true })
    },
    [bounds.min, bounds.max, setSearchParams]
  )

  // 3. Limpiar filtros y la URL a su estado inicial
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  return { filters, applyFilters, clearFilters }
}