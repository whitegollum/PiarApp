import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Evento, Asistencia } from '../types/models'
import { EventService } from '../services/contentService'
import '../styles/EventList.css'

interface EventCardProps {
    evento: Evento
    clubId: number
    canEdit?: boolean // Add optional prop
}

const EventCard: React.FC<EventCardProps> = ({ evento, clubId, canEdit = false }) => {
    const [attendance, setAttendance] = useState<Asistencia | null>(null);
    const [inscritosCount, setInscritosCount] = useState(evento.inscritos_count || 0);
    const [loading, setLoading] = useState(false);
    const [statusLoaded, setStatusLoaded] = useState(false);

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
                setInscritosCount(prev => prev + 1);
            } else if (oldStatus === 'inscrito' && finalStatus !== 'inscrito') {
                setInscritosCount(prev => Math.max(0, prev - 1));
            }
            
            if (finalStatus === 'lista_espera' && newStatus === 'inscrito') {
                alert("El evento está completo. Has sido añadido a la lista de espera.");
            }

        } catch (err) {
            console.error("Error updating attendance", err);
            alert("Error al actualizar inscripción");
        } finally {
            setLoading(false);
        }
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
        <div className={`event-card ${eventStatus}`}>
            <div className="event-date-box">
                <span className="day">{new Date(evento.fecha_inicio).getDate()}</span>
                <span className="month">
                    {new Date(evento.fecha_inicio).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                </span>
            </div>
            <div className="event-details">
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
            
            <div className="event-actions">
                {!isPast && statusLoaded && (
                    <>
                        {!attendance ? (
                            <button 
                                onClick={() => handleRSVP('inscrito')} 
                                disabled={loading}
                                className="btn btn-sm btn-primary"
                                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
                            >
                                {loading ? '...' : 'Inscribirse'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleRSVP('cancelado')} 
                                disabled={loading}
                                className="btn btn-sm btn-outline"
                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                            >
                                {loading ? '...' : 'Cancelar'}
                            </button>
                        )}
                    </>
                )}
                
                {canEdit && (
                    <Link to={`/clubes/${clubId}/eventos/${evento.id}/editar`} className="btn btn-sm" style={{ marginLeft: '8px', background: 'none', border: '1px solid #ccc', color: '#666', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✏️
                    </Link>
                )}
            </div>
        </div>
    )
}

export default EventCard
