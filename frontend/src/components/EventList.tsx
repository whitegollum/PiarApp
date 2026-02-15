import React from 'react'
import { Evento } from '../types/models'
import EventCard from './EventCard'
import '../styles/EventList.css'

interface EventListProps {
  eventos: Evento[]
  clubId: number
  canEdit?: boolean // Add optional prop
}

const EventList: React.FC<EventListProps> = ({ eventos, clubId, canEdit = false }) => {

  if (eventos.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay eventos programados.</p>
      </div>
    )
  }

  return (
    <div className="events-list">
      {eventos.map((evento) => (
        <EventCard key={evento.id} evento={evento} clubId={clubId} canEdit={canEdit} />
      ))}
    </div>
  )
}

export default EventList
