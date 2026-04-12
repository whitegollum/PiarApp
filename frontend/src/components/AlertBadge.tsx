import React from 'react';
import { Link } from 'react-router-dom';
import { AlertaCountResponse } from '../types/alerta';
import '../styles/Alerts.css';

interface AlertBadgeProps {
  clubSlug: string;
  contador: AlertaCountResponse | null;
  loading?: boolean;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ clubSlug, contador, loading }) => {
  if (loading) {
    return (
      <div className="alert-badge alert-badge-warning">
        <span className="alert-badge-icon">⏳</span>
        <span>Cargando...</span>
      </div>
    );
  }

  if (!contador || contador.total === 0) {
    return null;
  }

  // Determinar color según la severidad máxima
  let badgeClass = 'alert-badge-warning';
  let icon = '⚠️';
  
  if (contador.critical > 0) {
    badgeClass = 'alert-badge-critical';
    icon = '🚨';
  } else if (contador.danger > 0) {
    badgeClass = 'alert-badge-danger';
    icon = '❌';
  }

  return (
    <Link to={`/clubs/${clubSlug}/admin/alertas`} className={`alert-badge ${badgeClass}`}>
      <span className="alert-badge-icon">{icon}</span>
      <span>Alertas</span>
      <span className="alert-badge-count">{contador.total}</span>
    </Link>
  );
};

export default AlertBadge;
