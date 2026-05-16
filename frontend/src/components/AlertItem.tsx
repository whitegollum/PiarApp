import React from 'react'
import { AlertTriangle, XCircle, Siren, Info, User, Calendar, Check, X, FileX } from 'lucide-react'
import { Alerta } from '../types/alerta'
import '../styles/Alerts.css'

interface AlertItemProps {
  alerta: Alerta
  onResolver?: (id: number) => void
  onIgnorar?: (id: number) => void
  onVerPerfil?: (usuarioId: number) => void
  mostrarUsuario?: boolean
  compact?: boolean
}

const getSeverityIcon = (severidad: string, tipo?: string) => {
  if (tipo === 'documento_ausente') return <FileX size={15} />
  switch (severidad) {
    case 'warning':  return <AlertTriangle size={15} />
    case 'danger':   return <XCircle size={15} />
    case 'critical': return <Siren size={15} />
    default:         return <Info size={15} />
  }
}

const getSeverityLabel = (severidad: string) => {
  switch (severidad) {
    case 'warning':  return 'Aviso'
    case 'danger':   return 'Urgente'
    case 'critical': return 'Crítico'
    default:         return 'Info'
  }
}

const timeAgo = (dateString?: string): string => {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  if (mins  < 60)  return `hace ${mins} min`
  if (hours < 24)  return `hace ${hours} h`
  if (days  < 7)   return `hace ${days} día${days !== 1 ? 's' : ''}`
  if (weeks < 5)   return `hace ${weeks} semana${weeks !== 1 ? 's' : ''}`
  return new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const AlertItem: React.FC<AlertItemProps> = ({
  alerta,
  onResolver,
  onIgnorar,
  onVerPerfil,
  mostrarUsuario = true,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`alert-item alert-item-compact ${alerta.severidad}`}>
        <div className="alert-compact-main">
          <div className="alert-compact-body">
            <div className="alert-compact-title">
              <span className="alert-item-icon">{getSeverityIcon(alerta.severidad, alerta.tipo)}</span>
              <span>{alerta.titulo}</span>
            </div>
            <div className="alert-compact-meta">
              {mostrarUsuario && alerta.usuario && (
                <span>{alerta.usuario.nombre}</span>
              )}
              {alerta.fecha_creacion && (
                <span className="alert-compact-time">{timeAgo(alerta.fecha_creacion)}</span>
              )}
              {alerta.tipo === 'documento_ausente' && (
                <span className="alert-compact-time">
                  <FileX size={11} /> No registrado
                </span>
              )}
              {alerta.fecha_referencia && alerta.tipo !== 'documento_ausente' && (
                <span className="alert-compact-time">
                  <Calendar size={11} /> Vence {formatDate(alerta.fecha_referencia)}
                </span>
              )}
            </div>
          </div>
          <span className={`alert-severity-badge ${alerta.severidad}`}>
            {getSeverityLabel(alerta.severidad)}
          </span>
        </div>

        {(onResolver || onIgnorar || onVerPerfil) && (
          <div className="alert-compact-actions">
            {onResolver && (
              <button className="alert-action-btn alert-action-resolver" onClick={() => onResolver(alerta.id)}>
                <Check size={12} /> Resolver
              </button>
            )}
            {onIgnorar && (
              <button className="alert-action-btn alert-action-ignorar" onClick={() => onIgnorar(alerta.id)}>
                <X size={12} /> Ignorar
              </button>
            )}
            {onVerPerfil && alerta.usuario && (
              <button className="alert-action-btn alert-action-ver" onClick={() => onVerPerfil(alerta.usuario!.id)}>
                <User size={12} /> Ver perfil
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full mode (non-admin contexts)
  return (
    <div className={`alert-item ${alerta.severidad}`}>
      <div className="alert-item-header">
        <div className="alert-item-title">
          <span className="alert-item-icon">{getSeverityIcon(alerta.severidad, alerta.tipo)}</span>
          <span>{alerta.titulo}</span>
        </div>
        <span className={`alert-severity-badge ${alerta.severidad}`}>
          {getSeverityLabel(alerta.severidad)}
        </span>
      </div>

      <div className="alert-item-body">
        {alerta.descripcion && (
          <p className="alert-item-description">{alerta.descripcion}</p>
        )}
        <div className="alert-item-meta">
          {mostrarUsuario && alerta.usuario && (
            <div className="alert-item-meta-item">
              <User size={14} />
              <span className="alert-item-user">{alerta.usuario.nombre}</span>
              <span>({alerta.usuario.email})</span>
            </div>
          )}
          {alerta.tipo === 'documento_ausente' && (
            <div className="alert-item-meta-item">
              <FileX size={14} />
              <span>Documentación no registrada</span>
            </div>
          )}
          {alerta.fecha_referencia && alerta.tipo !== 'documento_ausente' && (
            <div className="alert-item-meta-item">
              <Calendar size={14} />
              <span>Vence: {formatDate(alerta.fecha_referencia)}</span>
            </div>
          )}
        </div>
      </div>

      {(onResolver || onIgnorar || onVerPerfil) && (
        <div className="alert-item-footer">
          <div className="alert-item-actions">
            {onResolver && (
              <button className="alert-btn alert-btn-resolver" onClick={() => onResolver(alerta.id)}>
                <Check size={14} /> Marcar Resuelta
              </button>
            )}
            {onIgnorar && (
              <button className="alert-btn alert-btn-ignorar" onClick={() => onIgnorar(alerta.id)}>
                <X size={14} /> Ignorar
              </button>
            )}
            {onVerPerfil && alerta.usuario && (
              <button className="alert-btn alert-btn-ver" onClick={() => onVerPerfil(alerta.usuario!.id)}>
                Ver Perfil
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertItem
