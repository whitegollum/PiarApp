import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import '../styles/Auth.css'

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitationData, setInvitationData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const token = searchParams.get('token')

  useEffect(() => {
    // En producción, aquí validaríamos el token con el backend
    // Por ahora solo simulamos que el token es válido
    if (!token) {
      setError('Token de invitación no válido')
      setLoading(false)
    } else {
      // Simulamos cargar datos de la invitación
      setInvitationData({
        club_name: 'Club de Aeromodelismo XYZ',
        email: 'usuario@example.com'
      })
      setLoading(false)
    }
  }, [token])

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombreCompleto.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const data = await APIService.post('/auth/registrarse-desde-invitacion', {
        nombre_completo: nombreCompleto,
        email: invitationData.email,
        password: password,
        invitacion_token: token
      }, { skipAuth: true })

      login(data.usuario, data.tokens.access_token, data.tokens.refresh_token)
      navigate('/')
    } catch (error) {
      const err = error as any
      setError(err.message || 'Error de conexión. Por favor intenta nuevamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PiarAPP</h1>
            <p>Gestión de Clubs de Aeromodelismo</p>
          </div>
          <div className="auth-content">
            <h2>Invitación No Válida</h2>
            <div className="alert alert-error">
              El enlace de invitación no es válido o ha expirado.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PiarAPP</h1>
            <p>Gestión de Clubs de Aeromodelismo</p>
          </div>
          <div className="auth-content">
            <p style={{ textAlign: 'center' }}>Cargando invitación...</p>
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
          <h2>¡Bienvenido!</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Has sido invitado a unirte a <strong>{invitationData?.club_name}</strong>
          </p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleAcceptInvitation} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email (no se puede cambiar)</label>
              <input
                type="email"
                id="email"
                value={invitationData?.email || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nombre_completo">Nombre Completo</label>
              <input
                type="text"
                id="nombre_completo"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Juan Pérez"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
              <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
                Mínimo 8 caracteres
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="password_confirm">Confirmar Contraseña</label>
              <div className="password-input">
                <input
                  type={showPassword2 ? 'text' : 'password'}
                  id="password_confirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword2(!showPassword2)}
                  tabIndex={-1}
                >
                  {showPassword2 ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Aceptar Invitación y Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
