import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EventService } from '../services/contentService'
import { Evento } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import APIService from '../services/api'
import Navbar from '../components/Navbar'
import EventList from '../components/EventList'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubEvents() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
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

    const cargarEventos = async () => {
      try {
        setLoading(true)
        const data = await EventService.getAll(id, 0, 50)
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
            <h1>Agenda de Eventos</h1>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}/eventos/crear`)}>
                + Nuevo Evento
              </button>
            )}
          </div>
          
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
