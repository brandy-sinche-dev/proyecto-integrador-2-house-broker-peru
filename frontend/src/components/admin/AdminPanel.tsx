import { useAuth } from '../../services/AuthContext'
import { useState } from 'react'

export function AdminPanel() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Mock Data (debe conectarse a una API real después)
  const stats = {
    agentesActivos: 8,
    totalAgentes: 12,
    clientes: 245,
    citasPendientes: 14,
    visualizaciones: 1250,
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Agentes Activos</h4>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.agentesActivos} <span style={{fontSize: '1rem', color: '#9ca3af', fontWeight: 'normal'}}>/ {stats.totalAgentes}</span></p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Clientes Registrados</h4>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.clientes}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Citas (Pendientes)</h4>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.citasPendientes}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Visualizaciones Totales</h4>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.visualizaciones}</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#9ca3af' }}>[Gráfico de citas]</span>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#9ca3af' }}>[Propiedades más visitadas]</span>
              </div>
            </div>
          </>
        )
      case 'agentes':
        return (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Gestión de Agentes</h3>
              <button style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Agregar Agente</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Agente</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Correo</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Teléfono</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Estado</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Citas</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Juan Pérez</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>juan@email.com</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>999999999</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}><span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>Activo</span></td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>12</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                    <button style={{ marginRight: '0.5rem', cursor: 'pointer', border: 'none', background: 'none', color: '#3b82f6' }}>Editar</button>
                    <button style={{ cursor: 'pointer', border: 'none', background: 'none', color: '#ef4444' }}>Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      case 'clientes':
        return <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}><h3>Gestión de Clientes (CRUD)</h3><p>Lista de clientes registrados...</p></div>
      case 'citas':
        return <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}><h3>Gestión de Citas</h3><p>Citas pendientes, confirmadas, realizadas, canceladas...</p></div>
      default:
        return <div>Sección en construcción</div>
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '80vh', background: '#f3f4f6' }}>
      <aside style={{ width: '250px', background: '#1f2937', color: 'white', padding: '2rem 0' }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Admin Panel</h2>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{user?.full_name}</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'agentes', label: 'Agentes' },
            { id: 'clientes', label: 'Clientes' },
            { id: 'propiedades', label: 'Propiedades' },
            { id: 'citas', label: 'Citas' },
            { id: 'estadisticas', label: 'Estadísticas' },
            { id: 'configuracion', label: 'Configuración' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ 
                padding: '1rem 1.5rem', 
                textAlign: 'left', 
                background: activeTab === item.id ? '#374151' : 'transparent', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                borderLeft: activeTab === item.id ? '4px solid #3b82f6' : '4px solid transparent'
              }}
            >
              {item.label}
            </button>
          ))}
          <button onClick={logout} style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: 'auto' }}>Cerrar sesión</button>
        </nav>
      </aside>
      
      <main style={{ flex: 1, padding: '2rem' }}>
        {renderContent()}
      </main>
    </div>
  )
}
