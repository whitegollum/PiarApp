import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import SocioService, { Socio } from '../services/socioService'
import { NewsService, EventService } from '../services/contentService'
import { Noticia, Evento } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import Navbar from '../components/Navbar'
import NewsList from '../components/NewsList'
import EventList from '../components/EventList'
import OpenClawChat from '../components/OpenClawChat'
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
  latitud?: number
  longitud?: number
}

interface Miembro {
  id: number
  usuario_id: number
  club_id: number
  rol: string
  estado: string
  usuario?: {
    id: number
    email: string
    nombre_completo: string
  }
}

interface ContrasenaData {
  codigo: string
  descripcion: string
  activa: boolean
  fecha_creacion: string
}

interface RecentContentItem {
  tipo: "noticia" | "evento" | "producto"
  id: number
  titulo: string
  descripcion: string | null
  fecha: string
}

export default function ClubDetail() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)
  
  const [club, setClub] = useState<Club | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [socios, setSocios] = useState<Record<number, Socio>>({})
  const [socioPhotoUrls, setSocioPhotoUrls] = useState<Record<number, string>>({})
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [contenidoReciente, setContenidoReciente] = useState<RecentContentItem[]>([])
  const [instalacionPass, setInstalacionPass] = useState<ContrasenaData | null>(null)
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'resumen' | 'miembros' | 'noticias' | 'eventos' | 'productos'>('resumen')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  const canEdit = role === 'administrador' || usuario?.es_superadmin;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (dropdownOpen && !target.closest('.club-actions-dropdown')) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const cargarDatos = async () => {
      try {
        setLoading(true)
        const id = parseInt(clubId)
        
        // Cargar todo en paralelo
        const [clubData, miembrosData, sociosList, noticiasData, eventosData, contenidoRecienteData] = await Promise.all([
          APIService.get<Club>(`/clubes/${id}`),
          APIService.get<Miembro[]>(`/clubes/${id}/miembros`),
          SocioService.getSociosByClub(id).catch(() => []) as Promise<Socio[]>,
          NewsService.getAll(id, 0, 5),    // Traer últimos 5
          EventService.getAll(id, 0, 5),    // Traer últimos 5
          APIService.get<RecentContentItem[]>(`/clubes/${id}/contenido-reciente`).catch(() => [])
        ])
        
        setClub(clubData)
        setMiembros(miembrosData)
        const sociosMap = sociosList.reduce<Record<number, Socio>>((acc, socio) => {
          acc[socio.usuario_id] = socio
          return acc
        }, {})
        setSocios(sociosMap)
        setNoticias(noticiasData)
        setEventos(eventosData)
        setContenidoReciente(contenidoRecienteData)

        // Try to fetch facility password if member
        // (This might fail with 403 if not member or 404 if not set, so we handle it separately to not block page load)
        try {
          const passData = await APIService.get<ContrasenaData>(`/clubes/${id}/instalacion/password`)
          // Fetch weather if location available
        if (clubData.latitud && clubData.longitud) {
          try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${clubData.latitud}&longitude=${clubData.longitud}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=Europe/Madrid`
            const weatherRes = await fetch(weatherUrl)
            const weatherJson = await weatherRes.json()
            setWeather(weatherJson.current || weatherJson.current_weather)
          } catch (e) {
            console.error("Error fetching weather", e)
          }
        }
        
        setInstalacionPass(passData)
        } catch (err) {
          // Ignore 404 or 403 for this specific part
          console.log("No facility password available or access denied")
        }

      } catch (error) {
        console.error("Error loading club data:", error)
        setError('Error al cargar datos del club')
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [clubId, usuario, navigate])

  useEffect(() => {
    let isActive = true

    const loadPhotos = async () => {
      const sociosWithPhoto = Object.values(socios).filter((socio) => socio.tiene_foto)

      if (sociosWithPhoto.length === 0) {
        setSocioPhotoUrls((prev) => {
          Object.values(prev).forEach((url) => URL.revokeObjectURL(url))
          return {}
        })
        return
      }

      const results = await Promise.all(
        sociosWithPhoto.map(async (socio) => [
          socio.usuario_id,
          await SocioService.fetchFotoBlob(socio.id)
        ] as const)
      )

      if (!isActive) {
        results.forEach(([, url]) => {
          if (url) URL.revokeObjectURL(url)
        })
        return
      }

      setSocioPhotoUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url))
        const next: Record<number, string> = {}
        results.forEach(([userId, url]) => {
          if (url) {
            next[userId] = url
          }
        })
        return next
      })
    }

    loadPhotos()

    return () => {
      isActive = false
    }
  }, [socios])

  if (!usuario) return null


  if (loading) {
    return (
      <div className="club-detail-layout">
        <Navbar />
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
         <Navbar />
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
            <div className="club-info">
              <div className="club-title-row">
                <div>
                  <h1>{club.nombre}</h1>
                  <p className="club-slug">{club.slug}</p>
                </div>
                <div className="club-actions-dropdown">
                  <button 
                    className="btn btn-secondary btn-sm dropdown-trigger"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    ⚙️ Acciones ▾
                  </button>
                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      {canEdit && (
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            navigate(`/clubes/${clubId}/editar`)
                            setDropdownOpen(false)
                          }}
                        >
                          ✏️ Editar Club
                        </button>
                      )}
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          navigate(`/clubes/${clubId}/miembros`)
                          setDropdownOpen(false)
                        }}
                      >
                        👥 Administrar miembros
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          navigate(`/clubes/${clubId}/noticias/crear`)
                          setDropdownOpen(false)
                        }}
                      >
                        📰 Añadir noticia
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          navigate(`/clubes/${clubId}/eventos/crear`)
                          setDropdownOpen(false)
                        }}
                      >
                        📅 Añadir evento
                      </button>
                      {canEdit && (
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            navigate(`/clubes/${clubId}/productos/admin`)
                            setDropdownOpen(false)
                          }}
                        >
                          🛒 Administrar Productos
                        </button>
                      )}
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          setDropdownOpen(false)
                          // TODO: Navegar a editar contraseña
                        }}
                      >
                        🔒 Editar contraseña de acceso
                      </button>
                    </div>
                  )}
                </div>
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
            <button
              className={`tab ${tab === 'eventos' ? 'active' : ''}`}
              onClick={() => setTab('eventos')}
            >
              Eventos ({eventos.length})
            </button>
            <button
              className={`tab ${tab === 'productos' ? 'active' : ''}`}
              onClick={() => navigate(`/clubes/${clubId}/productos`)}
            >
              🛒 Tienda
            </button>
          </div>

          {/* Contenido */}
          <div className="club-content">
            {tab === 'resumen' && (
              <div className="tab-content">
                
                {/* Facility Password Section */}
                {instalacionPass && (
                  <div className="facility-access-section">
                    <h3>🔑 Código de Acceso</h3>
                    <div className="access-code-container">
                      <div className="access-code">{instalacionPass.codigo}</div>
                      <p className="access-desc">{instalacionPass.descripcion || 'Contraseña actual de las instalaciones'}</p>
                    </div>
                  </div>
                )}

                {/* Weather Widget */}
                {weather && (
                  <div className="weather-widget-container" style={{ 
                    marginTop: '0', 
                    marginBottom: '2rem',
                    padding: '1.5rem', 
                    background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}>
                    <h3 style={{ marginTop: 0, color: '#006064', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🌤️ Condiciones Actuales
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      <div className="weather-item">
                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#00838f', marginBottom: '0.25rem' }}>Viento</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#006064' }}>
                          {weather.wind_speed_10m ?? weather.windspeed} <span style={{ fontSize: '1rem' }}>km/h</span>
                        </span>
                      </div>
                      
                      {weather.wind_gusts_10m !== undefined && (
                        <div className="weather-item">
                          <span style={{ display: 'block', fontSize: '0.85rem', color: '#00838f', marginBottom: '0.25rem' }}>Ráfagas</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#006064' }}>
                            {weather.wind_gusts_10m} <span style={{ fontSize: '1rem' }}>km/h</span>
                          </span>
                        </div>
                      )}

                      <div className="weather-item">
                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#00838f', marginBottom: '0.25rem' }}>Dirección</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#006064', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ transform: `rotate(${weather.wind_direction_10m ?? weather.winddirection}deg)`, display: 'inline-block' }}>⬇</span>
                          {weather.wind_direction_10m ?? weather.winddirection}°
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Novedades Recientes */}
                {contenidoReciente.length > 0 && (
                  <div className="recent-content-section">
                    <h3 className="recent-content-header">🆕 Novedades Recientes</h3>
                    <div className="recent-content-grid">
                      {contenidoReciente.map((item) => {
                        const badgeEmoji = item.tipo === 'noticia' ? '📰' : item.tipo === 'evento' ? '📅' : '🛒'
                        const badgeColor = item.tipo === 'noticia' ? '#2196F3' : item.tipo === 'evento' ? '#4CAF50' : '#FF9800'
                        
                        return (
                          <div
                            key={`${item.tipo}-${item.id}`}
                            className="recent-content-card"
                            onClick={() => {
                              if (item.tipo === 'noticia') {
                                navigate(`/clubes/${clubId}/noticias`)
                              } else if (item.tipo === 'evento') {
                                navigate(`/clubes/${clubId}/eventos`)
                              } else if (item.tipo === 'producto') {
                                navigate(`/clubes/${clubId}/productos`)
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="recent-content-badge" style={{ backgroundColor: badgeColor }}>
                              {badgeEmoji} {item.tipo === 'noticia' ? 'Noticia' : item.tipo === 'evento' ? 'Evento' : 'Producto'}
                            </div>
                            <h4 className="recent-content-title">{item.titulo}</h4>
                            {item.descripcion && (
                              <p className="recent-content-description">{item.descripcion}</p>
                            )}
                            <div className="recent-content-date">
                              {new Date(item.fecha).toLocaleDateString('es-ES', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

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

                <div style={{ marginTop: '2rem' }}>
                  <OpenClawChat clubId={club.id} clubName={club.nombre} />
                </div>
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
                          {socioPhotoUrls[miembro.usuario_id] ? (
                            <img
                              src={socioPhotoUrls[miembro.usuario_id]}
                              alt={`Foto de ${miembro.usuario?.nombre_completo || 'socio'}`}
                            />
                          ) : (
                            (miembro.usuario?.nombre_completo || miembro.usuario?.email || `Usuario #${miembro.usuario_id}`)
                              .charAt(0)
                              .toUpperCase()
                          )}
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
                <div className="content-header-row">
                  <h3>Últimas Noticias</h3>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/clubes/${clubId}/noticias`)}>Ver Todas</button>
                </div>
                <NewsList noticias={noticias} clubId={club.id} canEdit={canEdit} />
              </div>
            )}

            {tab === 'eventos' && (
              <div className="tab-content">
                <div className="content-header-row">
                   <h3>Próximos Eventos</h3>
                   <button className="btn btn-sm btn-primary" onClick={() => navigate(`/clubes/${clubId}/eventos`)}>Ver Calendario</button>
                </div>
                <EventList eventos={eventos} clubId={club.id} canEdit={canEdit} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
