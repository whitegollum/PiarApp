import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import '../styles/Dashboard.css'

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion?: string
  fecha_creacion: string
}

interface InvitacionPendiente {
  id: number
  club_id: number
  club?: {
    nombre: string
    slug: string
  }
  email: string
  rol: string
  estado: string
  token: string
  fecha_vencimiento: string
}

export default function Dashboard() {
  const { usuario, logout, isLoading } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([])
  const [cargandoClubs, setCargandoClubs] = useState(true)
  const [cargandoInvitaciones, setCargandoInvitaciones] = useState(true)
  const [error, setError] = useState('')
  const [errorInvitaciones, setErrorInvitaciones] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !usuario) {
      navigate('/auth/login')
    }
  }, [usuario, isLoading, navigate])

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargandoClubs(true)
        setCargandoInvitaciones(true)
        const [clubsData, invitacionesData] = await Promise.all([
          APIService.get<Club[]>('/clubes'),
          APIService.get<InvitacionPendiente[]>('/auth/invitaciones/pendientes')
        ])
        setClubs(clubsData)
        setInvitaciones(invitacionesData)
      } catch (error) {
        setError('Error al cargar clubes: ' + (error as Error).message)
        setErrorInvitaciones('Error al cargar invitaciones')
        console.error(error)
      } finally {
        setCargandoClubs(false)
        setCargandoInvitaciones(false)
      }
    }

    if (usuario) {
      cargarDatos()
    }
  }, [usuario])

  const handleAceptarInvitacion = async (token: string) => {
    try {
      await APIService.post(`/auth/invitaciones/aceptar/${token}`)
      setInvitaciones(prev => prev.filter(inv => inv.token !== token))
    } catch (error) {
      setErrorInvitaciones('Error al aceptar invitación')
      console.error(error)
    }
  }

  const handleRechazarInvitacion = async (token: string) => {
    try {
      await APIService.post(`/auth/invitaciones/rechazar/${token}`)
      setInvitaciones(prev => prev.filter(inv => inv.token !== token))
    } catch (error) {
      setErrorInvitaciones('Error al rechazar invitación')
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1>Bienvenido, {usuario.nombre_completo}</h1>
              <p className="subtitle">Gestión de Clubs de Aeromodelismo</p>
            </div>
          </div>

          {/* Sección de Clubes */}
          <section className="section clubs-section">
            <div className="section-header">
              <h2>Mis Clubes</h2>
              {usuario.es_superadmin && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/clubes')}
                >
                  ⚙️ Admin Clubes
                </button>
              )}
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {cargandoClubs ? (
              <div className="loading-skeleton">
                <div className="skeleton-card"></div>
                <div className="skeleton-card"></div>
                <div className="skeleton-card"></div>
              </div>
            ) : clubs.length > 0 ? (
              <div className="clubs-grid">
                {clubs.map(club => (
                  <div key={club.id} className="club-card">
                    <div className="club-header">
                      <h3>{club.nombre}</h3>
                      <span className="club-badge">{club.slug}</span>
                    </div>
                    {club.descripcion && (
                      <p className="club-description">{club.descripcion}</p>
                    )}
                    <div className="club-footer">
                      <small className="text-muted">
                        Creado: {new Date(club.fecha_creacion).toLocaleDateString('es-ES')}
                      </small>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/clubes/${club.id}`)}
                      >
                        Ver Detalles →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No tienes clubs aún</h3>
                <p>Espera ser invitado a uno{usuario.es_superadmin ? ' o crea uno en la administración' : ''}</p>
                {usuario.es_superadmin && (
                    <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/clubes')}
                    >
                    Ir a Admin Clubes
                    </button>
                )}
              </div>
            )}
          </section>

          {/* Sección de Invitaciones Pendientes */}
          <section className="section invitations-section">
            <div className="section-header">
              <h2>Invitaciones Pendientes</h2>
            </div>
            {errorInvitaciones && (
              <div className="alert alert-error">{errorInvitaciones}</div>
            )}
            {cargandoInvitaciones ? (
              <div className="loading-skeleton">
                <div className="skeleton-card"></div>
              </div>
            ) : invitaciones.length > 0 ? (
              <div className="clubs-grid">
                {invitaciones.map(inv => (
                  <div key={inv.id} className="club-card">
                    <div className="club-header">
                      <h3>{inv.club?.nombre || `Invitacion a club #${inv.club_id}`}</h3>
                      <span className="club-badge">{inv.rol}</span>
                    </div>
                    <p className="club-description">
                      Vence: {new Date(inv.fecha_vencimiento).toLocaleDateString('es-ES')}
                    </p>
                    <div className="club-footer">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleAceptarInvitacion(inv.token)}
                      >
                        Aceptar
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleRechazarInvitacion(inv.token)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-small">
                <p>Sin invitaciones pendientes</p>
              </div>
            )}
          </section>

          {/* Estadísticas Rápidas */}
          <section className="section stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{clubs.length}</div>
                <div className="stat-label">Clubes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Eventos Próximos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Noticias</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{invitaciones.length}</div>
                <div className="stat-label">Invitaciones</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
