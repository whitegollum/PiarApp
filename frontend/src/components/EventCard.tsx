import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, CheckCircle, Timer, MoreVertical, Pencil } from 'lucide-react'
import { Evento, Asistencia } from '../types/models'
import { EventService } from '../services/contentService'
import '../styles/EventList.css'

interface EventCardProps {
    evento: Evento & { inscritos_count?: number }
    clubId: number
    canEdit?: boolean
}

const HIDDEN_TYPES = ['otro', 'social', '']

const EventCard: React.FC<EventCardProps> = ({ evento, clubId, canEdit = false }) => {
    const [attendance, setAttendance] = useState<Asistencia | null>(null);
    const [inscritosCount, setInscritosCount] = useState(evento.inscritos_count || 0);
    const [loading, setLoading] = useState(false);
    const [statusLoaded, setStatusLoaded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Attendees inline
    const [attendeesList, setAttendeesList] = useState<Asistencia[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const [attendeesLoaded, setAttendeesLoaded] = useState(false);

    useEffect(() => {
        setInscritosCount(evento.inscritos_count || 0);
    }, [evento.inscritos_count]);

    useEffect(() => {
        let isMounted = true;
        const fetchAttendance = async () => {
            try {
                const data = await EventService.getMyAttendance(clubId, evento.id);
                if (isMounted) setAttendance(data && data.estado !== 'cancelado' ? data : null);
            } catch {
                // ignore
            } finally {
                if (isMounted) setStatusLoaded(true);
            }
        };
        fetchAttendance();
        return () => { isMounted = false; };
    }, [clubId, evento.id]);

    // Load attendees for avatar row
    useEffect(() => {
        let isMounted = true;
        const fetchAttendees = async () => {
            setLoadingAttendees(true);
            try {
                const list = await EventService.getAttendees(clubId, evento.id);
                if (isMounted) {
                    setAttendeesList(list);
                    setAttendeesLoaded(true);
                }
            } catch {
                // ignore
            } finally {
                if (isMounted) setLoadingAttendees(false);
            }
        };
        fetchAttendees();
        return () => { isMounted = false; };
    }, [clubId, evento.id]);

    // Close kebab on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const handleRSVP = async (newStatus: 'inscrito' | 'cancelado') => {
        setLoading(true);
        const oldStatus = attendance?.estado || 'cancelado';
        try {
            const result = await EventService.registerAttendance(clubId, evento.id, newStatus);
            const finalStatus = result.estado;
            setAttendance(finalStatus === 'cancelado' ? null : result);

            if (oldStatus !== 'inscrito' && finalStatus === 'inscrito') {
                setInscritosCount(prev => prev + 1);
            } else if (oldStatus === 'inscrito' && finalStatus !== 'inscrito') {
                setInscritosCount(prev => Math.max(0, prev - 1));
            }

            if (finalStatus === 'lista_espera' && newStatus === 'inscrito') {
                alert("El evento está completo. Has sido añadido a la lista de espera.");
            }

            // Refresh attendees
            const list = await EventService.getAttendees(clubId, evento.id);
            setAttendeesList(list);
        } catch {
            alert("Error al actualizar inscripción");
        } finally {
            setLoading(false);
        }
    };

    const getEventStatus = (ev: Evento) => {
        const now = new Date()
        const start = new Date(ev.fecha_inicio)
        const end = ev.fecha_fin ? new Date(ev.fecha_fin) : null
        if (end && now > end) return 'finalizado'
        if (now >= start) return 'en_curso'
        return 'proximo'
    }

    const eventStatus = getEventStatus(evento);
    const isPast = eventStatus === 'finalizado';

    // Capacity bar
    const hasCapacity = !!evento.aforo_maximo;
    const capacityPct = hasCapacity ? Math.min((inscritosCount / evento.aforo_maximo!) * 100, 100) : 0;
    const capacityLabel = capacityPct >= 90 ? 'Casi completo' : capacityPct >= 60 ? 'Llenándose' : 'Hay sitio';
    const capacityColor = capacityPct >= 90 ? '#d97706' : capacityPct >= 60 ? '#eab308' : '#22c55e';

    // Type pill: hide generic types
    const showType = evento.tipo && !HIDDEN_TYPES.includes(evento.tipo.toLowerCase());

    // Avatars: show max 3 + count
    const visibleAttendees = attendeesList.filter(a => a.estado === 'inscrito').slice(0, 3);
    const totalInscritos = attendeesLoaded ? attendeesList.filter(a => a.estado === 'inscrito').length : inscritosCount;
    const extraCount = Math.max(0, totalInscritos - visibleAttendees.length);

    const avatarColors = ['#e0e7ff', '#fce7f3', '#d1fae5', '#fef3c7', '#e0f2fe'];

    return (
        <div className="event-card-v2">
            {evento.imagen_url && (
                <Link to={`/clubes/${clubId}/eventos/${evento.id}`} className="event-card-image-link">
                    <img
                        src={evento.imagen_url}
                        alt={evento.nombre}
                        className="event-card-banner"
                        onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                    />
                </Link>
            )}
            <div className="event-card-top">
                <div className="event-date-box">
                    <span className="day">{new Date(evento.fecha_inicio).getDate()}</span>
                    <span className="month">
                        {new Date(evento.fecha_inicio).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                    </span>
                </div>

                <div className="event-card-body">
                    <div className="event-card-title-row">
                        <Link
                            to={`/clubes/${clubId}/eventos/${evento.id}`}
                            className="event-title-link"
                        >
                            <h3 className="event-title">{evento.nombre}</h3>
                        </Link>

                        {canEdit && (
                            <div className="event-kebab" ref={menuRef}>
                                <button className="event-kebab-btn" onClick={() => setShowMenu(!showMenu)}>
                                    <MoreVertical size={18} />
                                </button>
                                {showMenu && (
                                    <div className="event-kebab-menu">
                                        <Link
                                            to={`/clubes/${clubId}/eventos/${evento.id}/editar`}
                                            className="event-kebab-item"
                                            onClick={() => setShowMenu(false)}
                                        >
                                            <Pencil size={14} /> Editar evento
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="event-meta">
                        <span className="event-time">
                            <Clock size={14} /> {new Date(evento.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {evento.ubicacion && (
                            <span className="event-location"><MapPin size={14} /> {evento.ubicacion}</span>
                        )}
                        {showType && (
                            <span className="event-type-pill">{evento.tipo}</span>
                        )}
                    </div>

                    {/* Capacity bar */}
                    {hasCapacity && (
                        <div className="event-capacity-section">
                            <div className="event-capacity-labels">
                                <span>{inscritosCount} de {evento.aforo_maximo} plazas</span>
                                <span style={{ color: capacityColor, fontWeight: 500 }}>{capacityLabel}</span>
                            </div>
                            <div className="event-capacity-bar">
                                <div
                                    className="event-capacity-fill"
                                    style={{ width: `${capacityPct}%`, backgroundColor: capacityColor }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {evento.descripcion && (
                        <p className="event-description">
                            {evento.descripcion.length > 120
                                ? `${evento.descripcion.substring(0, 120)}...`
                                : evento.descripcion}
                        </p>
                    )}

                    {/* CTA button */}
                    {!isPast && statusLoaded && (
                        <div className="event-cta">
                            {(!attendance || attendance.estado === 'cancelado') ? (
                                <button
                                    onClick={() => handleRSVP('inscrito')}
                                    disabled={loading}
                                    className="event-cta-btn"
                                >
                                    {loading ? '...' : 'Inscribirme'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleRSVP('cancelado')}
                                    disabled={loading}
                                    className="event-cta-btn event-cta-cancel"
                                >
                                    {loading ? '...' : (
                                        attendance.estado === 'inscrito'
                                            ? <><CheckCircle size={14} /> Inscrito — Cancelar</>
                                            : <><Timer size={14} /> En espera — Cancelar</>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Attendees inline */}
                    {!loadingAttendees && totalInscritos > 0 && (
                        <Link to={`/clubes/${clubId}/eventos/${evento.id}`} className="event-attendees-row">
                            <div className="event-avatars">
                                {visibleAttendees.map((att, i) => (
                                    <div
                                        key={att.id}
                                        className="event-avatar"
                                        style={{ backgroundColor: avatarColors[i % avatarColors.length], zIndex: visibleAttendees.length - i }}
                                    >
                                        {(att.usuario?.nombre_completo || 'U')[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            <span className="event-attendees-label">
                                + {extraCount > 0 ? extraCount : ''} {totalInscritos === 1 ? 'socio inscrito' : 'socios inscritos'}
                            </span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EventCard
