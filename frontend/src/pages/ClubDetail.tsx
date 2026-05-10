import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import SocioService, { Socio } from '../services/socioService'
import { NewsService, EventService } from '../services/contentService'
import { alertaService } from '../services/alertaService'
import { TareasService, RankingService, TareaComunitaria, RankingEntry } from '../services/tareasComunitariasService'
import { Noticia, Evento, ProductoAfiliacion } from '../types/models'
import { ProductoService } from '../services/productoService'
import { affiliateUrl } from '../utils/affiliate'
import { useClubRole } from '../hooks/useClubRole'
import { CanalesService, CanalesPanel } from '../services/canalesService'
import {
  Home, Users, Newspaper, Calendar, ShoppingCart, Wrench,
  Radio, Key, Cloud, Sparkles, Tag, FileText, Globe, Smartphone,
  Siren, Star, ShoppingBag, PlaneLanding, Plane, Trophy, Medal
} from 'lucide-react'
import NewsList from '../components/NewsList'
import EventList from '../components/EventList'
import ChatPanel from '../components/ChatPanel'
import RTSPViewer from '../components/RTSPViewer'
import '../styles/ClubDetail.css'
import '../styles/Canales.css'

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
  rtsp_url?: string
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
  const [canalPanel, setCanalPanel] = useState<CanalesPanel | null>(null)
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'resumen' | 'miembros' | 'noticias' | 'eventos' | 'productos' | 'tareas'>('resumen')
  const [totalAlertas, setTotalAlertas] = useState(0)
  const [alertasPorUsuario, setAlertasPorUsuario] = useState<Record<number, number>>({})
  const [tareas, setTareas] = useState<TareaComunitaria[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [productos, setProductos] = useState<ProductoAfiliacion[]>([])
  
  const canEdit = role === 'administrador' || usuario?.es_superadmin;

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

        // Cargar tareas comunitarias y ranking
        try {
          const [tareasData, rankingData] = await Promise.all([
            TareasService.listar(id),
            RankingService.obtener(id)
          ])
          setTareas(tareasData)
          setRanking(rankingData)
        } catch (err) {
          console.log('No se pudieron cargar tareas/ranking:', err)
        }

        // Cargar productos de afiliación
        try {
          const productosData = await ProductoService.getAll(id, undefined, true, false)
          setProductos(productosData.productos)
        } catch (err) {
          console.log('No se pudieron cargar productos:', err)
        }

        // Cargar panel de canales
        try {
          const canalesData = await CanalesService.obtenerPanel(id)
          setCanalPanel(canalesData)
        } catch (err) {
          console.log('No se pudieron cargar canales:', err)
        }

        // Cargar contador de alertas si es admin o superadmin
        if (canEdit) {
          try {
            const contadorAlertas = await alertaService.obtenerContadorAlertas(id)
            setTotalAlertas(contadorAlertas.total || 0)
            
            // Cargar alertas por usuario para badges en pestaña miembros
            const alertasPorUsuarioData = await alertaService.obtenerAlertasPorUsuario(id)
            setAlertasPorUsuario(alertasPorUsuarioData)
          } catch (err) {
            console.log('No se pudieron cargar las alertas:', err)
          }
        }

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

  // Polling de canales cada 5 segundos
  useEffect(() => {
    if (!clubId) return
    const interval = setInterval(async () => {
      try {
        const data = await CanalesService.obtenerPanel(parseInt(clubId))
        setCanalPanel(data)
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [clubId])

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

  // Fondo rojo cuando el usuario está volando
  const yoVolandoGlobal = canalPanel?.canales.some(c =>
    c.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)
  ) ?? false

  useEffect(() => {
    if (yoVolandoGlobal) {
      document.body.style.backgroundColor = '#dc2626'
    } else {
      document.body.style.backgroundColor = ''
    }
    return () => { document.body.style.backgroundColor = '' }
  }, [yoVolandoGlobal])

  if (!usuario) return null


  if (loading) {
    return (
      <div className="club-detail-layout">
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
        <main className="club-detail-main">
          <div className="alert alert-error">{error || 'Club no encontrado'}</div>
          <button className="btn btn-primary" onClick={() => navigate('/', { state: { fromHomeButton: true } })}>
            Volver al Dashboard
          </button>
        </main>
      </div>
    )
  }

  return (
    <>

      <main className="club-detail-main">
        <div className="club-detail-container">
          {/* Tabs */}
          <div className="club-tabs">
            <button
              className={`tab ${tab === 'resumen' ? 'active' : ''}`}
              onClick={() => setTab('resumen')}
            >
              <Home size={16} /> <span className="tab-text">Resumen</span>
            </button>
            <button
              className={`tab ${tab === 'miembros' ? 'active' : ''}`}
              onClick={() => setTab('miembros')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> <span className="tab-text">Miembros</span> ({miembros.length})</span>
              {totalAlertas > 0 && (
                <span
                  style={{
                    background: '#ff4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                  }}
                >
                  {totalAlertas}
                </span>
              )}
            </button>
            <button
              className={`tab ${tab === 'noticias' ? 'active' : ''}`}
              onClick={() => setTab('noticias')}
            >
              <Newspaper size={16} /> <span className="tab-text">Noticias</span> ({noticias.length})
            </button>
            <button
              className={`tab ${tab === 'eventos' ? 'active' : ''}`}
              onClick={() => setTab('eventos')}
            >
              <Calendar size={16} /> <span className="tab-text">Eventos</span> ({eventos.length})
            </button>
            <button
              className={`tab ${tab === 'productos' ? 'active' : ''}`}
              onClick={() => setTab('productos')}
            >
              <ShoppingCart size={16} /> <span className="tab-text">Tienda</span> ({productos.length})
            </button>
            <button
              className={`tab ${tab === 'tareas' ? 'active' : ''}`}
              onClick={() => setTab('tareas')}
            >
              <Wrench size={16} /> <span className="tab-text">Tareas</span>
            </button>
          </div>

          {/* Contenido */}
          <div className="club-content">
            {tab === 'resumen' && (
              <div className="tab-content">
                
                {/* Canal de Vuelo Widget */}
                {canalPanel && (() => {
                  const miCanal = canalPanel.canales.find(c => c.usuarios.some(u => u.usuario_id === usuario?.id))
                  const otroVolando = miCanal?.en_vuelo && !miCanal.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)
                  const yoVolando = miCanal?.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)

                  return (
                    <div
                      className="canal-vuelo-widget"
                      style={{ background: otroVolando ? '#fef2f2' : undefined, borderColor: otroVolando ? '#dc2626' : undefined }}
                      onClick={() => navigate(`/clubes/${clubId}/canales`)}
                    >
                      <div className="canal-widget-info">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Radio size={18} /> Canal de Vuelo</h3>
                        {miCanal ? (
                          <p className="canal-widget-estado">
                            Estás en <strong>Canal {miCanal.canal_numero}</strong>
                            {miCanal.usuarios.length > 1 && ` · ${miCanal.usuarios.length} pilotos`}
                          </p>
                        ) : (
                          <p className="canal-widget-estado canal-widget-vacio">No estás en ningún canal</p>
                        )}
                        {otroVolando && (
                          <p className="canal-widget-alerta"><Siren size={14} /> {miCanal?.piloto_volando} está volando — NO volar</p>
                        )}
                      </div>
                      {miCanal && (
                        <button
                          className={`btn-canal-vuelo-widget ${yoVolando ? 'volando' : ''} ${otroVolando ? 'bloqueado' : ''}`}
                          disabled={otroVolando || false}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!clubId || !miCanal) return
                            CanalesService.toggleVuelo(parseInt(clubId), miCanal.canal_numero)
                              .then(setCanalPanel)
                              .catch(() => {})
                          }}
                        >
                          {yoVolando ? <><PlaneLanding size={16} /> Aterrizar</> : <><Plane size={16} /> A volar</>}
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Facility Password Section */}
                {instalacionPass && (
                  <div className="facility-access-section">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={18} /> Código de Acceso</h3>
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
                      <Cloud size={18} /> Condiciones Actuales
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
                    <h3 className="recent-content-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={18} /> Novedades Recientes</h3>
                    <div className="recent-content-grid">
                      {contenidoReciente.map((item) => {
                        const badgeIcon = item.tipo === 'noticia' ? 'Noticia' : item.tipo === 'evento' ? 'Evento' : 'Producto'
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
                              {badgeIcon}
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
                {(club.slug || club.descripcion || club.pais || club.region || club.email_contacto || club.telefono || club.sitio_web) && (
                  <div className="contact-section">
                    <h3>Información de Contacto</h3>
                    <div className="contact-grid">
                      {club.slug && (
                        <div className="contact-item">
                          <span className="contact-label"><Tag size={14} /> Identificador</span>
                          <span className="contact-value">{club.slug}</span>
                        </div>
                      )}
                      {club.descripcion && (
                        <div className="contact-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="contact-label"><FileText size={14} /> Descripción</span>
                          <span className="contact-value">{club.descripcion}</span>
                        </div>
                      )}
                      {club.pais && (
                        <div className="contact-item">
                          <span className="contact-label"><Globe size={14} /> País</span>
                          <span className="contact-value">{club.pais}</span>
                        </div>
                      )}
                      {club.region && (
                        <div className="contact-item">
                          <span className="contact-label"><Globe size={14} /> Región</span>
                          <span className="contact-value">{club.region}</span>
                        </div>
                      )}
                      {club.email_contacto && (
                        <div className="contact-item">
                          <span className="contact-label"><Smartphone size={14} /> Email</span>
                          <a href={`mailto:${club.email_contacto}`} className="contact-value link">
                            {club.email_contacto}
                          </a>
                        </div>
                      )}
                      {club.telefono && (
                        <div className="contact-item">
                          <span className="contact-label"><Smartphone size={14} /> Teléfono</span>
                          <a href={`tel:${club.telefono}`} className="contact-value link">
                            {club.telefono}
                          </a>
                        </div>
                      )}
                      {club.sitio_web && (
                        <div className="contact-item">
                          <span className="contact-label"><Globe size={14} /> Sitio Web</span>
                          <a href={club.sitio_web} target="_blank" rel="noopener noreferrer" className="contact-value link">
                            {club.sitio_web}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cámara en vivo RTSP/HLS */}
                {club.rtsp_url && (
                  <div style={{ marginTop: '2rem' }}>
                    <RTSPViewer url={club.rtsp_url} title={`Cámara ${club.nombre}`} />
                  </div>
                )}

                {canEdit && (
                <div style={{ marginTop: '2rem' }}>
                  <ChatPanel clubId={club.id} clubName={club.nombre} />
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
                    Administrar →
                  </button>
                </div>
                <div className="miembros-list">
                  {miembros.map(miembro => {
                    const numAlertas = alertasPorUsuario[miembro.usuario_id] || 0
                    return (
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
                            <div className="miembro-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{miembro.usuario?.nombre_completo || miembro.usuario?.email || `Usuario #${miembro.usuario_id}`}</span>
                              {numAlertas > 0 && (
                                <button
                                  onClick={() => navigate(`/admin/alertas?club=${clubId}&usuario=${miembro.usuario_id}`)}
                                  title={`${numAlertas} alerta(s) activa(s)`}
                                  style={{
                                    background: '#ff4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '3px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#cc0000'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#ff4444'}
                                >
                                  <Siren size={12} /> {numAlertas}
                                </button>
                              )}
                            </div>
                            <div className="miembro-email">Rol: {miembro.rol}</div>
                          </div>
                        </div>
                        <span className={`status ${miembro.estado}`}>
                          {miembro.estado}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tab === 'noticias' && (
              <div className="tab-content">
                <div className="content-header-row">
                  <h3>Últimas Noticias</h3>
                   <button className="btn btn-sm btn-primary" onClick={() => navigate(`/clubes/${clubId}/noticias`)}>Ver Todas</button>
                </div>
                <NewsList noticias={noticias} clubId={club.id} canEdit={canEdit} />
              </div>
            )}

            {tab === 'eventos' && (
              <div className="tab-content">
                <div className="content-header-row">
                   <h3>Proximos Eventos</h3>
                   <button className="btn btn-sm btn-primary" onClick={() => navigate(`/clubes/${clubId}/eventos`)}>Ver Calendario</button>
                </div>
                <EventList eventos={eventos} clubId={club.id} canEdit={canEdit} />
              </div>
            )}

            {tab === 'productos' && (
              <div className="tab-content">
                <div className="content-header-row">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingBag size={18} /> Tienda de Afiliación</h3>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/clubes/${clubId}/productos`)}
                  >
                    Ver todos los productos
                  </button>
                </div>

                {productos.length === 0 ? (
                  <div className="empty-state-small">
                    <p>No hay productos disponibles en la tienda</p>
                  </div>
                ) : (
                  <>
                    {/* Productos Destacados */}
                    {productos.some(p => p.destacado) && (
                      <div className="productos-tab-section">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={18} /> Productos Destacados</h3>
                        <div className="productos-tab-grid">
                          {productos.filter(p => p.destacado).map(producto => (
                            <div
                              key={producto.id}
                              className="producto-tab-card producto-tab-card-destacado"
                              onClick={() => {
                                ProductoService.registrarClick(parseInt(clubId!), producto.id).catch(() => {})
                                window.open(affiliateUrl(producto.url_afiliacion), '_blank', 'noopener,noreferrer')
                              }}
                            >
                              {producto.imagen_url && (
                                <div className="producto-tab-img">
                                  <img src={producto.imagen_url} alt={producto.nombre} />
                                </div>
                              )}
                              <div className="producto-tab-info">
                                <h4>{producto.nombre}</h4>
                                {producto.proveedor && (
                                  <span className="producto-tab-proveedor">{producto.proveedor}</span>
                                )}
                                {producto.precio_referencia && (
                                  <span className="producto-tab-precio">{producto.precio_referencia}</span>
                                )}
                                {producto.descripcion && (
                                  <p className="producto-tab-desc">{producto.descripcion}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Añadidos Recientemente (no destacados, ordenados por fecha) */}
                    {(() => {
                      const destacadosIds = new Set(productos.filter(p => p.destacado).map(p => p.id))
                      const recientes = productos
                        .filter(p => !destacadosIds.has(p.id))
                        .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
                        .slice(0, 6)
                      
                      if (recientes.length === 0) return null
                      
                      return (
                        <div className="productos-tab-section">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={18} /> Añadidos Recientemente</h3>
                          <div className="productos-tab-grid">
                            {recientes.map(producto => (
                              <div
                                key={producto.id}
                                className="producto-tab-card"
                                onClick={() => {
                                  ProductoService.registrarClick(parseInt(clubId!), producto.id).catch(() => {})
                                  window.open(affiliateUrl(producto.url_afiliacion), '_blank', 'noopener,noreferrer')
                                }}
                              >
                                {producto.imagen_url && (
                                  <div className="producto-tab-img">
                                    <img src={producto.imagen_url} alt={producto.nombre} />
                                  </div>
                                )}
                                <div className="producto-tab-info">
                                  <h4>{producto.nombre}</h4>
                                  {producto.proveedor && (
                                    <span className="producto-tab-proveedor">{producto.proveedor}</span>
                                  )}
                                  {producto.precio_referencia && (
                                    <span className="producto-tab-precio">{producto.precio_referencia}</span>
                                  )}
                                  {producto.descripcion && (
                                    <p className="producto-tab-desc">{producto.descripcion}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            )}

            {tab === 'tareas' && (
              <div className="tab-content">
                <div className="content-header-row">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wrench size={18} /> Tareas Comunitarias</h3>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/clubes/${clubId}/tareas`)}
                  >
                    Ver todas
                  </button>
                </div>

                {/* Ranking Top 3 */}
                {ranking.length > 0 && (
                  <div className="tareas-ranking-summary">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={18} /> Top Ranking</h3>
                    <div className="ranking-podium">
                      {ranking.slice(0, 3).map((entry, index) => {
                        return (
                          <div key={entry.usuario_id} className={`podium-item podium-${index + 1}`}>
                            <span className="podium-medal"><Medal size={20} /></span>
                            <span className="podium-name">{entry.nombre}</span>
                            <span className="podium-points">{entry.puntos_totales} pts</span>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/clubes/${clubId}/ranking`)}
                    >
                      Ver ranking completo
                    </button>
                  </div>
                )}

                {/* Tareas disponibles (top 10) */}
                <div className="tareas-tab-list">
                  <h3>Tareas Disponibles</h3>

                  {tareas.length === 0 ? (
                    <div className="empty-state-small">
                      <p>No hay tareas comunitarias disponibles</p>
                    </div>
                  ) : (
                    <div className="tareas-tab-grid">
                      {tareas.slice(0, 10).map(tarea => {
                        const prioridadColor: Record<string, string> = {
                          alta: '#ef4444', media: '#f59e0b', baja: '#10b981'
                        }
                        const estadoLabel: Record<string, string> = {
                          abierta: 'Abierta', en_progreso: 'En progreso',
                          completada: 'Completada', rechazada: 'Rechazada', expirada: 'Expirada'
                        }
                        return (
                          <div
                            key={tarea.id}
                            className="tarea-tab-card"
                            onClick={() => navigate(`/clubes/${clubId}/tareas/${tarea.id}`)}
                          >
                            <div className="tarea-tab-card-header">
                              <h4 className="tarea-tab-card-title">{tarea.titulo}</h4>
                              <span
                                className="tarea-tab-card-priority"
                                style={{ backgroundColor: prioridadColor[tarea.prioridad] || '#6b7280' }}
                              >
                                {tarea.prioridad}
                              </span>
                            </div>
                            {tarea.descripcion && (
                              <p className="tarea-tab-card-desc">{tarea.descripcion}</p>
                            )}
                            <div className="tarea-tab-card-meta">
                              <span className="tarea-tab-card-points">{tarea.puntos} pts</span>
                              <span className="tarea-tab-card-status">{estadoLabel[tarea.estado] || tarea.estado}</span>
                              <span className="tarea-tab-card-participants">{tarea.num_participantes} participante(s)</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
