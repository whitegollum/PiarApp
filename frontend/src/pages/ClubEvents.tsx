import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EventService } from '../services/contentService'
import { Evento } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import Navbar from '../components/Navbar'
import EventList from '../components/EventList'
import '../styles/ClubDetail.css'

export default function ClubEvents() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canEdit = role === 'administrador' || usuario?.es_superadmin;

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const cargarEventos = async () => {
      try {
        setLoading(true)
        const data = await EventService.getAll(parseInt(clubId), 0, 50)
        setEventos(data)
      } catch (err) {
        setError('Error al cargar eventos')
      } finally {
        setLoading(false)
      }
    }

    cargarEventos()
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
              <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}/eventos/crear`)}>
                + Nuevo Evento
              </button>
            )}
          </div>
          
          <h1>Agenda de Eventos</h1>
          
          {loading ? (
             <div className="loading">Cargando...</div>
          ) : error ? (
             <div className="alert alert-error">{error}</div>
          ) : (
             <EventList eventos={eventos} clubId={parseInt(clubId!)} canEdit={canEdit} />
          )}
        </div>
      </main>
    </>
  )
}
