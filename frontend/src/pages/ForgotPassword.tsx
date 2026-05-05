import { useState } from 'react'
import { Link } from 'react-router-dom'
import APIService from '../services/api'
import '../styles/Auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await APIService.post('/auth/solicitar-reset-contrasena', { email }, { skipAuth: true })
      setSent(true)
    } catch (err) {
      const error = err as any
      setError(error.message || 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>PiarAPP</h1>
          <p>Gestión de Clubs de Aeromodelismo</p>
        </div>

        <div className="auth-content">
          <h2>Recuperar contraseña</h2>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {sent ? (
            <>
              <div className="alert alert-success">
                Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.
              </div>
              <div className="auth-footer">
                <p>
                  <Link to="/auth/login">Volver al inicio de sesión</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '20px', color: 'var(--color-muted)', fontSize: '14px' }}>
                Introduce tu email y te enviaremos instrucciones para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  <Link to="/auth/login">Volver al inicio de sesión</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
