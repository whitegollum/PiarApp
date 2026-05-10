import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EventService } from '../services/contentService'
import { Evento } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import APIService from '../services/api'
import EventList from '../components/EventList'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
  color_acento?: string
}

type TabFilter = 'proximos' | 'pasados'

export default function ClubEvents() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [, setClub] = useState<Club | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('proximos')

  const _canEdit = role === 'administrador' || usuario?.es_superadmin;

  const now = useMemo(() => new Date(), [])

  const { proximos, pasados } = useMemo(() => {
    const prox: Evento[] = []
    const past: Evento[] = []
    for (const ev of eventos) {
      const end = ev.fecha_fin ? new Date(ev.fecha_fin) : null
      const start = new Date(ev.fecha_inicio)
      if ((end && now > end) || (!end && now > start)) {
        past.push(ev)
      } else {
        prox.push(ev)
      }
    }
    // Próximos: soonest first
    prox.sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    // Pasados: most recent first
    past.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
    return { proximos: prox, pasados: past }
  }, [eventos, now])

  const filteredEventos = activeTab === 'proximos' ? proximos : pasados

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
      <main className="club-detail-main">
        <div className="club-detail-container">

          <div className="header-actions">
            <h1>Eventos</h1>
            {_canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/clubes/${clubId}/eventos/crear`)}>
                + Nuevo
              </button>
            )}
          </div>

          <div className="event-tabs">
            <button
              className={`event-tab ${activeTab === 'proximos' ? 'active' : ''}`}
              onClick={() => setActiveTab('proximos')}
            >
              Próximos · {proximos.length}
            </button>
            <button
              className={`event-tab ${activeTab === 'pasados' ? 'active' : ''}`}
              onClick={() => setActiveTab('pasados')}
            >
              Pasados · {pasados.length}
            </button>
          </div>
          
          {loading ? (
             <div className="loading">Cargando...</div>
          ) : error ? (
             <div className="alert alert-error">{error}</div>
          ) : (
             <EventList
               eventos={filteredEventos}
               clubId={parseInt(clubId!)}
               canEdit={_canEdit}
               groupByTime={activeTab === 'proximos'}
             />
          )}
        </div>
      </main>
    </>
  )
}
