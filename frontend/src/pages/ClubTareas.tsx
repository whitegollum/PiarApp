import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { TareasService, TareaComunitaria } from '../services/tareasComunitariasService'
import APIService from '../services/api'
import { TareaList } from '../components/TareaList'
import Navbar from '../components/Navbar'
import '../styles/Tareas.css'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubTareas() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [tareas, setTareas] = useState<TareaComunitaria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const esAdmin = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin
  const canEdit = role === 'administrador' || usuario?.es_superadmin

  const cargarTareas = async (filtros?: { estado?: string; categoria?: string; prioridad?: string }) => {
    if (!clubId) return
    try {
      setLoading(true)
      const data = await TareasService.listar(parseInt(clubId), filtros)
      setTareas(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clubId) return
    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(setClub).catch(() => {})
    cargarTareas()
  }, [clubId])

  const handleInscribirse = async (tareaId: number) => {
    if (!clubId) return
    try {
      await TareasService.inscribirse(parseInt(clubId), tareaId)
      cargarTareas()
    } catch (err: any) {
      alert(err.message || 'Error al inscribirse')
    }
  }

  const handleDesinscribirse = async (tareaId: number) => {
    if (!clubId) return
    try {
      await TareasService.desinscribirse(parseInt(clubId), tareaId)
      cargarTareas()
    } catch (err: any) {
      alert(err.message || 'Error al desinscribirse')
    }
  }

  return (
    <>
      <Navbar
        clubName={club?.nombre}
        clubId={clubId}
        canEdit={canEdit}
      />

      <main className="club-detail-main">
        <div className="club-detail-container">
          <button
            className="btn-volver-tareas"
            onClick={() => navigate(`/clubes/${clubId}`)}
          >
            ← Volver al club
          </button>

          <div className="tareas-page-card">
            <div className="tareas-header">
              <h1>🛠️ Tareas Comunitarias</h1>
              {esAdmin && (
                <button className="btn-crear-tarea" onClick={() => navigate(`/clubes/${clubId}/tareas/crear`)}>
                  + Nueva Tarea
                </button>
              )}
            </div>

            {loading ? (
              <div className="tareas-loading">Cargando tareas...</div>
            ) : error ? (
              <div className="tareas-error">{error}</div>
            ) : (
              <TareaList
                tareas={tareas}
                usuarioId={usuario?.id}
                esAdmin={esAdmin}
                onInscribirse={handleInscribirse}
                onDesinscribirse={handleDesinscribirse}
                onVer={(tareaId) => navigate(`/clubes/${clubId}/tareas/${tareaId}`)}
                onFiltroChange={cargarTareas}
              />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
