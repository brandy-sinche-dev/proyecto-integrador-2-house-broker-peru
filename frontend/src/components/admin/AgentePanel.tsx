import { useAuth } from '../../services/AuthContext'
import { useState } from 'react'

export function AgentePanel() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('cronograma')

  const renderContent = () => {
    switch(activeTab) {
      case 'cronograma':
        return (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3>Mi Cronograma (Próximas Citas)</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Día</button>
              <button style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Semana</button>
              <button style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Mes</button>
            </div>
            
            <div style={{ borderLeft: '2px solid #3b82f6', paddingLeft: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>10:00 AM — Visita departamento Miraflores</p>
              <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Cliente: Carlos Pérez</p>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Estado: <span style={{ color: '#059669', fontWeight: 'bold' }}>Confirmada</span></p>
            </div>
          </div>
        )
      case 'historial':
        return (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3>Historial de Citas</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Cliente</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Propiedad</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Fecha/Hora</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Estado</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Ana Gómez</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Casa Surco</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>12 Oct, 15:00</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Realizada</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Muy interesada, pedirá crédito.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      case 'interes':
        return (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3>Interés de clientes (Mis propiedades)</h3>
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Departamento Miraflores</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#4b5563', fontSize: '0.875rem' }}>
                <li><strong>35</strong> visualizaciones.</li>
                <li><strong>8</strong> clientes interesados.</li>
                <li><strong>4</strong> citas programadas.</li>
                <li><strong>2</strong> citas realizadas.</li>
              </ul>
            </div>
          </div>
        )
      default:
        return <div>Seleccione una opción</div>
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '80vh', background: '#f3f4f6' }}>
      <aside style={{ width: '250px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '2rem 0' }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>Panel Agente</h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{user?.full_name}</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'cronograma', label: 'Mi cronograma' },
            { id: 'historial', label: 'Historial de citas' },
            { id: 'interes', label: 'Interés de clientes' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ 
                padding: '1rem 1.5rem', 
                textAlign: 'left', 
                background: activeTab === item.id ? '#eff6ff' : 'transparent', 
                border: 'none', 
                color: activeTab === item.id ? '#1d4ed8' : '#4b5563', 
                cursor: 'pointer',
                borderRight: activeTab === item.id ? '4px solid #3b82f6' : '4px solid transparent',
                fontWeight: activeTab === item.id ? 'bold' : 'normal'
              }}
            >
              {item.label}
            </button>
          ))}
          <button onClick={logout} style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: 'auto' }}>Cerrar sesión</button>
        </nav>
      </aside>
      
      <main style={{ flex: 1, padding: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '2rem' }}>Resumen de Actividad</h2>
        {renderContent()}
      </main>
    </div>
  )
}
