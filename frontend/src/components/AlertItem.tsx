import React from 'react';
import { Alerta } from '../types/alerta';
import '../styles/Alerts.css';

interface AlertItemProps {
  alerta: Alerta;
  onResolver?: (id: number) => void;
  onIgnorar?: (id: number) => void;
  onVerPerfil?: (usuarioId: number) => void;
  mostrarUsuario?: boolean;
}

const AlertItem: React.FC<AlertItemProps> = ({
  alerta,
  onResolver,
  onIgnorar,
  onVerPerfil,
  mostrarUsuario = true,
}) => {
  const getSeverityIcon = (severidad: string) => {
    switch (severidad) {
      case 'warning':
        return '⚠️';
      case 'danger':
        return '❌';
      case 'critical':
        return '🚨';
      default:
        return 'ℹ️';
    }
  };

  const getSeverityLabel = (severidad: string) => {
    switch (severidad) {
      case 'warning':
        return 'Aviso';
      case 'danger':
        return 'Urgente';
      case 'critical':
        return 'Crítico';
      default:
        return 'Info';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className={`alert-item ${alerta.severidad}`}>
      <div className="alert-item-header">
        <div className="alert-item-title">
          <span className="alert-item-icon">{getSeverityIcon(alerta.severidad)}</span>
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
              <span>👤</span>
              <span className="alert-item-user">{alerta.usuario.nombre}</span>
              <span>({alerta.usuario.email})</span>
            </div>
          )}
          
          {alerta.fecha_referencia && (
            <div className="alert-item-meta-item">
              <span>📅</span>
              <span>Vence: {formatDate(alerta.fecha_referencia)}</span>
            </div>
          )}

          <div className="alert-item-meta-item">
            <span>🕐</span>
            <span>Creada: {formatDate(alerta.fecha_creacion)}</span>
          </div>
        </div>
      </div>

      {(onResolver || onIgnorar || onVerPerfil) && (
        <div className="alert-item-footer">
          <div className="alert-item-actions">
            {onResolver && (
              <button
                className="alert-btn alert-btn-resolver"
                onClick={() => onResolver(alerta.id)}
              >
                ✓ Marcar Resuelta
              </button>
            )}
            {onIgnorar && (
              <button
                className="alert-btn alert-btn-ignorar"
                onClick={() => onIgnorar(alerta.id)}
              >
                ✕ Ignorar
              </button>
            )}
            {onVerPerfil && alerta.usuario && (
              <button
                className="alert-btn alert-btn-ver"
                onClick={() => onVerPerfil(alerta.usuario!.id)}
              >
                Ver Perfil
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertItem;
