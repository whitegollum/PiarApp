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
  Radio, Key, Sparkles, Siren, Star, ShoppingBag, PlaneLanding, Plane, Trophy, Medal,
  AlertTriangle, ChevronRight, Bot
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
  const [chatOpen, setChatOpen] = useState(false)

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

  // Derived data for resumen tab
  const miCanal = canalPanel?.canales.find(c => c.usuarios.some(u => u.usuario_id === usuario?.id))
  const yoVolando = miCanal?.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo) ?? false
  const otroVolando = (miCanal?.en_vuelo && !yoVolando) ?? false
  const pilotsEnVuelo = miCanal?.usuarios.filter(u => u.en_vuelo).length ?? 0
  const miRanking = ranking.find(e => e.usuario_id === usuario?.id)
  const ahora = new Date()
  const proximoEvento = [...eventos]
    .filter(e => new Date(e.fecha_inicio) > ahora)
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())[0]
  const diasParaEvento = proximoEvento
    ? Math.ceil((new Date(proximoEvento.fecha_inicio).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const tareasAbiertasCount = tareas.filter(t => t.estado === 'abierta').length
  const gustsAltas = weather?.wind_gusts_10m !== undefined && weather.wind_gusts_10m > 40

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

                {/* Hero Operacional Unificado */}
                {(canalPanel || weather || instalacionPass) && (
                  <div className={`hero-operacional${otroVolando ? ' hero-alerta' : ''}`}>
                    {canalPanel && (
                      <div className="hero-canal-header" onClick={() => navigate(`/clubes/${clubId}/canales`)}>
                        <Radio size={15} />
                        <span>
                          {miCanal
                            ? <><strong>Canal {miCanal.canal_numero}</strong>{pilotsEnVuelo > 0 && ` · ${pilotsEnVuelo} piloto${pilotsEnVuelo > 1 ? 's' : ''} en vuelo`}</>
                            : <span className="hero-canal-vacio">Sin canal asignado</span>
                          }
                        </span>
                        <ChevronRight size={14} />
                      </div>
                    )}

                    {weather && (
                      <div className="hero-weather-grid">
                        <div className="hero-stat">
                          <span className="hero-stat-label">VIENTO</span>
                          <span className="hero-stat-value">
                            {weather.wind_speed_10m ?? weather.windspeed}
                            <span className="hero-stat-unit"> km/h</span>
                          </span>
                        </div>
                        {weather.wind_gusts_10m !== undefined && (
                          <div className="hero-stat">
                            <span className="hero-stat-label">RÁFAGAS</span>
                            <span className={`hero-stat-value${gustsAltas ? ' hero-stat-warn' : ''}`}>
                              {weather.wind_gusts_10m}
                              <span className="hero-stat-unit"> km/h</span>
                            </span>
                          </div>
                        )}
                        <div className="hero-stat">
                          <span className="hero-stat-label">DIRECCIÓN</span>
                          <span className="hero-stat-value">
                            <span style={{ transform: `rotate(${weather.wind_direction_10m ?? weather.winddirection}deg)`, display: 'inline-block' }}>↓</span>
                            {' '}{weather.wind_direction_10m ?? weather.winddirection}°
                          </span>
                        </div>
                      </div>
                    )}

                    {gustsAltas && (
                      <div className="hero-safety-alert">
                        <AlertTriangle size={14} /> Ráfagas elevadas. Vuela con cautela.
                      </div>
                    )}

                    {otroVolando && (
                      <div className="hero-safety-alert hero-safety-critical">
                        <Siren size={14} /> {miCanal?.piloto_volando} está volando — NO volar
                      </div>
                    )}

                    <div className="hero-footer">
                      {instalacionPass && (
                        <span className="hero-access-code">
                          <Key size={13} /> Acceso · {instalacionPass.codigo}
                        </span>
                      )}
                      {miCanal && (
                        <button
                          className={`btn-avolar${yoVolando ? ' btn-aterrizar' : ''}`}
                          disabled={otroVolando}
                          onClick={() => {
                            if (!clubId || !miCanal) return
                            CanalesService.toggleVuelo(parseInt(clubId), miCanal.canal_numero)
                              .then(setCanalPanel)
                              .catch(() => {})
                          }}
                        >
                          {yoVolando ? <><PlaneLanding size={15} /> Aterrizar</> : <><Plane size={15} /> A volar</>}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tu Actividad */}
                {(miRanking || proximoEvento || tareasAbiertasCount > 0) && (
                  <div className="actividad-section">
                    <h3 className="section-label">TU ACTIVIDAD</h3>

                    {miRanking && (
                      <button className="actividad-row" onClick={() => navigate(`/clubes/${clubId}/ranking`)}>
                        <span className="actividad-icon-wrap actividad-icon-gold"><Trophy size={16} /></span>
                        <span className="actividad-text">
                          Estás {miRanking.posicion}º en el ranking
                          {miRanking.puntos_totales > 0 && ` · ${miRanking.puntos_totales} pts`}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    )}

                    {proximoEvento && diasParaEvento !== null && (
                      <button className="actividad-row" onClick={() => navigate(`/clubes/${clubId}/eventos`)}>
                        <span className="actividad-icon-wrap actividad-icon-blue"><Calendar size={16} /></span>
                        <span className="actividad-text">
                          {proximoEvento.nombre}
                          {diasParaEvento === 0 ? ' · hoy' : diasParaEvento === 1 ? ' · mañana' : ` · en ${diasParaEvento} días`}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    )}

                    {tareasAbiertasCount > 0 && (
                      <button className="actividad-row" onClick={() => navigate(`/clubes/${clubId}/tareas`)}>
                        <span className="actividad-icon-wrap actividad-icon-green"><Wrench size={16} /></span>
                        <span className="actividad-text">
                          {tareasAbiertasCount} tarea{tareasAbiertasCount > 1 ? 's' : ''} abierta{tareasAbiertasCount > 1 ? 's' : ''} a la que puedes apuntarte
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* Novedades Recientes — formato compacto */}
                {contenidoReciente.length > 0 && (
                  <div className="novedades-section">
                    <div className="novedades-header">
                      <h3 className="section-label">NOVEDADES RECIENTES</h3>
                      <button className="novedades-ver-todo" onClick={() => navigate(`/clubes/${clubId}/noticias`)}>
                        Ver todo →
                      </button>
                    </div>
                    <div className="novedades-list">
                      {contenidoReciente.slice(0, 5).map((item) => {
                        const badgeLabel = item.tipo === 'noticia' ? 'Noticia' : item.tipo === 'evento' ? 'Evento' : 'Producto'
                        const diff = Math.floor((ahora.getTime() - new Date(item.fecha).getTime()) / (1000 * 60 * 60 * 24))
                        const fechaStr = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : diff < 7 ? `Hace ${diff} días` : new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        return (
                          <button
                            key={`${item.tipo}-${item.id}`}
                            className="novedad-row"
                            onClick={() => {
                              if (item.tipo === 'noticia') navigate(`/clubes/${clubId}/noticias`)
                              else if (item.tipo === 'evento') navigate(`/clubes/${clubId}/eventos`)
                              else navigate(`/clubes/${clubId}/productos`)
                            }}
                          >
                            <span className={`novedad-badge novedad-badge-${item.tipo}`}>{badgeLabel}</span>
                            <span className="novedad-titulo">{item.titulo}</span>
                            <span className="novedad-fecha">{fechaStr}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Cámara — al fondo, manejo de estados */}
                {club.rtsp_url ? (
                  <div className="camara-section">
                    <RTSPViewer url={club.rtsp_url} title={`Cámara ${club.nombre}`} />
                  </div>
                ) : canEdit ? (
                  <button className="camara-placeholder" onClick={() => navigate(`/clubes/${clubId}/editar`)}>
                    Configura la cámara →
                  </button>
                ) : null}

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

      {/* Flybot FAB */}
      <button
        className="chat-fab"
        onClick={() => setChatOpen(true)}
        title="Flybot — Asistente del club"
      >
        <Bot size={22} />
      </button>

      {/* Chat overlay */}
      {chatOpen && (
        <div
          className="chat-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setChatOpen(false) }}
        >
          <div className="chat-overlay-panel">
            <ChatPanel
              clubId={club.id}
              clubName={club.nombre}
              initialExpanded={true}
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
