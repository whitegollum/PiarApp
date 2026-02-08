import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import APIService from '../services/api'
import '../styles/Forms.css'
import '../styles/Profile.css'

interface FormData {
  nombre_completo: string
  email: string
  current_password?: string
  new_password?: string
  confirm_password?: string
}

export default function Profile() {
  const navigate = useNavigate()
  const { usuario, updateUser } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    nombre_completo: usuario?.nombre_completo || '',
    email: usuario?.email || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      setLoading(true)
      const response = await APIService.put('/usuarios/perfil', {
        nombre_completo: formData.nombre_completo,
      })
      
      updateUser(response)
      setSuccess('Perfil actualizado exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError((err as Error).message || 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.current_password || !formData.new_password) {
      setError('Por favor completa todos los campos de contraseña')
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.new_password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    try {
      setLoading(true)
      await APIService.post('/usuarios/cambiar-contrasena', {
        contraseña_actual: formData.current_password,
        nueva_contraseña: formData.new_password,
      })
      
      setSuccess('Contraseña cambiada exitosamente')
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
      setShowPasswordForm(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError((err as Error).message || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="profile-layout">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Mi Perfil</h1>
            <p>Administra tu información personal</p>
          </div>

          {/* Sección de información del usuario */}
          <section className="profile-section">
            <h2>Información Personal</h2>
            
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleProfileUpdate} className="form-container">
              <div className="form-group">
                <label htmlFor="nombre_completo">Nombre Completo</label>
                <input
                  type="text"
                  id="nombre_completo"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="form-input"
                />
                <small className="help-text">El email no puede ser modificado</small>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => navigate('/')}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </section>

          {/* Sección de seguridad */}
          <section className="profile-section">
            <h2>Seguridad</h2>
            
            {!showPasswordForm ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowPasswordForm(true)}
              >
                🔐 Cambiar Contraseña
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="form-container">
                <div className="form-group">
                  <label htmlFor="current_password">Contraseña Actual</label>
                  <input
                    type="password"
                    id="current_password"
                    name="current_password"
                    value={formData.current_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new_password">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="new_password"
                    name="new_password"
                    value={formData.new_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                  <small className="help-text">Mínimo 8 caracteres</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_password">Confirmar Contraseña</label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Sección de datos */}
          <section className="profile-section danger-section">
            <h2>Datos Personales</h2>
            <p>Descarga una copia de todos tus datos personales</p>
            <button className="btn btn-secondary">
              📥 Descargar mis Datos
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
