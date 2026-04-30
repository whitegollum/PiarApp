import React from 'react'
import { RankingEntry } from '../services/tareasComunitariasService'

interface RankingTableProps {
  ranking: RankingEntry[]
  usuarioId?: number
}

export const RankingTable: React.FC<RankingTableProps> = ({ ranking, usuarioId }) => {
  return (
    <div className="ranking-table-container">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>Posición</th>
            <th>Usuario</th>
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.length === 0 ? (
            <tr>
              <td colSpan={3} className="ranking-vacio">No hay datos de ranking</td>
            </tr>
          ) : (
            ranking.map(entry => (
              <tr
                key={entry.usuario_id}
                className={entry.usuario_id === usuarioId ? 'ranking-row-actual' : ''}
              >
                <td className="ranking-posicion">
                  {entry.posicion <= 3 ? (
                    <span className={`ranking-medalla ranking-medalla-${entry.posicion}`}>
                      {entry.posicion === 1 ? '🥇' : entry.posicion === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    entry.posicion
                  )}
                </td>
                <td className="ranking-nombre">{entry.nombre}</td>
                <td className="ranking-puntos">{entry.puntos_totales} pts</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default RankingTable
