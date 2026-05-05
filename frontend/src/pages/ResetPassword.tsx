import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import APIService from '../services/api'
import '../styles/Auth.css'

interface ValidarTokenResponse {
  valid: boolean
  email_hint: string | null
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [emailHint, setEmailHint] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidating(false)
      setTokenValid(false)
      return
    }

    const validarToken = async () => {
      try {
        const response = await APIService.get<ValidarTokenResponse>(
          `/auth/validar-reset-token?token=${encodeURIComponent(token)}`,
          { skipAuth: true }
        )
        setTokenValid(response.valid)
        if (response.email_hint) {
          setEmailHint(response.email_hint)
        }
      } catch {
        setTokenValid(false)
      } finally {
        setValidating(false)
      }
    }

    validarToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      await APIService.post('/auth/reset-contrasena', {
        token,
        nueva_contrasena: password
      }, { skipAuth: true })
      setSuccess(true)
      setTimeout(() => navigate('/auth/login'), 3000)
    } catch (err) {
      const error = err as any
      setError(error.message || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PiarAPP</h1>
            <p>Gestión de Clubs de Aeromodelismo</p>
          </div>
          <div className="auth-content">
            <p>Verificando enlace...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PiarAPP</h1>
            <p>Gestión de Clubs de Aeromodelismo</p>
          </div>
          <div className="auth-content">
            <h2>Enlace no válido</h2>
            <div className="alert alert-error">
              El enlace para restablecer la contraseña es inválido o ha expirado.
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/auth/recuperar-contrasena">Solicitar nuevo enlace</Link>
              </p>
              <p>
                <Link to="/auth/login">Volver al inicio de sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PiarAPP</h1>
            <p>Gestión de Clubs de Aeromodelismo</p>
          </div>
          <div className="auth-content">
            <h2>Contraseña actualizada</h2>
            <div className="alert alert-success">
              Tu contraseña ha sido restablecida correctamente. Redirigiendo al inicio de sesión...
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/auth/login">Ir al inicio de sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>PiarAPP</h1>
          <p>Gestión de Clubs de Aeromodelismo</p>
        </div>

        <div className="auth-content">
          <h2>Nueva contraseña</h2>

          {emailHint && (
            <p style={{ marginBottom: '20px', color: 'var(--color-muted)', fontSize: '14px' }}>
              Restableciendo contraseña para: <strong>{emailHint}</strong>
            </p>
          )}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">Nueva contraseña *</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña *</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
