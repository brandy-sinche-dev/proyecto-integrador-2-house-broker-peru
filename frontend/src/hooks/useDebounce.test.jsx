// =============================================================
// Pruebas unitarias del hook useDebounce
// TASK-WPO-PROP-03: Jest + React Testing Library
// =============================================================
//
// `useDebounce` es la pieza que evita que cada pulsación de la barra de
// búsqueda llegue a la URL (y con ella al refiltrado del catálogo), así que
// lo que se verifica aquí es su contrato exacto: devuelve el valor inicial de
// inmediato, no adelanta nada antes del margen, colapsa una ráfaga de cambios
// en una sola publicación y respeta un margen distinto al de por defecto.
//
// Todo se mide con temporizadores falsos: sin ellos la suite comprobaría el
// reloj real de la máquina y sería intermitente.

import { act, renderHook } from '@testing-library/react'
import { useDebounce } from './useDebounce'

// Margen que usa el catálogo. Se repite aquí para que la suite falle si
// alguien cambia el valor por defecto del hook sin querer.
const DEFAULT_DELAY = 300

// Avanza el reloj falso dentro de `act` porque mover un temporizador dispara
// el `setState` del hook.
function advance(ms) {
  act(() => {
    jest.advanceTimersByTime(ms)
  })
}

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('devuelve el valor inicial sin esperar', () => {
    const { result } = renderHook(() => useDebounce('inicial'))

    expect(result.current).toBe('inicial')
  })

  it('no publica el cambio hasta que se cumple el margen', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })

    expect(result.current).toBe('a')

    advance(DEFAULT_DELAY - 1)

    expect(result.current).toBe('a')
  })

  it('publica el último valor al cumplirse el margen', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    advance(DEFAULT_DELAY)

    expect(result.current).toBe('ab')
  })

  it('colapsa una ráfaga de cambios en una sola publicación', () => {
    const renders = []
    const { rerender } = renderHook(
      ({ value }) => {
        const debounced = useDebounce(value)
        renders.push(debounced)
        return debounced
      },
      { initialProps: { value: '' } },
    )

    // Una búsqueda de 10 caracteres: el valor cambia en cada pulsación.
    'miraflores'.split('').forEach((_, index) => {
      rerender({ value: 'miraflores'.slice(0, index + 1) })
      advance(50)
    })

    // Entre pulsaciones nunca se publicó nada: el hook siempre devolvió el
    // valor inicial.
    expect(renders).toEqual(Array('miraflores'.length + 1).fill(''))

    advance(DEFAULT_DELAY)

    expect(renders.at(-1)).toBe('miraflores')
  })

  it('reinicia el margen con cada cambio en vez de acumularlos', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    advance(DEFAULT_DELAY - 100)
    rerender({ value: 'abc' })
    advance(DEFAULT_DELAY - 100)

    // Habría publicado "ab" si el margen no se reiniciara en cada cambio.
    expect(result.current).toBe('a')

    advance(100)

    expect(result.current).toBe('abc')
  })

  it('acepta un margen distinto al de por defecto', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 50), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    advance(49)

    expect(result.current).toBe('a')

    advance(1)

    expect(result.current).toBe('ab')
  })

  it('ignora un margen de 0 (publica en el siguiente tick)', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })

    expect(result.current).toBe('a')

    advance(0)

    expect(result.current).toBe('ab')
  })

  it('no publica nada al desmontar el componente', () => {
    const onRender = jest.fn()
    const { rerender, unmount } = renderHook(
      ({ value }) => {
        const debounced = useDebounce(value)
        onRender(debounced)
        return debounced
      },
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'ab' })
    unmount()
    onRender.mockClear()

    advance(DEFAULT_DELAY * 10)

    expect(onRender).not.toHaveBeenCalled()
  })
})
