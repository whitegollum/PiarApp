import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { MoreVertical, Star, Plus } from 'lucide-react'
import { TareasService, RankingService, TareaComunitaria, RankingEntry } from '../services/tareasComunitariasService'
import { TareaList } from '../components/TareaList'
import '../styles/Tareas.css'
import '../styles/ClubDetail.css'

type TabFilter = 'abiertas' | 'completadas'

const AVATAR_COLORS = ['#E91E63','#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2']
const MEDALS = ['🥇','🥈','🥉']

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ClubTareas() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [tareas, setTareas] = useState<TareaComunitaria[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('abiertas')
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const esAdmin = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin

  const cargarTareas = async () => {
    if (!clubId) return
    try {
      setLoading(true)
      const data = await TareasService.listar(parseInt(clubId))
      setTareas(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clubId) return
    cargarTareas()
    RankingService.obtener(parseInt(clubId)).then(setRanking).catch(() => {})
  }, [clubId])

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const { abiertas, completadas } = useMemo(() => ({
    abiertas: tareas.filter(t => t.estado === 'abierta' || t.estado === 'en_progreso'),
    completadas: tareas.filter(t => t.estado === 'completada' || t.estado === 'rechazada' || t.estado === 'expirada'),
  }), [tareas])

  const filteredTareas = activeTab === 'abiertas' ? abiertas : completadas
  const top3 = ranking.slice(0, 3)

  const handleInscribirse = async (tareaId: number) => {
    if (!clubId) return
    try {
      await TareasService.inscribirse(parseInt(clubId), tareaId)
      cargarTareas()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al inscribirse')
    }
  }

  const handleDesinscribirse = async (tareaId: number) => {
    if (!clubId) return
    try {
      await TareasService.desinscribirse(parseInt(clubId), tareaId)
      cargarTareas()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al desinscribirse')
    }
  }

  const handleAprobar = async (tareaId: number) => {
    if (!clubId) return
    if (!window.confirm('¿Completar la tarea y asignar los puntos a los participantes?')) return
    try {
      await TareasService.aprobar(parseInt(clubId), tareaId)
      cargarTareas()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al completar la tarea')
    }
  }

  return (
    <main className="club-detail-main">
      <div className="club-detail-container">

        {/* Header */}
        <div className="page-header-row">
          <h1 className="page-title">Tareas</h1>
          {esAdmin && (
            <div className="tareas-kebab" ref={menuRef}>
              <button
                className="tareas-kebab-btn"
                onClick={() => setShowMenu(v => !v)}
                aria-label="Opciones de tareas"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <div className="tareas-kebab-menu">
                  <button
                    className="tareas-kebab-item"
                    onClick={() => {
                      setShowMenu(false)
                      navigate(`/clubes/${clubId}/tareas/crear`)
                    }}
                  >
                    <Plus size={15} /> Nueva tarea
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pill tabs */}
        <div className="tareas-tabs">
          <button
            className={`tarea-tab${activeTab === 'abiertas' ? ' active' : ''}`}
            onClick={() => setActiveTab('abiertas')}
          >
            Abiertas · {abiertas.length}
          </button>
          <button
            className={`tarea-tab${activeTab === 'completadas' ? ' active' : ''}`}
            onClick={() => setActiveTab('completadas')}
          >
            Completadas · {completadas.length}
          </button>
        </div>

        {/* Top del Mes widget */}
        {top3.length > 0 && (
          <div className="top-mes-widget">
            <div className="top-mes-header">
              <span className="top-mes-title">
                <Star size={13} /> TOP DEL MES
              </span>
              <Link to={`/clubes/${clubId}/ranking`} className="top-mes-ver-link">
                Ver ranking →
              </Link>
            </div>
            {top3.map((entry, i) => (
              <div key={entry.usuario_id} className="top-mes-row">
                <span className="top-mes-medal">{MEDALS[i]}</span>
                <div
                  className="top-mes-avatar"
                  style={{ background: avatarColor(entry.nombre) }}
                >
                  {entry.nombre.charAt(0).toUpperCase()}
                </div>
                <span className="top-mes-nombre">{entry.nombre}</span>
                <span className="top-mes-puntos">{entry.puntos_totales} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <p className="tareas-loading">Cargando tareas...</p>
        ) : error ? (
          <p className="tareas-error">{error}</p>
        ) : (
          <TareaList
            tareas={filteredTareas}
            usuarioId={usuario?.id}
            esAdmin={esAdmin}
            onInscribirse={handleInscribirse}
            onDesinscribirse={handleDesinscribirse}
            onAprobar={handleAprobar}
          />
        )}

      </div>
    </main>
  )
}

