import React from 'react'
import { TareaComunitaria } from '../services/tareasComunitariasService'
import { TareaCard } from './TareaCard'

interface TareaListProps {
  tareas: TareaComunitaria[]
  usuarioId?: number
  esAdmin?: boolean
  onInscribirse?: (tareaId: number) => void
  onDesinscribirse?: (tareaId: number) => void
  onAprobar?: (tareaId: number) => void
}

export const TareaList: React.FC<TareaListProps> = ({
  tareas, usuarioId, esAdmin, onInscribirse, onDesinscribirse, onAprobar
}) => {
  if (tareas.length === 0) {
    return <p className="tarea-list-vacio">No hay tareas en esta categoría</p>
  }

  return (
    <div className="tarea-list-v2">
      {tareas.map(tarea => (
        <TareaCard
          key={tarea.id}
          tarea={tarea}
          usuarioId={usuarioId}
          esAdmin={esAdmin}
          onInscribirse={onInscribirse}
          onDesinscribirse={onDesinscribirse}
          onAprobar={onAprobar}
        />
      ))}
    </div>
  )
}

export default TareaList

