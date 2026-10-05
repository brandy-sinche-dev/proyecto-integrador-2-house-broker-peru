import { useEffect, useState } from 'react'

/**
 * TASK-WPO-PROP-03: devuelve `value` con `delay` ms de retraso y solo después
 * de que deje de cambiar (borde final, sin escritura intermedia).
 *
 * El temporizador se cancela en cada cambio de `value`, así que una ráfaga de
 * pulsaciones o de cambios de propiedad produce una única actualización del
 * valor devuelto: es lo que evita que cada pulsación dispare una escritura en
 * la URL, un refiltrado del catálogo y un anuncio de la región viva.
 *
 * @param value  Valor que se quiere publicar con retraso.
 * @param delay  Margen sin cambios en ms. Por defecto, 300 ms.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
