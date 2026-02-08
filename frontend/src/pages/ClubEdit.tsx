import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import '../styles/ClubEdit.css'

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion?: string
  logo_url?: string
  color_primario: string
  color_secundario: string
  color_acento: string
  pais?: string
  region?: string
  email_contacto?: string
  telefono?: string
  sitio_web?: string
}

interface ClubUpdate {
  nombre?: string
  descripcion?: string
  logo_url?: string
  color_primario?: string
  color_secundario?: string
  color_acento?: string
  pais?: string
  region?: string
  email_contacto?: string
  telefono?: string
  sitio_web?: string
}

export default function ClubEdit() {
  const { usuario, logout } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Formulario
  const [formData, setFormData] = useState<ClubUpdate>({
    nombre: '',
    descripcion: '',
    logo_url: '',
    color_primario: '#FF6B35',
    color_secundario: '#004E89',
    color_acento: '#F77F00',
    pais: '',
    region: '',
    email_contacto: '',
    telefono: '',
    sitio_web: ''
  })

  useEffect(() => {
    if (!usuario) {
      navigate('/auth/login')
      return
    }

    const cargarClub = async () => {
      try {
        setLoading(true)
        const clubData = await APIService.get<Club>(`/clubes/${clubId}`)
        setClub(clubData)
        setFormData({
          nombre: clubData.nombre,
          descripcion: clubData.descripcion,
          logo_url: clubData.logo_url,
          color_primario: clubData.color_primario,
          color_secundario: clubData.color_secundario,
          color_acento: clubData.color_acento,
          pais: clubData.pais,
          region: clubData.region,
          email_contacto: clubData.email_contacto,
          telefono: clubData.telefono,
          sitio_web: clubData.sitio_web
        })
      } catch (err) {
        setError('Error al cargar club: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    cargarClub()
  }, [clubId, usuario, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const updateData: ClubUpdate = {}
      
      // Solo incluir campos que fueron modificados
      if (formData.nombre !== club?.nombre) updateData.nombre = formData.nombre
      if (formData.descripcion !== club?.descripcion) updateData.descripcion = formData.descripcion
      if (formData.logo_url !== club?.logo_url) updateData.logo_url = formData.logo_url
      if (formData.color_primario !== club?.color_primario) updateData.color_primario = formData.color_primario
      if (formData.color_secundario !== club?.color_secundario) updateData.color_secundario = formData.color_secundario
      if (formData.color_acento !== club?.color_acento) updateData.color_acento = formData.color_acento
      if (formData.pais !== club?.pais) updateData.pais = formData.pais
      if (formData.region !== club?.region) updateData.region = formData.region
      if (formData.email_contacto !== club?.email_contacto) updateData.email_contacto = formData.email_contacto
      if (formData.telefono !== club?.telefono) updateData.telefono = formData.telefono
      if (formData.sitio_web !== club?.sitio_web) updateData.sitio_web = formData.sitio_web

      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar')
        return
      }

      await APIService.put(`/clubes/${clubId}`, updateData)
      
      setSuccess('Club actualizado exitosamente')
      setTimeout(() => {
        navigate(`/clubes/${clubId}`)
      }, 1500)
    } catch (err) {
      setError('Error al guardar cambios: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!usuario) return null

  if (loading) {
    return (
      <div className="club-edit-layout">
        <Navbar usuario={usuario} onLogout={logout} />
        <main className="club-edit-main">
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error && !club) {
    return (
      <div className="club-edit-layout">
        <Navbar usuario={usuario} onLogout={logout} />
        <main className="club-edit-main">
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}`)}>
            Volver
          </button>
        </main>
      </div>
    )
  }

  return (
    <>
      <Navbar />

      <main className="club-edit-main">
        <div className="club-edit-container">
          <div className="edit-header">
            <button 
              className="btn btn-back"
              onClick={() => navigate(`/clubes/${clubId}`)}
            >
              ← Volver
            </button>
            <h1>Editar Club</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="club-edit-form">
            {/* Información Básica */}
            <section className="form-section">
              <h2>Información Básica</h2>
              
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Club</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows={4}
                  placeholder="Describir el club..."
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="logo_url">URL del Logo</label>
                <input
                  type="url"
                  id="logo_url"
                  name="logo_url"
                  value={formData.logo_url || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </section>

            {/* Colores */}
            <section className="form-section">
              <h2>Colores</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="color_primario">
                    Color Primario
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_primario"
                      name="color_primario"
                      value={formData.color_primario}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_primario}
                      onChange={handleColorChange}
                      name="color_primario"
                      className="form-input color-value"
                      placeholder="#FF6B35"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="color_secundario">
                    Color Secundario
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_secundario"
                      name="color_secundario"
                      value={formData.color_secundario}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_secundario}
                      onChange={handleColorChange}
                      name="color_secundario"
                      className="form-input color-value"
                      placeholder="#004E89"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="color_acento">
                    Color Acento
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_acento"
                      name="color_acento"
                      value={formData.color_acento}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_acento}
                      onChange={handleColorChange}
                      name="color_acento"
                      className="form-input color-value"
                      placeholder="#F77F00"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Información de Contacto */}
            <section className="form-section">
              <h2>Información de Contacto</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pais">País</label>
                  <input
                    type="text"
                    id="pais"
                    name="pais"
                    value={formData.pais || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="España"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="region">Región/Provincia</label>
                  <input
                    type="text"
                    id="region"
                    name="region"
                    value={formData.region || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Madrid"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email_contacto">Email de Contacto</label>
                  <input
                    type="email"
                    id="email_contacto"
                    name="email_contacto"
                    value={formData.email_contacto || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="contacto@club.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="+34 91 234 5678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sitio_web">Sitio Web</label>
                <input
                  type="url"
                  id="sitio_web"
                  name="sitio_web"
                  value={formData.sitio_web || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://www.club.com"
                />
              </div>
            </section>

            {/* Botones */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/clubes/${clubId}`)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
