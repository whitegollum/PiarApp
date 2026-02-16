import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import '../styles/Auth.css'

export default function FirstAccess() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    // Verificar si realmente necesitamos setup
    const checkSetup = async () => {
      try {
        const response = await APIService.get<{ setup_required: boolean }>('/auth/setup-required', { skipAuth: true })
        if (!response.setup_required) {
          navigate('/auth/login')
        }
      } catch (error) {
        console.error('Error checking setup status', error)
      }
    }
    checkSetup()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Crear el admin
      await APIService.post('/auth/setup-admin', {
        nombre_completo: nombre,
        email,
        password
      }, { skipAuth: true })

      // 2. Login automático
      const loginResponse = await APIService.post<any>('/auth/login', {
        email,
        password
      }, { skipAuth: true })

      // Guardar sesión
      login(loginResponse.usuario, loginResponse.tokens.access_token, loginResponse.tokens.refresh_token)
      
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al crear el administrador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Bienvenida</h1>
          <p>Configuración del Primer Administrador</p>
          <div className="alert-info">
            Esta pantalla solo aparece porque no existen usuarios en el sistema.
            El usuario que crees ahora tendrá permisos de Super Administrador.
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirma tu contraseña"
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Configurando...' : 'Crear Administrador e Iniciar'}
          </button>
        </form>
      </div>
    </div>
  )
}
