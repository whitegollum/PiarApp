import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventService } from '../services/contentService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

const CreateEvent: React.FC = () => {
    const { clubId } = useParams<{ clubId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clubId) return;

        setLoading(true);
        setError(null);

        try {
            // Combine date + time into ISO datetime strings
            const fechaInicioDatetime = formData.fecha_inicio + 'T' + (formData.hora_inicio || '00:00:00');
            const fechaFinDatetime = formData.fecha_fin 
                ? formData.fecha_fin + 'T' + (formData.hora_fin || '23:59:59')
                : null;

            const payload: any = {
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                tipo: formData.tipo,
                fecha_inicio: fechaInicioDatetime,
                fecha_fin: fechaFinDatetime,
                ubicacion: formData.ubicacion || null,
                aforo_maximo: formData.aforo_maximo ? parseInt(formData.aforo_maximo) : null,
                requisitos: formData.requisitos ? { notas: formData.requisitos } : {},
            };

            console.log('Sending event data:', payload);
            await EventService.create(parseInt(clubId), payload);
            navigate(`/clubes/${clubId}/eventos`);
        } catch (err: any) {
            // Handle validation errors from backend
            if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
                const validationErrors = err.response.data.detail
                    .map((e: any) => {
                        const field = e.loc?.[1] || 'campo';
                        const fieldNames: Record<string, string> = {
                            'nombre': 'Nombre',
                            'descripcion': 'Descripción',
                            'fecha_inicio': 'Fecha Inicio',
                            'fecha_fin': 'Fecha Fin',
                            'ubicacion': 'Ubicación',
                            'aforo_maximo': 'Aforo máximo'
                        };
                        const fieldName = fieldNames[field] || field;
                        return `${fieldName}: ${e.msg}`;
                    })
                    .join(', ');
                setError(validationErrors);
            } else {
                const errorMsg = err.response?.data?.detail || err.message || 'Error al crear el evento. Verifica los datos.';
                setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
            }
            console.error('Error creating event:', err);
            console.error('Error response:', err.response?.data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-layout">
            <Navbar />
            <main className="form-main">
                <div className="form-container">
                    <div className="form-header">
                        <h1>Nuevo Evento</h1>
                        <p className="subtitle">Agenda un nuevo evento para el club</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="nombre">Nombre del Evento *</label>
                            <input
                                type="text"
                                id="nombre"
                                name="nombre"
                                required
                                minLength={5}
                                maxLength={200}
                                value={formData.nombre}
                                onChange={handleChange}
                                placeholder="Nombre del evento (mínimo 5 caracteres)"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="tipo">Tipo de Evento</label>
                            <select
                                id="tipo"
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                            >
                                <option value="social">Social</option>
                                <option value="competicion">Competición</option>
                                <option value="formacion">Formación</option>
                                <option value="volar_grupo">Vuelo en Grupo</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="ubicacion">Ubicación</label>
                            <input
                                type="text"
                                id="ubicacion"
                                name="ubicacion"
                                value={formData.ubicacion}
                                onChange={handleChange}
                                placeholder="Ej: Pista Principal"
                            />
                        </div>

                        {/* Dates grid - simulated with inline style */}
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
                                minLength={10}
                                maxLength={10000}
                                rows={4}
                                value={formData.descripcion}
                                onChange={handleChange}
                                placeholder="Descripción del evento (mínimo 10 caracteres)"
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
                                placeholder="Información adicional..."
                            />
                        </div>

                        <div className="form-actions">
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
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? 'Guardando...' : 'Crear Evento'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateEvent;
