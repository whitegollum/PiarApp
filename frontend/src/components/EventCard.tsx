import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Evento, Asistencia } from '../types/models'
import { EventService } from '../services/contentService'
import '../styles/EventList.css'

interface EventCardProps {
    evento: Evento & { inscritos_count?: number } // extend interface
    clubId: number
    canEdit?: boolean // Add optional prop
}

const EventCard: React.FC<EventCardProps> = ({ evento, clubId, canEdit = false }) => {
    const [attendance, setAttendance] = useState<Asistencia | null>(null);
    const [inscritosCount, setInscritosCount] = useState(evento.inscritos_count || 0);
    const [loading, setLoading] = useState(false);
    const [statusLoaded, setStatusLoaded] = useState(false);
    
    // New state for attendees list
    const [showAttendees, setShowAttendees] = useState(false);
    const [attendeesList, setAttendeesList] = useState<Asistencia[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);

    useEffect(() => {
        setInscritosCount(evento.inscritos_count || 0); // Update if prop changes
    }, [evento.inscritos_count]);

    useEffect(() => {
        let isMounted = true;
        const fetchAttendance = async () => {
            try {
                const data = await EventService.getMyAttendance(clubId, evento.id);
                if (isMounted) setAttendance(data.estado === 'cancelado' ? null : data);
            } catch (err: any) {
                // 404 means no attendance, which is fine
            } finally {
                if (isMounted) setStatusLoaded(true);
            }
        };
        fetchAttendance();
        return () => { isMounted = false; };
    }, [clubId, evento.id]);

    const handleRSVP = async (newStatus: 'inscrito' | 'cancelado') => {
        setLoading(true); // Button loading state
        const oldStatus = attendance?.estado || 'cancelado';
        try {
            const result = await EventService.registerAttendance(clubId, evento.id, newStatus);
            const finalStatus = result.estado;
            
            setAttendance(finalStatus === 'cancelado' ? null : result);

            // Update local count
            if (oldStatus !== 'inscrito' && finalStatus === 'inscrito') {
                setInscritosCount((prev:any) => prev + 1);
            } else if (oldStatus === 'inscrito' && finalStatus !== 'inscrito') {
                setInscritosCount((prev:any) => Math.max(0, prev - 1));
            }
            
            if (finalStatus === 'lista_espera' && newStatus === 'inscrito') {
                alert("El evento está completo. Has sido añadido a la lista de espera.");
            }
            
            // Invalidate/Refresh attendees list if open
            if (showAttendees) {
                const list = await EventService.getAttendees(clubId, evento.id);
                setAttendeesList(list);
            }

        } catch (err) {
            console.error("Error updating attendance", err);
            alert("Error al actualizar inscripción");
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendees = async () => {
        if (!showAttendees && attendeesList.length === 0) {
            setLoadingAttendees(true);
            try {
                const list = await EventService.getAttendees(clubId, evento.id);
                setAttendeesList(list);
            } catch (err) {
                console.error("Error fetching attendees", err);
                // Fail silently or show toast
            } finally {
                setLoadingAttendees(false);
            }
        }
        setShowAttendees(!showAttendees);
    };

    const getEventStatus = (evento: Evento) => {
        const now = new Date()
        const start = new Date(evento.fecha_inicio)
        const end = evento.fecha_fin ? new Date(evento.fecha_fin) : null

        if (end && now > end) return 'finalizado'
        if (now >= start) return 'en_curso'
        return 'proximo'
    }

    const eventStatus = getEventStatus(evento);
    const isPast = eventStatus === 'finalizado';

    return (
        // !flex-col forces vertical stacking to accommodate the attendees list at the bottom
        <div className={`event-card ${eventStatus} !flex-col`}>
             {/* Inner container handles the responsive layout of the card content (Row on Desktop, Col on Mobile) */}
            <div className="w-full flex flex-col sm:flex-row">
                <div className="event-date-box">
                    <span className="day">{new Date(evento.fecha_inicio).getDate()}</span>
                    <span className="month">
                        {new Date(evento.fecha_inicio).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                    </span>
                </div>
                <div className="event-details min-w-0 flex-grow">
                    <div className="event-header">
                        <span className={`event-type ${evento.tipo}`}>{evento.tipo || 'Social'}</span>
                        <h3 className="event-title">{evento.nombre}</h3>
                    </div>
                    <div className="event-meta">
                        <span className="event-time">
                            🕒 {new Date(evento.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {evento.ubicacion && (
                            <span className="event-location">📍 {evento.ubicacion}</span>
                        )}
                    </div>

                    {/* Capacidad */}
                    {evento.aforo_maximo && (
                        <div className="event-capacity" style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                            <span style={{ fontWeight: 500 }}>Aforo: </span>
                            {inscritosCount} / {evento.aforo_maximo} plazas
                            
                            {inscritosCount >= evento.aforo_maximo && (
                                <span style={{ color: '#d97706', marginLeft: '8px', fontSize: '0.9em' }}>
                                    (Lista de Espera activa)
                                </span>
                            )}
                        </div>
                    )}

                    <p className="event-description">
                        {evento.descripcion.length > 100
                            ? `${evento.descripcion.substring(0, 100)}...`
                            : evento.descripcion}
                    </p>
                    
                    {attendance && (
                        <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                            Estado: 
                            <span className={`badge ${attendance.estado === 'inscrito' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} style={{ marginLeft: '5px', padding: '2px 8px', borderRadius: '4px', backgroundColor: attendance.estado === 'inscrito' ? '#d1fae5' : '#fef3c7' }}>
                                {attendance.estado === 'inscrito' ? '✅ Inscrito' : '⏳ Lista de Espera'}
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Modified container: vertical stack on mobile, flexible on desktop but with vertical alignment constraint */}
                <div className="event-actions w-full sm:w-48 flex flex-col gap-2 p-3 sm:p-4 border-t sm:border-t-0 sm:border-l border-gray-100 shrink-0 bg-gray-50 sm:bg-transparent">
                    {!isPast && statusLoaded && (
                        <>
                            {(!attendance || attendance.estado === 'cancelado') ? (
                                <button 
                                    onClick={() => handleRSVP('inscrito')} 
                                    disabled={loading}
                                    className="btn-outline w-full justify-center font-medium"
                                    style={{ backgroundColor: '#3b82f6', color: 'white', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center' }}
                                >
                                    {loading ? '...' : 'Inscribirse'}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleRSVP('cancelado')} 
                                    disabled={loading}
                                    className="btn-outline w-full justify-center font-medium"
                                    style={{ borderColor: '#ef4444', color: '#ef4444', background: 'white', display: 'flex', alignItems: 'center' }}
                                >
                                    {loading ? '...' : 'Cancelar'}
                                </button>
                            )}

                            <button 
                                onClick={toggleAttendees}
                                className="btn-outline w-full justify-center font-medium"
                                style={{ border: '1px solid #d1d5db', color: '#374151', background: 'white', display: 'flex', alignItems: 'center' }}
                            >
                                👥 Ver Asistentes ({inscritosCount})
                            </button>
                        </>
                    )}

                    {canEdit && (
                        <Link to={`/clubes/${clubId}/eventos/${evento.id}/editar`} 
                            className="btn-outline w-full justify-center font-medium" 
                            style={{ border: '1px solid #cbd5e1', color: '#64748b', background: 'white', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            ✏️ Editar Evento
                        </Link>
                    )}
                </div>
            </div>

            {showAttendees && (
                <div className="attendees-section w-full border-t border-gray-200 p-4 bg-gray-50">
                    <h4 style={{ fontSize: '0.95em', margin: '0 0 12px 0', color: '#4b5563', fontWeight: '600' }}>
                        Lista de Asistentes ({attendeesList.length})
                    </h4>
                    {loadingAttendees ? (
                        <div style={{ fontSize: '0.9em', color: '#6b7280', padding: '10px 0' }}>Cargando lista...</div>
                    ) : attendeesList.length === 0 ? (
                        <div style={{ fontSize: '0.9em', color: '#6b7280', padding: '10px 0', fontStyle: 'italic' }}>
                            Aún no hay inscritos. ¡Sé el primero!
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2 w-full">
                            {attendeesList.map(att => (
                                <li key={att.id} style={{ 
                                    background: att.estado === 'inscrito' ? 'white' : '#fff7ed', 
                                    padding: '10px 12px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.9em',
                                    border: '1px solid',
                                    borderColor: att.estado === 'inscrito' ? '#e5e7eb' : '#fed7aa',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{ 
                                            width: '24px', height: '24px', borderRadius: '50%', background: '#e0e7ff', 
                                            color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75em', fontWeight: 'bold'
                                        }}>
                                            {(att.usuario?.nombre_completo || 'U')[0].toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{att.usuario?.nombre_completo || 'Usuario'}</span>
                                    </div>
                                    <div>
                                        {att.estado === 'lista_espera' ? (
                                            <span style={{ fontSize: '0.75em', color: '#c2410c', background: '#ffedd5', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>En Espera</span>
                                        ) : (
                                            <span style={{ fontSize: '0.85em', color: '#10b981' }}>✓</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}

export default EventCard
