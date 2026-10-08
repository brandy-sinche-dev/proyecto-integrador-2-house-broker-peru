import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import type { NavTarget, Section } from './components/Header'
import { Footer } from './components/Footer'
import { AssistantWidget } from './components/AssistantWidget'
import { AppointmentModal } from './components/crm/AppointmentModal'

import { RegisterForm } from './components/auth/RegisterForm'
import { LoginPrompt } from './components/auth/LoginPrompt'
import { LoginModal } from './components/auth/LoginModal'
import { AdminPanel } from './components/admin/AdminPanel'
import { AgentePanel } from './components/admin/AgentePanel'
import { ProtectedRoute } from './services/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { addFavorite, getFavorites, removeFavorite } from './services/favorites'
import type { Property } from './services/types'

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
  const { user } = useAuth()
  if (!user) return <div>Inicia sesión para gestionar disponibilidad.</div>
  if (user.role !== 'AGENTE' && user.role !== 'ADMINISTRADOR') return <div>No tienes permisos para gestionar disponibilidad.</div>
  return <AvailabilityPanel propertyId={id ?? ''} />
}

function PropertyDetailRoute({
  favoriteIds,
  onToggleFavorite,
  onBack,
  onBookVisit,
}: {
  favoriteIds: ReadonlySet<string>
  onToggleFavorite: (property: Property) => void
  onBack: () => void
  onBookVisit?: (title: string, id: string) => void
}) {
  const { id = '' } = useParams()
  return (
    <PropertyDetail
      favorite={favoriteIds.has(id)}
      onToggleFavorite={onToggleFavorite}
      onBack={onBack}
      onBookVisit={onBookVisit}
    />
  )
}

import { Home } from './components/Home'

function App() {
  const [section, setSection] = useState<Section>('inicio')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [visits, setVisits] = useState<string[]>(() => readList('hb_visits'))
  const [favorites, setFavorites] = useState<Property[]>([])
  const favoriteIds = useMemo(() => new Set(favorites.map((p) => p.id)), [favorites])
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(() =>
    localStorage.getItem('hb_pending_favorite'),
  )

  const [selectedProperty, setSelectedProperty] = useState<{ id: string; title: string } | null>(null)
  const { user } = useAuth()

  const navigateTo = useNavigate()
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('hb_visits', JSON.stringify(visits))
  }, [visits])

  useEffect(() => {
    if (!user) {
      setFavorites([])
      return
    }
    let cancelled = false
    getFavorites()
      .then((list) => {
        if (!cancelled) setFavorites(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user || !pendingFavorite) return
    const id = pendingFavorite
    setPendingFavorite(null)
    localStorage.removeItem('hb_pending_favorite')
    addFavorite(id)
      .then((fav) =>
        setFavorites((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, fav.property])),
      )
      .catch(() => {})
  }, [user, pendingFavorite])

  const toggleSave = useCallback(
    (property: Property) => {
      if (!user) {
        localStorage.setItem('hb_pending_favorite', property.id)
        setPendingFavorite(property.id)
        return
      }
      const isSaved = favoriteIds.has(property.id)
      const previous = favorites
      setFavorites((prev) =>
        isSaved
          ? prev.filter((p) => p.id !== property.id)
          : [...prev, { ...property, is_favorite: true }],
      )
      const request = isSaved
        ? removeFavorite(property.id)
        : addFavorite(property.id).then((fav) =>
            setFavorites((prev) =>
              prev.map((p) => (p.id === property.id ? { ...fav.property, is_favorite: true } : p)),
            ),
          )
      request.catch(() => setFavorites(previous))
    },
    [user, favoriteIds, favorites],
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
      if ((target === 'guardados' || target === 'visitas') && !user) {
        setIsLoginOpen(true)
        return
      }
      setSection(target)
      if (location.pathname !== '/') navigateTo('/')
    },
    [location.pathname, navigateTo, user],
  )

  const openProperty = useCallback(
    (id: string) => {
      navigateTo(`/properties/${id}`)
    },
    [navigateTo],
  )

  const home = section === 'inicio' ? (
    <Home onNavigate={navigate} />
  ) : (
    <Suspense fallback={<ListSkeleton />}>
      <PropertyList
        mode={section === 'propiedades' ? 'inicio' : section} // Reutilizamos 'inicio' del backend/modo anterior
        saved={[...favoriteIds]}
        visits={visits}
        favoriteList={favorites}
        onToggleSave={toggleSave}
        onToggleVisit={toggleVisit}
        onNavigate={navigate}
        onOpen={openProperty}
        onBookVisit={handleBookVisit}
      />
    </Suspense>
  )

  const isAdminOrAgentRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/agente')

  return (
    <>
      {!isAdminOrAgentRoute && (
        <Header
          current={section}
          conciergeOpen={assistantOpen}
          savedCount={favoriteIds.size}
          visitsCount={visits.length}
          onNavigate={navigate}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
      )}

      <Routes>
        <Route path="/" element={home} />
        <Route path="/registro" element={<RegisterForm />} />

        {/* Rutas Protegidas por Rol */}
        <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
          <Route path="/admin/*" element={<AdminPanel />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['AGENTE']} />}>
          <Route path="/agente/*" element={<AgentePanel />} />
        </Route>
        
        <Route
          path="/properties/:id"
          element={
            <Suspense fallback={<ListSkeleton />}>
              <PropertyDetailRoute
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleSave}
                onBack={() => navigateTo('/')}
                onBookVisit={handleBookVisit}
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

      {!isAdminOrAgentRoute && <Footer />}

      

      {selectedProperty && (
        <AppointmentModal
          key={selectedProperty.id}
          isOpen={true}
          onClose={() => setSelectedProperty(null)}
          onConfirmed={() => confirmVisit(selectedProperty.id)}
          propertyTitle={selectedProperty.title}
          isLoggedIn={Boolean(user)}
        />
      )}

      {pendingFavorite && !user && (
        <LoginPrompt
          onClose={() => {
            setPendingFavorite(null)
            localStorage.removeItem('hb_pending_favorite')
          }}
          onLogin={() => {
            setIsLoginOpen(true)
            setPendingFavorite(null)
          }}
        />
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  )
}

export default App
