import { useState } from 'react'
import { Button } from './components/Button'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { PropertyForm } from './components/properties/PropertyForm'
import { PropertyList } from './components/properties/PropertyList'
import type { Property } from './services/types'

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
            <PropertyList
              onNew={() => navigate('form')}
              onEdit={(property) => setView({ name: 'form', property })}
            />
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
          <PropertyForm
            key={view.property?.id ?? NEW_KEY}
            property={view.property}
            onCancel={() => navigate('list')}
            onSaved={() => navigate('list')}
          />
        </main>
      )}
    </>
  )
}

export default App