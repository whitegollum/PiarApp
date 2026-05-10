import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { RankingService, PremiosService, RankingEntry, PeriodoPremios } from '../services/tareasComunitariasService'
import APIService from '../services/api'
import { RankingTable } from '../components/RankingTable'
import { ArrowLeft, Trophy } from 'lucide-react'
import '../styles/Ranking.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubRanking() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const { role: _role } = useClubRole(clubId)
  const navigate = useNavigate()

  const [, setClub] = useState<Club | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [periodos, setPeriodos] = useState<PeriodoPremios[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) return
    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(setClub).catch(() => {})
    const cargar = async () => {
      try {
        setLoading(true)
        const [rankingData, periodosData] = await Promise.all([
          RankingService.obtener(id),
          PremiosService.listarPeriodos(id)
        ])
        setRanking(rankingData)
        setPeriodos(periodosData)
      } catch (err: any) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [clubId])

  const handlePeriodoChange = async (periodoId: string) => {
    if (!clubId) return
    const id = periodoId ? parseInt(periodoId) : null
    setPeriodoSeleccionado(id)
    try {
      setLoading(true)
      const data = id
        ? await RankingService.obtenerPorPeriodo(parseInt(clubId), id)
        : await RankingService.obtener(parseInt(clubId))
      setRanking(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const miEntrada = ranking.find(e => e.usuario_id === usuario?.id)

  return (
    <main className="form-main">
      <div className="ranking-page-v2">

        {/* Header */}
        <div className="header-actions">
          <button
            className="btn-back"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <h1>Ranking</h1>
          {periodos.length > 0 && (
            <select
              className="ranking-periodo-select"
              value={periodoSeleccionado || ''}
              onChange={e => handlePeriodoChange(e.target.value)}
            >
              <option value="">General</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mi posición */}
        {miEntrada && (
          <div className="ranking-mi-posicion">
            <span className="ranking-mi-posicion-label">
              <Trophy size={14} /> Tu posición
            </span>
            <span className="ranking-mi-posicion-valor">
              {miEntrada.posicion}º · {miEntrada.nombre} · {miEntrada.puntos_totales} pts
            </span>
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="ranking-loading">Cargando ranking...</div>
        ) : ranking.length === 0 ? (
          <div className="empty-state-small">
            <p>No hay datos de ranking todavía.</p>
          </div>
        ) : (
          <RankingTable ranking={ranking} usuarioId={usuario?.id} />
        )}

      </div>
    </main>
  )
}
