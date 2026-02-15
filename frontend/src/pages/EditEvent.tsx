import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventService } from '../services/contentService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

const EditEvent: React.FC = () => {
    const { clubId, eventoId } = useParams<{ clubId: string; eventoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        tipo: 'social',
        fecha_inicio: '',
        fecha_fin: '',
        hora_inicio: '',
        hora_fin: '',
        ubicacion: '',
        aforo_maximo: '',
        requisitos: '',
        estado: 'no_iniciado'
    });

    useEffect(() => {
        const fetchEvent = async () => {
            if (!clubId || !eventoId) return;
            try {
                const event = await EventService.getById(parseInt(clubId), parseInt(eventoId));
                
                // Helper to extract date (YYYY-MM-DD) and time (HH:MM) from ISO string
                const parseDateTime = (isoString?: string) => {
                    if (!isoString) return { date: '', time: '' };
                    const dateObj = new Date(isoString);
                    const date = dateObj.toISOString().split('T')[0];
                    const time = dateObj.toTimeString().slice(0, 5); // HH:MM
                    return { date, time };
                };

                const start = parseDateTime(event.fecha_inicio);
                // Handle fecha_fin which might include time or be separate. 
                // Assuming API returns distinct fields or merged ISO. 
                // Based on types, backend sends explicit fields if available.
                // If backend sends combined ISO in fecha_inicio/fin, need to split.
                // Assuming models match what we sent in Create (separate date/time fields merged or stored).
                // Let's assume the API returns what matches our form for simplicity, or we adapt.
                // Actually `Evento` type has `fecha_inicio` as string (ISO).
                
                // If the backend stores them as DateTime, we need to split them for the form inputs.
                // `event.fecha_inicio` is likely "2023-10-10T10:00:00"
                
                const end = parseDateTime(event.fecha_fin);

                setFormData({
                    nombre: event.nombre,
                    descripcion: event.descripcion,
                    tipo: event.tipo || 'social',
                    fecha_inicio: start.date,
                    hora_inicio: event.hora_inicio || start.time, 
                    fecha_fin: end.date || start.date, // Default end date to start date if missing
                    hora_fin: event.hora_fin || end.time,
                    ubicacion: event.ubicacion || '',
                    aforo_maximo: event.aforo_maximo ? event.aforo_maximo.toString() : '',
                    requisitos: event.requisitos && event.requisitos.notas ? event.requisitos.notas : '',
                    estado: event.estado
                });
            } catch (err) {
                setError('Error al cargar el evento.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [clubId, eventoId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clubId || !eventoId) return;

        setSaving(true);
        setError(null);

        try {
            const payload: any = {
                ...formData,
                aforo_maximo: formData.aforo_maximo ? parseInt(formData.aforo_maximo) : undefined,
                requisitos: formData.requisitos ? { notas: formData.requisitos } : {},
            };

            await EventService.update(parseInt(clubId), parseInt(eventoId), payload);
            navigate(`/clubes/${clubId}/eventos`);
        } catch (err) {
            setError('Error al actualizar el evento.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!clubId || !eventoId) return;
        if (!window.confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

        setSaving(true);
        try {
            await EventService.delete(parseInt(clubId), parseInt(eventoId));
            navigate(`/clubes/${clubId}/eventos`);
        } catch (err) {
            setError('Error al eliminar el evento.');
            setSaving(false);
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="form-layout">
            <Navbar />
            <main className="form-main">
                <div className="form-container">
                    <div className="form-header">
                        <h1>Editar Evento</h1>
                        <p className="subtitle">Modifica los detalles del evento</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="form">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Evento *</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    required
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                                <select
                                    id="tipo"
                                    name="tipo"
                                    value={formData.tipo}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="social">Social</option>
                                    <option value="competicion">Competición</option>
                                    <option value="formacion">Formación</option>
                                    <option value="volar_grupo">Vuelo en Grupo</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                                <input
                                    type="text"
                                    id="ubicacion"
                                    name="ubicacion"
                                    value={formData.ubicacion}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label htmlFor="fecha_inicio">Fecha Inicio *</label>
                                <input
                                    type="date"
                                    id="fecha_inicio"
                                    name="fecha_inicio"
                                    required
                                    value={formData.fecha_inicio}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="hora_inicio">Hora Inicio</label>
                                <input
                                    type="time"
                                    id="hora_inicio"
                                    name="hora_inicio"
                                    value={formData.hora_inicio}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fecha_fin">Fecha Fin</label>
                                <input
                                    type="date"
                                    id="fecha_fin"
                                    name="fecha_fin"
                                    value={formData.fecha_fin}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="hora_fin">Hora Fin</label>
                                <input
                                    type="time"
                                    id="hora_fin"
                                    name="hora_fin"
                                    value={formData.hora_fin}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="descripcion">Descripción *</label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                required
                                rows={4}
                                value={formData.descripcion}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="aforo_maximo">Aforo Máximo</label>
                            <input
                                type="number"
                                id="aforo_maximo"
                                name="aforo_maximo"
                                value={formData.aforo_maximo}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="estado">Estado</label>
                            <select
                                id="estado"
                                name="estado"
                                value={formData.estado}
                                onChange={handleChange}
                            >
                                <option value="no_iniciado">No Iniciado</option>
                                <option value="en_curso">En Curso</option>
                                <option value="finalizado">Finalizado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="requisitos">Requisitos / Notas</label>
                            <textarea
                                id="requisitos"
                                name="requisitos"
                                rows={2}
                                value={formData.requisitos}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                             <button
                                type="button"
                                onClick={handleDelete}
                                className="btn"
                                style={{ backgroundColor: '#dc2626', color: 'white' }}
                                disabled={saving}
                              >
                                Eliminar
                              </button>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="btn btn-secondary"
                                    style={{ backgroundColor: '#e2e8f0', color: '#4a5568' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditEvent;
