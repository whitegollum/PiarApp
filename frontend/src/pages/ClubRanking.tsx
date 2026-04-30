import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { RankingService, PremiosService, RankingEntry, PeriodoPremios } from '../services/tareasComunitariasService'
import APIService from '../services/api'
import { RankingTable } from '../components/RankingTable'
import Navbar from '../components/Navbar'
import '../styles/Ranking.css'
import '../styles/ClubDetail.css'
import '../styles/Tareas.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubRanking() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [periodos, setPeriodos] = useState<PeriodoPremios[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const canEdit = role === 'administrador' || usuario?.es_superadmin

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

  return (
    <>
      <Navbar
        clubName={club?.nombre}
        clubId={clubId}
        canEdit={canEdit}
      />

      <main className="club-detail-main">
        <div className="club-detail-container">
          <button
            className="btn-volver-tareas"
            onClick={() => navigate(`/clubes/${clubId}`)}
          >
            ← Volver al club
          </button>

          <div className="ranking-page">
            <h1>Ranking del Club</h1>

            <div className="ranking-filtro-periodo">
              <select
                value={periodoSeleccionado || ''}
                onChange={e => handlePeriodoChange(e.target.value)}
              >
                <option value="">Ranking general (todos los periodos)</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="ranking-loading">Cargando ranking...</div>
            ) : (
              <RankingTable ranking={ranking} usuarioId={usuario?.id} />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
