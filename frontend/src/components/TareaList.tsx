import React, { useState } from 'react'
import { TareaComunitaria } from '../services/tareasComunitariasService'
import { TareaCard } from './TareaCard'

interface TareaListProps {
  tareas: TareaComunitaria[]
  usuarioId?: number
  esAdmin?: boolean
  onInscribirse?: (tareaId: number) => void
  onDesinscribirse?: (tareaId: number) => void
  onVer?: (tareaId: number) => void
  onFiltroChange?: (filtros: { estado?: string; categoria?: string; prioridad?: string }) => void
}

export const TareaList: React.FC<TareaListProps> = ({
  tareas, usuarioId, esAdmin, onInscribirse, onDesinscribirse, onVer, onFiltroChange
}) => {
  const [estado, setEstado] = useState<string>('')
  const [categoria, setCategoria] = useState<string>('')
  const [prioridad, setPrioridad] = useState<string>('')

  const handleFiltro = (field: string, value: string) => {
    const newEstado = field === 'estado' ? value : estado
    const newCategoria = field === 'categoria' ? value : categoria
    const newPrioridad = field === 'prioridad' ? value : prioridad

    if (field === 'estado') setEstado(value)
    if (field === 'categoria') setCategoria(value)
    if (field === 'prioridad') setPrioridad(value)

    onFiltroChange?.({
      estado: newEstado || undefined,
      categoria: newCategoria || undefined,
      prioridad: newPrioridad || undefined
    })
  }

  // Extraer categorías únicas
  const categorias = [...new Set(tareas.map(t => t.categoria).filter(Boolean))]

  return (
    <div className="tarea-list">
      <div className="tarea-list-filtros">
        <select value={estado} onChange={e => handleFiltro('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="en_progreso">En progreso</option>
          <option value="completada">Completada</option>
          <option value="rechazada">Rechazada</option>
          <option value="expirada">Expirada</option>
        </select>

        <select value={categoria} onChange={e => handleFiltro('categoria', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>

        <select value={prioridad} onChange={e => handleFiltro('prioridad', e.target.value)}>
          <option value="">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {tareas.length === 0 ? (
        <p className="tarea-list-vacio">No hay tareas disponibles</p>
      ) : (
        <div className="tarea-list-grid">
          {tareas.map(tarea => (
            <TareaCard
              key={tarea.id}
              tarea={tarea}
              usuarioId={usuarioId}
              esAdmin={esAdmin}
              onInscribirse={onInscribirse}
              onDesinscribirse={onDesinscribirse}
              onVer={onVer}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TareaList
