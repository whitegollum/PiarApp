import React, { useState, useRef, useEffect } from 'react'
import { Star, Calendar, MoreVertical, CheckCircle } from 'lucide-react'
import { TareaComunitaria } from '../services/tareasComunitariasService'

interface TareaCardProps {
  tarea: TareaComunitaria
  usuarioId?: number
  esAdmin?: boolean
  onInscribirse?: (tareaId: number) => void
  onDesinscribirse?: (tareaId: number) => void
  onAprobar?: (tareaId: number) => void
}

const PRIORIDAD_CLASS: Record<string, string> = {
  alta: 'tarea-prioridad-alta',
  media: 'tarea-prioridad-media',
  baja: 'tarea-prioridad-baja',
}

const PRIORIDAD_LABEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFechaLimite(fecha: string): { text: string; level: 'normal' | 'warning' | 'urgent' } {
  const now = new Date()
  const deadline = new Date(fecha)
  const diffMs = deadline.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffMs < 0) {
    return { text: `Venció el ${deadline.getDate()} ${MESES[deadline.getMonth()]}`, level: 'normal' }
  } else if (diffHours < 24) {
    return { text: 'Vence hoy', level: 'urgent' }
  } else if (diffHours < 48) {
    return { text: 'Mañana', level: 'warning' }
  } else if (diffDays < 7) {
    return { text: `En ${Math.ceil(diffDays)} días`, level: 'normal' }
  } else {
    return { text: `${deadline.getDate()} ${MESES[deadline.getMonth()]}`, level: 'normal' }
  }
}

export const TareaCard: React.FC<TareaCardProps> = ({
  tarea, usuarioId, esAdmin, onInscribirse, onDesinscribirse, onAprobar
}) => {
  const estaInscrito = tarea.participantes.some(p => p.usuario_id === usuarioId)
  const plazasOcupadas = tarea.num_participantes
  const totalPlazas = tarea.max_participantes
  const sinPlazas = totalPlazas != null && plazasOcupadas >= totalPlazas
  const esAbierta = tarea.estado === 'abierta' || tarea.estado === 'en_progreso'
  const fechaInfo = tarea.fecha_limite ? formatFechaLimite(tarea.fecha_limite) : null

  const [showKebab, setShowKebab] = useState(false)
  const kebabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showKebab) return
    const handler = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setShowKebab(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showKebab])

  return (
    <article className="tarea-card-v2">
      <div className="tarea-card-v2-header">
        <h3 className="tarea-card-v2-titulo">{tarea.titulo}</h3>
        <div className="tarea-card-v2-header-right">
          <span className={`tarea-prioridad-pill ${PRIORIDAD_CLASS[tarea.prioridad] ?? 'tarea-prioridad-baja'}`}>
            {PRIORIDAD_LABEL[tarea.prioridad] ?? tarea.prioridad}
          </span>
          {esAdmin && esAbierta && (
            <div className="tarea-card-kebab" ref={kebabRef}>
              <button
                className="tarea-card-kebab-btn"
                onClick={() => setShowKebab(v => !v)}
                aria-label="Opciones"
              >
                <MoreVertical size={16} />
              </button>
              {showKebab && (
                <div className="tarea-card-kebab-menu">
                  <button
                    className="tarea-card-kebab-item"
                    onClick={() => {
                      setShowKebab(false)
                      onAprobar?.(tarea.id)
                    }}
                  >
                    <CheckCircle size={14} /> Completar y asignar puntos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {tarea.descripcion && (
        <p className="tarea-card-v2-desc">{tarea.descripcion}</p>
      )}

      <div className="tarea-card-v2-meta">
        <span className="tarea-puntos-badge">
          <Star size={13} />
          {tarea.puntos} pts
        </span>
        {tarea.categoria && (
          <span className="tarea-categoria-pill">{tarea.categoria}</span>
        )}
        {fechaInfo && (
          <span className={`tarea-fecha-badge${fechaInfo.level !== 'normal' ? ` ${fechaInfo.level}` : ''}`}>
            <Calendar size={12} />
            {fechaInfo.text}
          </span>
        )}
      </div>

      {totalPlazas != null && (
        <p className={`tarea-card-v2-plazas${sinPlazas ? ' llena' : ''}`}>
          {plazasOcupadas} de {totalPlazas} plazas ocupadas
        </p>
      )}

      {esAbierta && (
        <div className="tarea-card-v2-footer">
          {estaInscrito ? (
            <button
              className="btn-apuntarme inscrito"
              onClick={() => onDesinscribirse?.(tarea.id)}
            >
              Apuntado ✓
            </button>
          ) : (
            <button
              className="btn-apuntarme"
              onClick={() => onInscribirse?.(tarea.id)}
              disabled={sinPlazas}
            >
              {sinPlazas ? 'Sin plazas' : 'Apuntarme'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default TareaCard

