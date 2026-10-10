import { useState } from 'react'
import { api } from './api'
import { Monogram } from '../components/Brand'

export default function Login({ onLogin, expired = false }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      onLogin()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="adm-screen">
      <form className="adm-box" onSubmit={submit}>
        <Monogram size={40} color="#B39B78" />
        <h1>Estructuras del Pacífico</h1>
        <p className="adm-msg">
          {expired ? 'Tu sesión terminó. Entra de nuevo: tus cambios sin guardar siguen aquí.' : 'Administración del sitio'}
        </p>
        <label className="adm-f">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="adm-msg err" role="alert">{error}</p>}
        <button className="adm-btn adm-btn-primary" disabled={busy || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
