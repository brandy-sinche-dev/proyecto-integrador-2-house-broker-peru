import { useSearchParams } from 'react-router-dom';
import type { NavTarget } from './Header';
import './Home.css';

export function Home({ onNavigate }: { onNavigate: (target: NavTarget) => void }) {
  const [, setSearchParams] = useSearchParams();

  const handleCategoryClick = (searchTerm: string) => {
    setSearchParams({ q: searchTerm });
    onNavigate('propiedades');
  };

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

      {/* Categories Section (Tipos de Propiedades) */}
      <section className="home-categories" aria-labelledby="categories-heading">
        <header className="home-categories__header">
          <span className="home-categories__tag">Portafolio Inmobiliario</span>
          <h2 id="categories-heading" className="home-categories__title">
            Tipos de Propiedades
          </h2>
          <p className="home-categories__subtitle">
            Contamos con un catálogo diverso para cada necesidad comercial o residencial en las mejores zonas del Perú.
          </p>
        </header>

        {/* Fila 1: 3 Tarjetas Principales */}
        <div className="home-categories__main-grid">
          {/* Tarjeta 1: Departamentos */}
          <button
            type="button"
            className="home-card-main"
            onClick={() => handleCategoryClick('departamento')}
            aria-label="Explorar departamentos en venta y alquiler"
          >
            <div className="home-card-main__media">
              <img
                src="/properties/demo/depa1.jpg"
                alt="Departamentos residenciales modernos"
                className="home-card-main__img"
                loading="lazy"
              />
              <span className="home-card-main__badge">Residencial Prime</span>
            </div>
            <div className="home-card-main__content">
              <h3 className="home-card-main__title">Departamentos</h3>
              <p className="home-card-main__desc">
                Flats, dúplex y penthouses en las zonas residenciales más cotizadas y seguras de Lima.
              </p>
              <span className="home-card-main__link">
                Explorar departamentos <span className="home-card-main__arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </button>

          {/* Tarjeta 2: Casas */}
          <button
            type="button"
            className="home-card-main"
            onClick={() => handleCategoryClick('casa')}
            aria-label="Explorar casas unifamiliares y residenciales"
          >
            <div className="home-card-main__media">
              <img
                src="/properties/demo/casa1.jpg"
                alt="Casas residenciales con jardín"
                className="home-card-main__img"
                loading="lazy"
              />
              <span className="home-card-main__badge">Exclusividad</span>
            </div>
            <div className="home-card-main__content">
              <h3 className="home-card-main__title">Casas</h3>
              <p className="home-card-main__desc">
                Residencias familiares y casas de campo con amplios jardines, terrazas y acabados de lujo.
              </p>
              <span className="home-card-main__link">
                Explorar casas <span className="home-card-main__arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </button>

          {/* Tarjeta 3: Locales comerciales */}
          <button
            type="button"
            className="home-card-main"
            onClick={() => handleCategoryClick('comercial')}
            aria-label="Explorar locales comerciales de alto tránsito"
          >
            <div className="home-card-main__media">
              <img
                src="/properties/demo/oficina1.jpg"
                alt="Locales y espacios comerciales"
                className="home-card-main__img"
                loading="lazy"
              />
              <span className="home-card-main__badge">Alto Rendimiento</span>
            </div>
            <div className="home-card-main__content">
              <h3 className="home-card-main__title">Locales comerciales</h3>
              <p className="home-card-main__desc">
                Puntos estratégicos de alto tránsito peatonal y vehicular para potenciar o expandir tu negocio.
              </p>
              <span className="home-card-main__link">
                Explorar locales comerciales <span className="home-card-main__arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </button>
        </div>

        {/* Fila 2: 4 Tarjetas Compactas con Iconos */}
        <div className="home-categories__compact-grid">
          {/* Compacta 1: Terrenos para constructoras */}
          <button
            type="button"
            className="home-card-compact"
            onClick={() => handleCategoryClick('terreno')}
            aria-label="Ver terrenos para constructoras"
          >
            <div className="home-card-compact__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </div>
            <div className="home-card-compact__info">
              <h4 className="home-card-compact__title">Terrenos para constructoras</h4>
              <p className="home-card-compact__desc">Habilitación urbana y proyectos multifamiliares</p>
            </div>
            <span className="home-card-compact__arrow" aria-hidden="true">→</span>
          </button>

          {/* Compacta 2: Oficinas */}
          <button
            type="button"
            className="home-card-compact"
            onClick={() => handleCategoryClick('oficina')}
            aria-label="Ver oficinas y plantas ejecutivas"
          >
            <div className="home-card-compact__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
              </svg>
            </div>
            <div className="home-card-compact__info">
              <h4 className="home-card-compact__title">Oficinas</h4>
              <p className="home-card-compact__desc">Plantas libres y centros corporativos Prime</p>
            </div>
            <span className="home-card-compact__arrow" aria-hidden="true">→</span>
          </button>

          {/* Compacta 3: Casas de playa y campo */}
          <button
            type="button"
            className="home-card-compact"
            onClick={() => handleCategoryClick('playa')}
            aria-label="Ver casas de playa y campo"
          >
            <div className="home-card-compact__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V11z" />
                <circle cx="18" cy="5" r="2.5" />
                <path d="M1 22h22" />
              </svg>
            </div>
            <div className="home-card-compact__info">
              <h4 className="home-card-compact__title">Casas de playa y campo</h4>
              <p className="home-card-compact__desc">Propiedades exclusivas para descanso e inversión</p>
            </div>
            <span className="home-card-compact__arrow" aria-hidden="true">→</span>
          </button>

          {/* Compacta 4: Lotes industriales */}
          <button
            type="button"
            className="home-card-compact"
            onClick={() => handleCategoryClick('industrial')}
            aria-label="Ver lotes industriales"
          >
            <div className="home-card-compact__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20M3 20V9l6 3V9l6 3V6l6 3v11M10 14h4v6h-4z" />
              </svg>
            </div>
            <div className="home-card-compact__info">
              <h4 className="home-card-compact__title">Lotes industriales</h4>
              <p className="home-card-compact__desc">Ubicaciones estratégicas cerca a puertos y vías principales</p>
            </div>
            <span className="home-card-compact__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
      
    </main>
  );
}
