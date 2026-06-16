import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import APIService from '../services/api'
import { startGoogleOAuth } from '../services/googleOAuth'
import { Eye, EyeOff } from 'lucide-react'
import '../styles/Auth.css'

interface RegisterResponse {
  usuario: {
    id: number
    email: string
    nombre_completo: string
  }
}

export default function Register() {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    password_confirm: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'email' ? value.toLowerCase() : value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.nombre_completo.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (formData.password !== formData.password_confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      await APIService.post<RegisterResponse>('/auth/registro', {
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        password: formData.password
      }, { skipAuth: true })

      // Mostrar mensaje de éxito y redirigir a login
      navigate('/auth/login', { 
        state: { message: 'Registro exitoso. Por favor inicia sesión.' } 
      })
    } catch (error) {
      const err = error as any
      setError(err.message || 'Error al registrarse')
      console.error('Register error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
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
          <h2>Crear Cuenta</h2>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="nombre_completo">Nombre Completo</label>
              <input
                type="text"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                placeholder="Juan Pérez"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
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
                  {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="auth-divider">
            <span>O regístrate con</span>
          </div>

          <button
            type="button"
            className="btn btn-google btn-block"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            🔵 Continuar con Google
          </button>

          <div className="auth-footer">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link to="/auth/login">Inicia sesión aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
