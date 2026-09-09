import { useState, lazy, Suspense } from 'react'
import { Button } from './components/Button'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import type { Property } from './services/types'

const PropertyForm = lazy(() => import('./components/properties/PropertyForm').then(m => ({ default: m.PropertyForm })))
const PropertyList = lazy(() => import('./components/properties/PropertyList').then(m => ({ default: m.PropertyList })))

type View = { name: 'list' } | { name: 'form'; property?: Property }

const NEW_KEY = crypto.randomUUID()

function App() {
  const [view, setView] = useState<View>({ name: 'list' })

  const navigate = (target: 'list' | 'form') => {
    if (target === 'list') setView({ name: 'list' })
    else setView({ name: 'form' })
  }

  return (
    <>
      <Header current={view.name} onNavigate={navigate} />

      {view.name === 'list' ? (
        <>
          <Hero
            title={`Encuentra el inmueble ideal\ndonde quieras vivir`}
            subtitle="Explora departamentos, casas, terrenos y oficinas gestionados por HouseBroker Perú."
          />
          <main className="hmain">
            <Suspense fallback={
              <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="hprops__skeleton" />
                ))}
              </div>
            }>
              <PropertyList
                onNew={() => navigate('form')}
                onEdit={(property) => setView({ name: 'form', property })}
              />
            </Suspense>
          </main>
        </>
      ) : (
        <main className="hmain">
          <div className="hform-heading">
            <p className="hform-heading__eyebrow">HouseBroker Perú</p>
            <h2 className="hform-heading__title">
              {view.property ? 'Editar propiedad' : 'Registrar propiedad'}
            </h2>
            <Button variant="ghost" onClick={() => navigate('list')}>
              ← Volver al listado
            </Button>
          </div>
          <Suspense fallback={
            <div className="hprops__grid hprops__grid--skeleton" aria-hidden="true">
              <div className="hprops__skeleton" style={{ gridColumn: '1 / -1', height: '400px' }} />
            </div>
          }>
            <PropertyForm
              key={view.property?.id ?? NEW_KEY}
              property={view.property}
              onCancel={() => navigate('list')}
              onSaved={() => navigate('list')}
            />
          </Suspense>
        </main>
      )}
    </>
  )
}

export default App