import type { NavTarget } from './Header';

export function Home({ onNavigate }: { onNavigate: (target: NavTarget) => void }) {
  return (
    <main style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--brand-cream, #fbf9f8)', color: 'var(--ink, #1b1c1c)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Hero Section (Split Layout) */}
      <section style={{ display: 'flex', minHeight: '85vh', flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Left Side: Text */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10%', background: '#f8f6f3' }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#562B05', fontWeight: 700, marginBottom: '1.5rem' }}>
            House Broker Perú
          </p>
          <h1 style={{ fontSize: '3rem', fontWeight: 400, margin: '0 0 1.5rem 0', lineHeight: 1.1, color: '#2a2a2a' }}>
            Compañía experta en <span style={{ fontWeight: 700, color: '#562B05' }}>captación, venta y alquiler</span> de propiedades.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: '0 0 3rem 0', lineHeight: 1.6 }}>
            Bróker oficial de reconocidas empresas del sector de banca, medios de comunicación, alimentos y bebidas en el Perú.
          </p>
          <div>
            <button 
              onClick={() => onNavigate('propiedades')}
              style={{ 
                background: '#562B05', color: 'white', 
                border: 'none', padding: '1rem 2.5rem', 
                fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'background 0.3s' 
              }}
              onMouseOver={e => e.currentTarget.style.background = '#3e1e03'}
              onMouseOut={e => e.currentTarget.style.background = '#562B05'}
            >
              Ver Propiedades
            </button>
          </div>
        </div>

        {/* Right Side: Image */}
        <div style={{ 
          flex: '1 1 500px', 
          background: 'url("/banner.jpg") center/cover no-repeat',
          minHeight: '400px'
        }}>
        </div>
      </section>

      {/* Stats Bar (Dark Section) */}
      <section style={{ background: '#303031', color: 'white', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '1px' }}>Actualmente tenemos en nuestro portafolio:</h2>
        </div>
        <div style={{ 
          maxWidth: '1280px', margin: '0 auto', 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem', textAlign: 'center' 
        }}>
          <div style={{ padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-gold, #cfa861)', marginBottom: '0.5rem' }}>800+</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, margin: 0 }}>Propiedades de segundo uso<br/>valorizadas en US$ 2 Billones<br/>en 15 departamentos</p>
          </div>
          <div style={{ padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-gold, #cfa861)', marginBottom: '0.5rem' }}>6,000+</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, margin: 0 }}>Propiedades de estreno<br/>en proceso de construcción<br/>o entrega inmediata</p>
          </div>
          <div style={{ padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-gold, #cfa861)', marginBottom: '0.5rem' }}>$470 MM</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, margin: 0 }}>Valor de propiedades<br/>en operaciones activas<br/>en América Latina</p>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-gold, #cfa861)', marginBottom: '0.5rem' }}>#1</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, margin: 0 }}>Empresa especialista<br/>en venta de terrenos cerca al<br/>Mega Puerto de Chancay</p>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#562B05', margin: '0 0 1rem 0' }}>Tipos de Propiedades</h2>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Contamos con un catálogo diverso para cada necesidad comercial o residencial.</p>
        </div>

        <div style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' 
        }}>
          {['Departamentos', 'Casas', 'Locales comerciales', 'Terrenos para constructoras', 'Oficinas', 'Casas de playa y campo', 'Lotes industriales'].map(cat => (
            <div key={cat} style={{
              padding: '1.5rem 2rem',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ color: 'var(--brand-gold, #cfa861)' }}>◆</span>
              {cat}
            </div>
          ))}
        </div>
      </section>
      
    </main>
  )
}
