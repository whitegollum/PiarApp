import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import '../styles/Forms.css'

export default function CreateClub() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    descripcion: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Auto-generar slug desde nombre
    if (name === 'nombre') {
      setFormData(prev => ({
        ...prev,
        slug: value
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.nombre.trim()) {
      setError('El nombre del club es requerido')
      return
    }

    if (!formData.slug.trim()) {
      setError('El slug es requerido')
      return
    }

    setLoading(true)

    try {
      const result = await APIService.post('/clubes', formData)
      navigate(`/clubes/${result.id}`)
    } catch (error) {
      setError('Error al crear club: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!usuario) {
    navigate('/auth/login')
    return null
  }

  return (
    <div className="form-layout">
      <Navbar usuario={usuario} onLogout={logout} />

      <main className="form-main">
        <div className="form-container">
          <div className="form-header">
            <h1>Crear Nuevo Club</h1>
            <p className="subtitle">Configura tu club de aeromodelismo</p>
          </div>

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="nombre">Nombre del Club *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="ej: Club de Aeromodelismo de Madrid"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">Slug *</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="ej: club-madrid"
                required
                disabled={loading}
              />
              <small className="help-text">
                Se genera automáticamente desde el nombre. Solo letras, números y guiones.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Descripción del club..."
                rows={5}
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Club'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
