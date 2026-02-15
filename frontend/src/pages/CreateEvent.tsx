import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventService } from '../services/contentService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

const CreateEvent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
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
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const payload: any = {
                ...formData,
                aforo_maximo: formData.aforo_maximo ? parseInt(formData.aforo_maximo) : undefined,
                requisitos: formData.requisitos ? { notas: formData.requisitos } : {},
            };

            await EventService.create(parseInt(id), payload);
            navigate(`/clubes/${id}/eventos`);
        } catch (err) {
            setError('Error al crear el evento. Verifica los datos.');
            console.error(err);
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
                                value={formData.nombre}
                                onChange={handleChange}
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
