import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NewsService } from '../services/contentService'
import { Noticia } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import Navbar from '../components/Navbar'
import NewsList from '../components/NewsList'
import '../styles/ClubDetail.css' // Reuse styles

export default function ClubNews() {
  const { usuario, logout } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canEdit = role === 'administrador' || usuario?.es_superadmin;

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const cargarNoticias = async () => {
      try {
        setLoading(true)
        const data = await NewsService.getAll(parseInt(clubId), 0, 50)
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
      <Navbar />
      <main className="club-detail-main">
        <div className="club-detail-container">
          <div className="header-actions">
            <button className="btn btn-back" onClick={() => navigate(`/clubes/${clubId}`)}>← Volver al Club</button>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}/noticias/crear`)}>
                + Nueva Noticia
              </button>
            )}
          </div>
          
          <h1>Noticias del Club</h1>
          
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
