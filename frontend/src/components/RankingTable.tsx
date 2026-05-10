import React from 'react'
import { Medal } from 'lucide-react'
import { RankingEntry } from '../services/tareasComunitariasService'

interface RankingTableProps {
  ranking: RankingEntry[]
  usuarioId?: number
}

const MEDAL_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#cd7c2f',
}

export const RankingTable: React.FC<RankingTableProps> = ({ ranking, usuarioId }) => {
  if (ranking.length === 0) {
    return <p className="ranking-vacio">No hay datos de ranking</p>
  }

  const top3 = ranking.filter(e => e.posicion <= 3)
  const rest = ranking.filter(e => e.posicion > 3)

  return (
    <div className="ranking-list">

      {/* Podio top 3 */}
      {top3.length > 0 && (
        <div className="ranking-podio">
          {top3.map(entry => {
            const color = MEDAL_COLORS[entry.posicion]
            const esMio = entry.usuario_id === usuarioId
            return (
              <div
                key={entry.usuario_id}
                className={`ranking-podio-item${esMio ? ' ranking-podio-item-mio' : ''}`}
                style={{ borderTopColor: color }}
              >
                <span className="ranking-podio-medal" style={{ color }}>
                  <Medal size={24} />
                </span>
                <span className="ranking-podio-nombre">{entry.nombre}</span>
                <span className="ranking-podio-pts" style={{ color }}>{entry.puntos_totales} pts</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Resto del ranking */}
      {rest.length > 0 && (
        <div className="ranking-rest">
          {rest.map(entry => {
            const esMio = entry.usuario_id === usuarioId
            return (
              <div
                key={entry.usuario_id}
                className={`ranking-rest-row${esMio ? ' ranking-rest-row-mio' : ''}`}
              >
                <span className="ranking-rest-pos">{entry.posicion}</span>
                <span className="ranking-rest-nombre">
                  {entry.nombre}
                  {esMio && <span className="ranking-yo-badge">Tú</span>}
                </span>
                <span className="ranking-rest-pts">{entry.puntos_totales} pts</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RankingTable
