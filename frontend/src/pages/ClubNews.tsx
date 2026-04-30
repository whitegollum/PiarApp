import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NewsService } from '../services/contentService'
import { Noticia } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import NewsList from '../components/NewsList'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubNews() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canEdit = role === 'administrador' || usuario?.es_superadmin;

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(setClub).catch(() => {})

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
      <Navbar clubName={club?.nombre} clubId={clubId} canEdit={canEdit} />
      <main className="club-detail-main">
        <div className="club-detail-container">
          <button
            className="btn-volver-tareas"
            onClick={() => navigate(`/clubes/${clubId}`)}
          >
            ← Volver al club
          </button>

          <div className="header-actions">
            <h1>Noticias del Club</h1>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}/noticias/crear`)}>
                + Nueva Noticia
              </button>
            )}
          </div>
          
          {loading ? (
             <div className="loading">Cargando...</div>
          ) : error ? (
             <div className="alert alert-error">{error}</div>
          ) : (
             <NewsList noticias={noticias} clubId={parseInt(clubId!)} canEdit={canEdit} />
          )}
        </div>
      </main>
    </>
  )
}
