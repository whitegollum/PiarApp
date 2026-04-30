import React from 'react'
import { TareaComunitaria } from '../services/tareasComunitariasService'

interface TareaCardProps {
  tarea: TareaComunitaria
  usuarioId?: number
  esAdmin?: boolean
  onInscribirse?: (tareaId: number) => void
  onDesinscribirse?: (tareaId: number) => void
  onVer?: (tareaId: number) => void
}

const prioridadColors: Record<string, string> = {
  alta: '#ef4444',
  media: '#f59e0b',
  baja: '#10b981'
}

const estadoLabels: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  completada: 'Completada',
  rechazada: 'Rechazada',
  expirada: 'Expirada'
}

export const TareaCard: React.FC<TareaCardProps> = ({
  tarea, usuarioId, esAdmin: _esAdmin, onInscribirse, onDesinscribirse, onVer
}) => {
  const estaInscrito = tarea.participantes.some(p => p.usuario_id === usuarioId)
  const plazasDisponibles = tarea.max_participantes
    ? tarea.max_participantes - tarea.num_participantes
    : null

  return (
    <div className="tarea-card" onClick={() => onVer?.(tarea.id)}>
      <div className="tarea-card-header">
        <h3 className="tarea-card-titulo">{tarea.titulo}</h3>
        <span
          className="tarea-card-prioridad"
          style={{ backgroundColor: prioridadColors[tarea.prioridad] || '#6b7280' }}
        >
          {tarea.prioridad}
        </span>
      </div>

      {tarea.descripcion && (
        <p className="tarea-card-descripcion">{tarea.descripcion}</p>
      )}

      <div className="tarea-card-info">
        <span className="tarea-card-puntos">{tarea.puntos} pts</span>
        <span className="tarea-card-estado">{estadoLabels[tarea.estado] || tarea.estado}</span>
        {tarea.categoria && <span className="tarea-card-categoria">{tarea.categoria}</span>}
      </div>

      <div className="tarea-card-participantes">
        <span>{tarea.num_participantes} participante(s)</span>
        {plazasDisponibles !== null && (
          <span> | {plazasDisponibles} plaza(s) disponible(s)</span>
        )}
      </div>

      {tarea.fecha_limite && (
        <div className="tarea-card-fecha">
          Fecha límite: {new Date(tarea.fecha_limite).toLocaleDateString()}
        </div>
      )}

      {tarea.estado === 'abierta' && (
        <div className="tarea-card-actions" onClick={e => e.stopPropagation()}>
          {estaInscrito ? (
            <button className="btn-desinscribirse" onClick={() => onDesinscribirse?.(tarea.id)}>
              Desinscribirse
            </button>
          ) : (
            <button
              className="btn-inscribirse"
              onClick={() => onInscribirse?.(tarea.id)}
              disabled={plazasDisponibles !== null && plazasDisponibles <= 0}
            >
              {plazasDisponibles !== null && plazasDisponibles <= 0 ? 'Sin plazas' : 'Inscribirse'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TareaCard
