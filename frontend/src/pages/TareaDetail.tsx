import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { TareasService, TareaComunitaria } from '../services/tareasComunitariasService'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import '../styles/Tareas.css'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function TareaDetail() {
  const { usuario } = useAuth()
  const { clubId, tareaId } = useParams<{ clubId: string; tareaId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [tarea, setTarea] = useState<TareaComunitaria | null>(null)
  const [loading, setLoading] = useState(true)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showRechazo, setShowRechazo] = useState(false)

  const esAdmin = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin
  const canEdit = role === 'administrador' || usuario?.es_superadmin
  const estaInscrito = tarea?.participantes.some(p => p.usuario_id === usuario?.id)

  const cargarTarea = async () => {
    if (!clubId || !tareaId) return
    try {
      setLoading(true)
      const data = await TareasService.obtener(parseInt(clubId), parseInt(tareaId))
      setTarea(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clubId) return
    APIService.get<Club>(`/clubes/${parseInt(clubId)}`).then(setClub).catch(() => {})
    cargarTarea()
  }, [clubId, tareaId])

  const handleInscribirse = async () => {
    if (!clubId || !tareaId) return
    try {
      await TareasService.inscribirse(parseInt(clubId), parseInt(tareaId))
      cargarTarea()
    } catch (err: any) { alert(err.message) }
  }

  const handleDesinscribirse = async () => {
    if (!clubId || !tareaId) return
    try {
      await TareasService.desinscribirse(parseInt(clubId), parseInt(tareaId))
      cargarTarea()
    } catch (err: any) { alert(err.message) }
  }

  const handleAprobar = async () => {
    if (!clubId || !tareaId) return
    if (!confirm('¿Aprobar esta tarea y asignar puntos a los participantes?')) return
    try {
      await TareasService.aprobar(parseInt(clubId), parseInt(tareaId))
      cargarTarea()
    } catch (err: any) { alert(err.message) }
  }

  const handleRechazar = async () => {
    if (!clubId || !tareaId || !motivoRechazo.trim()) return
    try {
      await TareasService.rechazar(parseInt(clubId), parseInt(tareaId), motivoRechazo)
      setShowRechazo(false)
      cargarTarea()
    } catch (err: any) { alert(err.message) }
  }

  const handleEliminar = async () => {
    if (!clubId || !tareaId) return
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await TareasService.eliminar(parseInt(clubId), parseInt(tareaId))
      navigate(`/clubes/${clubId}/tareas`)
    } catch (err: any) { alert(err.message) }
  }

  const plazasDisponibles = tarea?.max_participantes
    ? tarea.max_participantes - tarea.num_participantes
    : null

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
            onClick={() => navigate(`/clubes/${clubId}/tareas`)}
          >
            ← Volver a tareas
          </button>

          {loading ? (
            <div className="tareas-loading">Cargando...</div>
          ) : !tarea ? (
            <div className="tareas-error">Tarea no encontrada</div>
          ) : (
            <div className="tarea-detail-card">
              <div className="tarea-detail-header">
                <h1>{tarea.titulo}</h1>
                <span className={`tarea-estado tarea-estado-${tarea.estado}`}>{tarea.estado}</span>
              </div>

              {tarea.descripcion && <p className="tarea-detail-descripcion">{tarea.descripcion}</p>}

              <div className="tarea-detail-meta">
                <div><strong>Puntos:</strong> {tarea.puntos}</div>
                <div><strong>Prioridad:</strong> {tarea.prioridad}</div>
                {tarea.categoria && <div><strong>Categoria:</strong> {tarea.categoria}</div>}
                {tarea.fecha_limite && <div><strong>Fecha limite:</strong> {new Date(tarea.fecha_limite).toLocaleDateString()}</div>}
                <div><strong>Participantes:</strong> {tarea.num_participantes}{tarea.max_participantes ? ` / ${tarea.max_participantes}` : ''}</div>
              </div>

              {tarea.motivo_rechazo && (
                <div className="tarea-detail-rechazo">
                  <strong>Motivo de rechazo:</strong> {tarea.motivo_rechazo}
                </div>
              )}

              {/* Acciones usuario - inscripcion */}
              {tarea.estado === 'abierta' && (
                <div className="tarea-detail-actions">
                  {estaInscrito ? (
                    <button className="btn-desinscribirse" onClick={handleDesinscribirse}>Desinscribirse</button>
                  ) : (
                    <button
                      className="btn-inscribirse"
                      onClick={handleInscribirse}
                      disabled={plazasDisponibles !== null && plazasDisponibles <= 0}
                    >
                      {plazasDisponibles !== null && plazasDisponibles <= 0 ? 'Sin plazas' : 'Inscribirse'}
                    </button>
                  )}
                </div>
              )}

              {/* Acciones admin */}
              {esAdmin && (
                <div className="tarea-detail-admin-actions">
                  {tarea.estado === 'abierta' && (
                    <>
                      <button className="btn-aprobar" onClick={handleAprobar}>Aprobar</button>
                      <button className="btn-rechazar" onClick={() => setShowRechazo(true)}>Rechazar</button>
                      <button className="btn-editar" onClick={() => navigate(`/clubes/${clubId}/tareas/${tareaId}/editar`)}>Editar</button>
                      <button className="btn-eliminar" onClick={handleEliminar}>Eliminar</button>
                    </>
                  )}
                </div>
              )}

              {showRechazo && (
                <div className="tarea-rechazo-form">
                  <textarea
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                    placeholder="Motivo del rechazo..."
                  />
                  <div>
                    <button className="btn-confirmar-rechazo" onClick={handleRechazar}>Confirmar rechazo</button>
                    <button className="btn-cancelar" onClick={() => setShowRechazo(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Lista de participantes */}
              <div className="tarea-detail-participantes">
                <h3>Participantes ({tarea.num_participantes})</h3>
                {tarea.participantes.length === 0 ? (
                  <p>No hay participantes inscritos</p>
                ) : (
                  <ul>
                    {tarea.participantes.map(p => (
                      <li key={p.id}>
                        {p.nombre_usuario || `Usuario #${p.usuario_id}`}
                        {p.puntos_otorgados && <span className="badge-puntos">Puntos otorgados</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
