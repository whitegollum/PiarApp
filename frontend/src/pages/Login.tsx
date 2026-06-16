import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { startGoogleOAuth } from '../services/googleOAuth'
import { Eye, EyeOff } from 'lucide-react'
import APIService from '../services/api'
import '../styles/Auth.css'

interface LoginResponse {
  usuario: {
    id: number
    email: string
    nombre_completo: string
    fecha_creacion: string
  }
  tokens: {
    access_token: string
    refresh_token: string
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await APIService.post<LoginResponse>('/auth/login', {
        email,
        password
      }, { skipAuth: true })
      
      // Guardar en AuthContext
      login(response.usuario, response.tokens.access_token, response.tokens.refresh_token)
      
      navigate('/')
    } catch (err) {
      const error = err as any
      setError(error.message || 'Email o contraseña inválidos')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    try {
      startGoogleOAuth()
    } catch (err) {
      const error = err as any
      setError(error.message || 'No se pudo iniciar sesión con Google')
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
          <h2>Iniciar Sesión</h2>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="tu@email.com"
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="auth-divider">
            <span>O continúa con</span>
          </div>

          <button
            type="button"
            className="btn btn-google btn-block"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            🔵 Continuar con Google
          </button>

          <div className="auth-footer">
            <p>
              ¿No tienes cuenta?{' '}
              <Link to="/auth/registro">Regístrate aquí</Link>
            </p>
            <p>
              <Link to="/auth/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
