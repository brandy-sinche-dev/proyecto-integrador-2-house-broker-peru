import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import type { NavTarget, Section } from './components/Header'
import { Footer } from './components/Footer'
import { AssistantWidget } from './components/AssistantWidget'
import { AppointmentModal } from './components/crm/AppointmentModal'
import { AuthProvider } from './services/AuthContext'
import { ProtectedRoute } from './services/ProtectedRoute'
import { LoginModal } from './components/auth/Login'
import { AdminPanel } from './components/admin/AdminPanel'
import { AgentePanel } from './components/admin/AgentePanel'

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

  const [selectedProperty, setSelectedProperty] = useState<{ id: string; title: string } | null>(null)

  const [isLoginOpen, setIsLoginOpen] = useState(false)

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

  const handleBookVisit = useCallback((title: string, id?: string) => {
    if (id) setSelectedProperty({ id, title })
  }, [])

  const confirmVisit = (id: string) => {
    setVisits((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

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
    <AuthProvider>
      <Header
        current={section}
        conciergeOpen={assistantOpen}
        savedCount={saved.length}
        visitsCount={visits.length}
        onNavigate={navigate}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={home} />
        <Route
          path="/properties/:id"
          element={
            <Suspense fallback={<ListSkeleton />}>
              <PropertyDetail 
                onBack={() => navigateTo('/')} 
                onBookVisit={handleBookVisit}
              />
            </Suspense>
          }
        />
        
        {/* Rutas Protegidas por Rol */}
        <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['AGENTE']} />}>
          <Route path="/agente" element={<AgentePanel />} />
          <Route
            path="/agente/propiedades/:id/disponibilidad"
            element={
              <Suspense fallback={<ListSkeleton />}>
                <AgentAvailability />
              </Suspense>
            }
          />
        </Route>

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

      {selectedProperty && (
        <AppointmentModal
          key={selectedProperty.id}
          isOpen={true}
          onClose={() => setSelectedProperty(null)}
          onConfirmed={() => confirmVisit(selectedProperty.id)}
          propertyTitle={selectedProperty.title}
          isLoggedIn={true}
        />
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </AuthProvider>
  )
}

export default App
