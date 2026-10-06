import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import type { NavTarget, Section } from './components/Header'
import { Footer } from './components/Footer'
import { AssistantWidget } from './components/AssistantWidget'
import { AppointmentModal } from './components/crm/AppointmentModal'

const PropertyList = lazy(() => import('./components/properties/PropertyList').then(m => ({ default: m.PropertyList })))
const PropertyDetail = lazy(() => import('./components/properties/PropertyDetail').then(m => ({ default: m.PropertyDetail })))
const AvailabilityPanel = lazy(() =>
  import('./components/availability/AvailabilityPanel').then(m => ({ default: m.AvailabilityPanel })),
)

const readList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function ListSkeleton() {
  return (
    <main className="hmain">
      <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hprops__skeleton" />
        ))}
      </div>
    </main>
  )
}

function AgentAvailability() {
  const { id } = useParams<{ id: string }>()
  return <AvailabilityPanel propertyId={id ?? ''} />
}

function App() {
  const [section, setSection] = useState<Section>('inicio')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => readList('hb_saved'))
  const [visits, setVisits] = useState<string[]>(() => readList('hb_visits'))

  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState('Inmueble Seleccionado')

  const navigateTo = useNavigate()
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('hb_saved', JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    localStorage.setItem('hb_visits', JSON.stringify(visits))
  }, [visits])

  const toggleSave = useCallback(
    (id: string) => setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  )

  const toggleVisit = useCallback(
    (id: string) => setVisits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  )

  // El truco está aquí: id es opcional (id?: string)
  const handleBookVisit = useCallback((title: string, id?: string) => {
    setSelectedPropertyTitle(title)
    setIsBookingOpen(true)
    if (id && !visits.includes(id)) {
      toggleVisit(id)
    }
  }, [visits, toggleVisit])

  const navigate = useCallback(
    (target: NavTarget) => {
      if (target === 'concierge') {
        setAssistantOpen(true)
        return
      }
      setSection(target)
      if (location.pathname !== '/') navigateTo('/')
    },
    [location.pathname, navigateTo],
  )

  const openProperty = useCallback(
    (id: string) => {
      navigateTo(`/properties/${id}`)
    },
    [navigateTo],
  )

  const home = (
    <Suspense fallback={<ListSkeleton />}>
      <PropertyList
        mode={section}
        saved={saved}
        visits={visits}
        onToggleSave={toggleSave}
        onToggleVisit={toggleVisit}
        onNavigate={navigate}
        onOpen={openProperty}
        onBookVisit={handleBookVisit}
      />
    </Suspense>
  )

  return (
    <>
      <Header
        current={section}
        conciergeOpen={assistantOpen}
        savedCount={saved.length}
        visitsCount={visits.length}
        onNavigate={navigate}
      />

      <Routes>
        <Route path="/" element={home} />
        <Route
          path="/properties/:id"
          element={
            <Suspense fallback={<ListSkeleton />}>
              <PropertyDetail 
                onBack={() => navigateTo('/')} 
                onBookVisit={(title) => handleBookVisit(title)}
              />
            </Suspense>
          }
        />
        <Route
          path="/agente/propiedades/:id/disponibilidad"
          element={
            <Suspense fallback={<ListSkeleton />}>
              <AgentAvailability />
            </Suspense>
          }
        />
        <Route path="*" element={home} />
      </Routes>

      <Footer />

      <AssistantWidget
        open={assistantOpen}
        savedCount={saved.length}
        visitsCount={visits.length}
        onToggle={() => setAssistantOpen((open) => !open)}
        onNavigate={navigate}
      />

      <AppointmentModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        propertyTitle={selectedPropertyTitle}
        isLoggedIn={true}
      />
    </>
  )
}


export default App
