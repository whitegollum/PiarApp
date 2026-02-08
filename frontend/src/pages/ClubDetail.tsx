import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion?: string
  fecha_creacion: string
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

interface Miembro {
  id: number
  usuario_id: number
  club_id: number
  rol: string
  estado: string
}

interface Noticia {
  id: number
  titulo: string
  contenido: string
  fecha_creacion: string
  autor?: {
    id: number
    email: string
    nombre_completo: string
  }
}

export default function ClubDetail() {
  const { usuario, logout } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [club, setClub] = useState<Club | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'resumen' | 'miembros' | 'noticias'>('resumen')

  useEffect(() => {
    if (!usuario) {
      navigate('/auth/login')
      return
    }

    const cargarDatos = async () => {
      try {
        setLoading(true)
        const [clubData, miembrosData, noticiasData] = await Promise.all([
          APIService.get<Club>(`/clubes/${clubId}`),
          APIService.get<Miembro[]>(`/clubes/${clubId}/miembros`),
          APIService.get<Noticia[]>(`/clubes/${clubId}/noticias`)
        ])
        setClub(clubData)
        setMiembros(miembrosData)
        setNoticias(noticiasData)
      } catch (error) {
        setError('Error al cargar club: ' + (error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [clubId, usuario, navigate])

  if (!usuario) return null

  if (loading) {
    return (
      <div className="club-detail-layout">
        <Navbar usuario={usuario} onLogout={logout} />
        <main className="club-detail-main">
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !club) {
    return (
      <div className="club-detail-layout">
        <Navbar usuario={usuario} onLogout={logout} />
        <main className="club-detail-main">
          <div className="alert alert-error">{error || 'Club no encontrado'}</div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Volver al Dashboard
          </button>
        </main>
      </div>
    )
  }

  return (
    <>
      <Navbar />

      <main className="club-detail-main">
        <div className="club-detail-container">
          {/* Header del club */}
          <div className="club-detail-header">
            <button 
              className="btn btn-back"
              onClick={() => navigate('/')}
            >
              ← Volver
            </button>
            <div className="club-info">
              <div className="club-title-row">
                <div>
                  <h1>{club.nombre}</h1>
                  <p className="club-slug">{club.slug}</p>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/clubes/${clubId}/editar`)}
                >
                  ✏️ Editar
                </button>
              </div>
              {club.descripcion && (
                <p className="club-description">{club.descripcion}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="club-tabs">
            <button
              className={`tab ${tab === 'resumen' ? 'active' : ''}`}
              onClick={() => setTab('resumen')}
            >
              Resumen
            </button>
            <button
              className={`tab ${tab === 'miembros' ? 'active' : ''}`}
              onClick={() => setTab('miembros')}
            >
              Miembros ({miembros.length})
            </button>
            <button
              className={`tab ${tab === 'noticias' ? 'active' : ''}`}
              onClick={() => setTab('noticias')}
            >
              Noticias ({noticias.length})
            </button>
          </div>

          {/* Contenido */}
          <div className="club-content">
            {tab === 'resumen' && (
              <div className="tab-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{miembros.length}</div>
                    <div className="stat-label">Miembros</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{noticias.length}</div>
                    <div className="stat-label">Noticias</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">0</div>
                    <div className="stat-label">Eventos</div>
                  </div>
                </div>
                <div className="action-buttons">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate(`/clubes/${clubId}/miembros`)}
                  >
                    👥 Administrar Miembros
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate(`/clubes/${clubId}/noticias`)}
                  >
                    📰 Gestionar Noticias
                  </button>
                </div>

                {/* Información de Contacto */}
                {(club.pais || club.region || club.email_contacto || club.telefono || club.sitio_web) && (
                  <div className="contact-section">
                    <h3>Información de Contacto</h3>
                    <div className="contact-grid">
                      {club.pais && (
                        <div className="contact-item">
                          <span className="contact-label">🌍 País</span>
                          <span className="contact-value">{club.pais}</span>
                        </div>
                      )}
                      {club.region && (
                        <div className="contact-item">
                          <span className="contact-label">📍 Región</span>
                          <span className="contact-value">{club.region}</span>
                        </div>
                      )}
                      {club.email_contacto && (
                        <div className="contact-item">
                          <span className="contact-label">📧 Email</span>
                          <a href={`mailto:${club.email_contacto}`} className="contact-value link">
                            {club.email_contacto}
                          </a>
                        </div>
                      )}
                      {club.telefono && (
                        <div className="contact-item">
                          <span className="contact-label">📱 Teléfono</span>
                          <a href={`tel:${club.telefono}`} className="contact-value link">
                            {club.telefono}
                          </a>
                        </div>
                      )}
                      {club.sitio_web && (
                        <div className="contact-item">
                          <span className="contact-label">🌐 Sitio Web</span>
                          <a href={club.sitio_web} target="_blank" rel="noopener noreferrer" className="contact-value link">
                            {club.sitio_web}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'miembros' && (
              <div className="tab-content">
                <div className="miembros-header">
                  <p>Mostrando {miembros.length} miembros</p>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/clubes/${clubId}/miembros`)}
                  >
                    Ver Más →
                  </button>
                </div>
                <div className="miembros-list">
                  {miembros.slice(0, 5).map(miembro => (
                    <div key={miembro.id} className="miembro-item">
                      <div className="miembro-info">
                        <div className="miembro-avatar">
                          {(miembro.usuario?.nombre_completo || miembro.usuario?.email || `Usuario #${miembro.usuario_id}`)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="miembro-name">
                            {miembro.usuario?.nombre_completo || miembro.usuario?.email || `Usuario #${miembro.usuario_id}`}
                          </div>
                          <div className="miembro-email">Rol: {miembro.rol}</div>
                        </div>
                      </div>
                      <span className={`status ${miembro.estado}`}>
                        {miembro.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'noticias' && (
              <div className="tab-content">
                {noticias.length > 0 ? (
                  <div className="noticias-list">
                    {noticias.map(noticia => (
                      <div key={noticia.id} className="noticia-item">
                        <h3>{noticia.titulo}</h3>
                        <p className="noticia-content">{noticia.contenido}</p>
                        <div className="noticia-meta">
                          <span>
                            Por: {noticia.autor?.nombre_completo || noticia.autor?.email || 'Autor desconocido'}
                          </span>
                          <span>
                            {new Date(noticia.fecha_creacion).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <p>No hay noticias aún</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
