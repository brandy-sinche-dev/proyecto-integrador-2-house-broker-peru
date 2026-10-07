import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export function RegisterForm() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signUp({ email, password, full_name: fullName, phone })
      window.location.href = '/login'
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo registrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="auth-form">
      <h1>Registro</h1>
      {error && <p role="alert">{error}</p>}
      <label>
        Nombres completos
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </label>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Teléfono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear cuenta'}</button>
    </form>
  )
}
