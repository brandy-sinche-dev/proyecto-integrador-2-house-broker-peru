import { useAuth } from '../../services/AuthContext'

export function ContadorPanel() {
  const { user, logout } = useAuth()

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h2>Panel del Contador / Usuario Interno</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Bienvenido, <strong>{user?.full_name}</strong></span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cerrar sesión</button>
        </div>
      </header>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
        <h3>Mis Registros</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Estás viendo únicamente la información que te corresponde. No tienes acceso a los registros de otros contadores ni a las configuraciones globales.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Registros Activos</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>12</p>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Pendientes de Revisión</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>3</p>
          </div>
        </div>

        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          + Nuevo Registro
        </button>
      </div>
    </div>
  )
}
