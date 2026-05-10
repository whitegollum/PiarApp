import React, { useMemo } from 'react'
import { Evento } from '../types/models'
import EventCard from './EventCard'
import '../styles/EventList.css'

interface EventListProps {
  eventos: Evento[]
  clubId: number
  canEdit?: boolean
  groupByTime?: boolean
}

interface EventGroup {
  label: string
  eventos: Evento[]
}

function groupEventsByTime(eventos: Evento[]): EventGroup[] {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const thisWeek: Evento[] = []
  const thisMonth: Evento[] = []
  const later: Evento[] = []

  for (const ev of eventos) {
    const date = new Date(ev.fecha_inicio)
    if (date < endOfWeek) {
      thisWeek.push(ev)
    } else if (date <= endOfMonth) {
      thisMonth.push(ev)
    } else {
      later.push(ev)
    }
  }

  const groups: EventGroup[] = []
  if (thisWeek.length > 0) groups.push({ label: 'ESTA SEMANA', eventos: thisWeek })
  if (thisMonth.length > 0) groups.push({ label: 'ESTE MES', eventos: thisMonth })
  if (later.length > 0) groups.push({ label: 'MÁS ADELANTE', eventos: later })
  return groups
}

const EventList: React.FC<EventListProps> = ({ eventos, clubId, canEdit = false, groupByTime = false }) => {

  const groups = useMemo(() => {
    if (groupByTime) return groupEventsByTime(eventos)
    return [{ label: '', eventos }]
  }, [eventos, groupByTime])

  if (eventos.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay eventos programados.</p>
      </div>
    )
  }

  return (
    <div className="events-list">
      {groups.map((group) => (
        <div key={group.label || 'all'} className="event-group">
          {group.label && <h3 className="event-group-label">{group.label}</h3>}
          {group.eventos.map((evento) => (
            <EventCard key={evento.id} evento={evento} clubId={clubId} canEdit={canEdit} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default EventList
