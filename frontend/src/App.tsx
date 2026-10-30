import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Header } from './components/Header'
import type { NavTarget, Section } from './components/Header'
import { Footer } from './components/Footer'
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

const FAVORITES_KEY = ['favorites'] as const
type FavoriteEntry = Awaited<ReturnType<typeof addFavorite>>
interface ToggleFavoriteVariables {
  property: Property
  isSaved: boolean
}
interface ToggleFavoriteContext {
  previous: Property[]
}

// Sin reintentos ni timers de recolección: las mutaciones de favoritos son
// idempotentes por intención y las pruebas no deben quedar con handles abiertos.
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

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
import { AssistantWidget } from './components/AssistantWidget'

function AppContent() {
  const [section, setSection] = useState<Section>('inicio')
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [visits, setVisits] = useState<string[]>(() => readList('hb_visits'))
  const [favoriteAnnouncement, setFavoriteAnnouncement] = useState('')
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(() =>
    localStorage.getItem('hb_pending_favorite'),
  )

  const [selectedProperty, setSelectedProperty] = useState<{ id: string; title: string } | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const inFlightFavorites = useRef(new Set<string>())

  const favoritesQuery = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getFavorites,
    enabled: Boolean(user),
  })
  const favorites = useMemo(
    () => (user ? favoritesQuery.data ?? [] : []),
    [user, favoritesQuery.data],
  )
  const favoriteIds = useMemo(() => new Set(favorites.map((p) => p.id)), [favorites])

  const toggleFavorite = useMutation<
    FavoriteEntry | null,
    Error,
    ToggleFavoriteVariables,
    ToggleFavoriteContext
  >({
    mutationFn: async ({ property, isSaved }) => {
      if (isSaved) {
        await removeFavorite(property.id)
        return null
      }
      return addFavorite(property.id)
    },
    onMutate: async ({ property, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY })
      const previous = queryClient.getQueryData<Property[]>(FAVORITES_KEY) ?? []
      queryClient.setQueryData<Property[]>(FAVORITES_KEY, (current = []) =>
        isSaved
          ? current.filter((p) => p.id !== property.id)
          : [...current, { ...property, is_favorite: true }],
      )
      setFavoriteAnnouncement(
        isSaved
          ? `Quitando ${property.title} de favoritos…`
          : `Guardando ${property.title} en favoritos…`,
      )
      return { previous }
    },
    onError: (_error, { property }, context) => {
      const previousItem = context?.previous.find((p) => p.id === property.id)
      queryClient.setQueryData<Property[]>(FAVORITES_KEY, (current = []) => {
        const others = current.filter((p) => p.id !== property.id)
        return previousItem ? [...others, previousItem] : others
      })
      setFavoriteAnnouncement(
        `No se pudo actualizar ${property.title}. Se restauró el estado anterior de favoritos.`,
      )
    },
    onSuccess: (entry, { property, isSaved }) => {
      if (!isSaved && entry) {
        queryClient.setQueryData<Property[]>(FAVORITES_KEY, (current = []) =>
          current.map((p) =>
            p.id === property.id ? { ...entry.property, is_favorite: true } : p,
          ),
        )
      }
      setFavoriteAnnouncement(
        isSaved
          ? `${property.title} quitado de favoritos.`
          : `${property.title} añadido a favoritos.`,
      )
    },
    onSettled: (_entry, _error, { property }) => {
      inFlightFavorites.current.delete(property.id)
    },
  })
  const { mutate: mutateFavorite } = toggleFavorite

  const addPendingFavorite = useMutation({
    mutationFn: (propertyId: string) => addFavorite(propertyId),
    onSuccess: (entry) => {
      queryClient.setQueryData<Property[]>(FAVORITES_KEY, (current = []) =>
        current.some((p) => p.id === entry.property.id)
          ? current
          : [...current, { ...entry.property, is_favorite: true }],
      )
      setFavoriteAnnouncement(`${entry.property.title} añadido a favoritos.`)
    },
    onError: () =>
      setFavoriteAnnouncement('No se pudo guardar el favorito pendiente. Inténtalo de nuevo.'),
  })
  const { mutate: mutatePendingFavorite } = addPendingFavorite

  const navigateTo = useNavigate()
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('hb_visits', JSON.stringify(visits))
  }, [visits])

  useEffect(() => {
    if (!user || !pendingFavorite) return
    const id = pendingFavorite
    setPendingFavorite(null)
    localStorage.removeItem('hb_pending_favorite')
    mutatePendingFavorite(id)
  }, [user, pendingFavorite, mutatePendingFavorite])

  const toggleSave = useCallback(
    (property: Property) => {
      if (!user) {
        localStorage.setItem('hb_pending_favorite', property.id)
        setPendingFavorite(property.id)
        return
      }
      // Protección contra dobles clics: una petición por inmueble a la vez.
      if (inFlightFavorites.current.has(property.id)) return
      inFlightFavorites.current.add(property.id)
      mutateFavorite({ property, isSaved: favoriteIds.has(property.id) })
    },
    [user, favoriteIds, mutateFavorite],
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

      <div className="sr-only" role="status" aria-label="Favoritos" aria-live="polite" aria-atomic="true">
        {favoriteAnnouncement}
      </div>

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
          propertyId={selectedProperty.id}
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

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />\n      <AssistantWidget
        open={isAssistantOpen}
        savedCount={favoriteIds.size}
        visitsCount={visits.length}
        onToggle={() => setIsAssistantOpen(!isAssistantOpen)}
        onNavigate={navigate}
      />
    </>
  )
}

function App() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
