import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'
import type { Filters } from './filters'
import { emptyFilters } from './filters'

export function useFilterParams(bounds: { min: number; max: number }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<Filters>(() => {
    const defaultState = emptyFilters(bounds.min, bounds.max)

    const operacion = searchParams.get('operacion') as Filters['operacion']
    const moneda = searchParams.get('moneda') as Filters['moneda']
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')
    const metraje = searchParams.get('metraje') as Filters['metraje']
    const habitaciones = searchParams.get('habitaciones')

    return {
      operacion: operacion === 'VENTA' || operacion === 'ALQUILER' ? operacion : defaultState.operacion,
      moneda: moneda === 'PEN' || moneda === 'USD' ? moneda : defaultState.moneda,
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

  const applyFilters = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams(searchParams)
      
      const prevMoneda = searchParams.get('moneda') || 'PEN'
      const nextMoneda = newFilters.moneda || 'PEN'
      const monedaChanged = prevMoneda !== nextMoneda
      const prevOp = searchParams.get('operacion') || ''
      const nextOp = newFilters.operacion || ''
      const opChanged = prevOp !== nextOp

      if (newFilters.operacion) params.set('operacion', newFilters.operacion)
      else params.delete('operacion')

      if (newFilters.moneda) params.set('moneda', newFilters.moneda)
      else params.delete('moneda')

      if (monedaChanged || opChanged) {
        params.delete('priceMin')
        params.delete('priceMax')
      } else {
        if (newFilters.priceMin > bounds.min) params.set('priceMin', String(newFilters.priceMin))
        else params.delete('priceMin')
        
        if (bounds.max > 1 && newFilters.priceMax < bounds.max) {
          params.set('priceMax', String(newFilters.priceMax))
        } else {
          params.delete('priceMax')
        }
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

  const setQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams)
      if (q.trim()) params.set('q', q)
      else params.delete('q')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  return { filters, query, setQuery, applyFilters, clearFilters }
}
