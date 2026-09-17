import { useEffect, useState, lazy, Suspense } from 'react'
import { Header } from './components/Header'
import type { NavTarget, Section } from './components/Header'
import { Footer } from './components/Footer'
import { AssistantWidget } from './components/AssistantWidget'

const PropertyList = lazy(() => import('./components/properties/PropertyList').then(m => ({ default: m.PropertyList })))

const readList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function App() {
  const [section, setSection] = useState<Section>('inicio')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => readList('hb_saved'))
  const [visits, setVisits] = useState<string[]>(() => readList('hb_visits'))

  useEffect(() => {
    localStorage.setItem('hb_saved', JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    localStorage.setItem('hb_visits', JSON.stringify(visits))
  }, [visits])

  const toggleSave = (id: string) =>
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleVisit = (id: string) =>
    setVisits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const navigate = (target: NavTarget) => {
    if (target === 'concierge') {
      setAssistantOpen(true)
      return
    }
    setSection(target)
  }

  return (
    <>
      <Header
        current={section}
        conciergeOpen={assistantOpen}
        savedCount={saved.length}
        visitsCount={visits.length}
        onNavigate={navigate}
      />

      <Suspense fallback={
        <main className="hmain">
          <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hprops__skeleton" />
            ))}
          </div>
        </main>
      }>
        <PropertyList
          mode={section}
          saved={saved}
          visits={visits}
          onToggleSave={toggleSave}
          onToggleVisit={toggleVisit}
          onNavigate={navigate}
        />
      </Suspense>

      <Footer />

      <AssistantWidget
        open={assistantOpen}
        savedCount={saved.length}
        visitsCount={visits.length}
        onToggle={() => setAssistantOpen((open) => !open)}
        onNavigate={navigate}
      />
    </>
  )
}

export default App
