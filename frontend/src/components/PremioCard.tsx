import React from 'react'
import { Premio } from '../services/tareasComunitariasService'

interface PremioCardProps {
  premio: Premio
}

export const PremioCard: React.FC<PremioCardProps> = ({ premio }) => {
  return (
    <div className={`premio-card ${premio.confirmado ? 'premio-confirmado' : ''}`}>
      <div className="premio-card-posicion">#{premio.posicion}</div>
      <div className="premio-card-content">
        <h4 className="premio-card-nombre">{premio.nombre}</h4>
        {premio.descripcion && (
          <p className="premio-card-descripcion">{premio.descripcion}</p>
        )}
        {premio.nombre_usuario && (
          <p className="premio-card-ganador">
            Ganador: <strong>{premio.nombre_usuario}</strong>
          </p>
        )}
        {premio.confirmado && <span className="premio-badge-confirmado">Confirmado</span>}
      </div>
    </div>
  )
}

export default PremioCard
