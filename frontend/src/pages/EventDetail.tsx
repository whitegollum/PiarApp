import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { EventService } from '../services/contentService'
import { Pencil, Calendar, Clock, MapPin, Users, CheckCircle, Timer } from 'lucide-react'
import APIService from '../services/api'
import { Evento, Asistencia } from '../types/models'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function EventDetail() {
  const { clubId, eventoId } = useParams<{ clubId: string; eventoId: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { role } = useClubRole(clubId)

  const [club, setClub] = useState<Club | null>(null)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [attendance, setAttendance] = useState<Asistencia | null>(null)
  const [attendees, setAttendees] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [inscritosCount, setInscritosCount] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const canEdit = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin

  useEffect(() => {
    if (!clubId || !eventoId) return
    const cid = parseInt(clubId)
    const eid = parseInt(eventoId)

    Promise.all([
      APIService.get<Club>(`/clubes/${cid}`),
      EventService.getById(cid, eid),
      EventService.getAttendees(cid, eid).catch(() => []),
      EventService.getMyAttendance(cid, eid).catch(() => null),
    ]).then(([clubData, eventoData, attendeesData, myAttendance]) => {
      setClub(clubData)
      setEvento(eventoData)
      setAttendees(attendeesData)
      setInscritosCount(attendeesData.filter((a: Asistencia) => a.estado === 'inscrito').length)
      setAttendance(myAttendance && myAttendance.estado !== 'cancelado' ? myAttendance : null)
    }).catch(() => {
      navigate(`/clubes/${clubId}/eventos`)
    }).finally(() => setLoading(false))
  }, [clubId, eventoId])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxOpen])

  const handleRSVP = async (newStatus: 'inscrito' | 'cancelado') => {
    if (!clubId || !eventoId) return
    setRsvpLoading(true)
    const oldStatus = attendance?.estado || 'cancelado'
    try {
      const result = await EventService.registerAttendance(parseInt(clubId), parseInt(eventoId), newStatus)
      const finalStatus = result.estado
      setAttendance(finalStatus === 'cancelado' ? null : result)
      if (oldStatus !== 'inscrito' && finalStatus === 'inscrito') {
        setInscritosCount(prev => prev + 1)
      } else if (oldStatus === 'inscrito' && finalStatus !== 'inscrito') {
        setInscritosCount(prev => Math.max(0, prev - 1))
      }
      const updated = await EventService.getAttendees(parseInt(clubId), parseInt(eventoId)).catch(() => [])
      setAttendees(updated)
      if (finalStatus === 'lista_espera' && newStatus === 'inscrito') {
        alert('El evento está completo. Has sido añadido a la lista de espera.')
      }
    } catch {
      alert('Error al actualizar inscripción')
    } finally {
      setRsvpLoading(false)
    }
  }

  if (loading) return <div className="loading-container"><p>Cargando evento...</p></div>
  if (!evento) return null

  const now = new Date()
  const start = new Date(evento.fecha_inicio)
  const end = evento.fecha_fin ? new Date(evento.fecha_fin) : null
  const isPast = end ? now > end : now > start
  const isFull = evento.aforo_maximo !== undefined && evento.aforo_maximo !== null && inscritosCount >= evento.aforo_maximo

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page-container">
      <div className="content-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
          <Link to={`/clubes/${clubId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            {club?.nombre || 'Club'}
          </Link>
          {' › '}
          <Link to={`/clubes/${clubId}/eventos`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Eventos
          </Link>
          {' › '}
          <span>{evento.nombre}</span>
        </div>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                {evento.tipo || 'Social'}
              </span>
              <h1 style={{ margin: '8px 0 0', fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{evento.nombre}</h1>
            </div>
            {canEdit && (
              <Link
                to={`/clubes/${clubId}/eventos/${eventoId}/editar`}
                style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Pencil size={14} /> Editar
              </Link>
            )}
          </div>

          {/* Event image */}
          {evento.imagen_url && (
            <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', maxHeight: '320px', cursor: 'zoom-in' }}
                 onClick={() => setLightboxOpen(true)}>
              <img
                src={evento.imagen_url}
                alt={evento.nombre}
                style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
                onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            </div>
          )}

          {/* Lightbox */}
          {lightboxOpen && evento.imagen_url && (
            <div
              onClick={() => setLightboxOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'zoom-out',
              }}
            >
              <img
                src={evento.imagen_url}
                alt={evento.nombre}
                style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '4px' }}
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={() => setLightboxOpen(false)}
                style={{
                  position: 'fixed', top: '16px', right: '16px',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: '40px', height: '40px',
                  fontSize: '20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Meta info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
              <Calendar size={16} />
              <span>{formatDate(evento.fecha_inicio)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
              <Clock size={16} />
              <span>
                {formatTime(evento.fecha_inicio)}
                {evento.fecha_fin && ` – ${formatTime(evento.fecha_fin)}`}
              </span>
            </div>
            {evento.ubicacion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
                <MapPin size={16} />
                <span>{evento.ubicacion}</span>
              </div>
            )}
            {evento.aforo_maximo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isFull ? '#d97706' : '#374151' }}>
                <Users size={16} />
                <span>{inscritosCount} / {evento.aforo_maximo} plazas{isFull && ' (Lleno)'}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <p style={{ marginTop: '20px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {evento.descripcion}
          </p>

          {/* RSVP */}
          {!isPast && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {attendance ? (
                <>
                  <span style={{ background: attendance.estado === 'inscrito' ? '#d1fae5' : '#fef3c7', color: attendance.estado === 'inscrito' ? '#065f46' : '#92400e', padding: '6px 14px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {attendance.estado === 'inscrito' ? <><CheckCircle size={14} /> Inscrito</> : <><Timer size={14} /> En lista de espera</>}
                  </span>
                  <button
                    onClick={() => handleRSVP('cancelado')}
                    disabled={rsvpLoading}
                    style={{ background: 'white', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {rsvpLoading ? '...' : 'Cancelar inscripción'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRSVP('inscrito')}
                  disabled={rsvpLoading}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
                >
                  {rsvpLoading ? '...' : 'Inscribirse'}
                </button>
              )}
            </div>
          )}
          {isPast && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
              <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '6px 14px', borderRadius: '20px', fontSize: '0.9rem' }}>Evento finalizado</span>
            </div>
          )}
        </div>

        {/* Attendees */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
            Asistentes ({inscritosCount})
          </h2>
          {attendees.length === 0 ? (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aún no hay inscritos.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendees.map(att => (
                <li key={att.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: '8px', background: att.estado === 'inscrito' ? '#f9fafb' : '#fff7ed',
                  border: `1px solid ${att.estado === 'inscrito' ? '#e5e7eb' : '#fed7aa'}`
                }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>
                    {att.usuario?.nombre_completo || att.usuario?.email || `Usuario ${att.usuario_id}`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: att.estado === 'inscrito' ? '#059669' : '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    {att.estado === 'inscrito' ? <><CheckCircle size={12} /> Inscrito</> : <><Timer size={12} /> Lista espera</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
