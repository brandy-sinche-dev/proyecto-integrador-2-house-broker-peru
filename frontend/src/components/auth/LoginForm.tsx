import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export function LoginForm() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      window.location.href = '/'
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="auth-form">
      <h1>Iniciar sesión</h1>
      {error && <p role="alert">{error}</p>}
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
    </form>
  )
}
