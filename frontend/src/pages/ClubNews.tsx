import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NewsService } from '../services/contentService'
import { Noticia } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import APIService from '../services/api'
import NewsList from '../components/NewsList'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
  color_acento?: string
}

type TabFilter = 'recientes' | 'anteriores'

export default function ClubNews() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [, setClub] = useState<Club | null>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('recientes')

  const _canEdit = role === 'administrador' || usuario?.es_superadmin;

  // Split into recent (last 30 days) and older
  const { recientes, anteriores } = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    const rec: Noticia[] = []
    const ant: Noticia[] = []
    for (const n of noticias) {
      const date = new Date(n.fecha_creacion)
      if (date >= thirtyDaysAgo) {
        rec.push(n)
      } else {
        ant.push(n)
      }
    }
    // Both sorted newest first
    rec.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    ant.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    return { recientes: rec, anteriores: ant }
  }, [noticias])

  const filteredNoticias = activeTab === 'recientes' ? recientes : anteriores

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(c => setClub(c)).catch(() => {})

    const cargarNoticias = async () => {
      try {
        setLoading(true)
        const data = await NewsService.getAll(id, 0, 50)
        setNoticias(data)
      } catch (err) {
        setError('Error al cargar noticias')
      } finally {
        setLoading(false)
      }
    }

    cargarNoticias()
  }, [clubId, usuario, navigate])

  if (!usuario) return null

  return (
    <>
      <main className="club-detail-main">
        <div className="club-detail-container">

          <div className="header-actions">
            <h1>Noticias</h1>
            {_canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/clubes/${clubId}/noticias/crear`)}>
                + Nueva
              </button>
            )}
          </div>

          <div className="content-tabs">
            <button
              className={`content-tab ${activeTab === 'recientes' ? 'active' : ''}`}
              onClick={() => setActiveTab('recientes')}
            >
              Recientes · {recientes.length}
            </button>
            <button
              className={`content-tab ${activeTab === 'anteriores' ? 'active' : ''}`}
              onClick={() => setActiveTab('anteriores')}
            >
              Anteriores · {anteriores.length}
            </button>
          </div>
          
          {loading ? (
             <div className="loading">Cargando...</div>
          ) : error ? (
             <div className="alert alert-error">{error}</div>
          ) : (
             <NewsList
               noticias={filteredNoticias}
               clubId={parseInt(clubId!)}
               canEdit={_canEdit}
               groupByTime={activeTab === 'recientes'}
             />
          )}
        </div>
      </main>
    </>
  )
}
