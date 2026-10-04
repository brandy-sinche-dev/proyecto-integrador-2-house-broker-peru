// =============================================================
// Instrumentación de Web Vitals (WPO-PROP-05)
// TASK-WPO-PROP-02: registra LCP y CLS en consola (solo medición).
// =============================================================
//
// No envía datos a ningún backend: imprime las métricas reales del
// navegador para poder contrastarlas con la línea base de Lighthouse.
// El código es tolerante a navegadores sin soporte de `PerformanceObserver`.

type LayoutShiftEntry = PerformanceEntry & {
  value?: number
  hadRecentInput?: boolean
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof PerformanceObserver !== 'undefined'
}

export function reportWebVitals(): void {
  if (!isSupported()) return

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) console.info(`[WebVitals] LCP: ${last.startTime.toFixed(2)} ms`)
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    let cls = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) cls += entry.value ?? 0
      }
      console.info(`[WebVitals] CLS: ${cls.toFixed(4)}`)
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // Alguno de los tipos de entrada no está soportado: se omite la medición.
  }
}
