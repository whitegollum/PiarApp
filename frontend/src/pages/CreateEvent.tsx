import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventService, UploadService } from '../services/contentService';
import '../styles/Forms.css';

const CreateEvent: React.FC = () => {
    const { clubId } = useParams<{ clubId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagenMode, setImagenMode] = useState<'url' | 'file'>('url');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        estado: 'no_iniciado',
        imagen_url: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImagePreview(URL.createObjectURL(file));
        setUploadingImage(true);
        try {
            const url = await UploadService.uploadImage(file);
            setFormData(prev => ({ ...prev, imagen_url: url }));
        } catch (err: any) {
            setError(err.message || 'Error subiendo imagen');
            setImagePreview(null);
        } finally {
            setUploadingImage(false);
        }
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
                imagen_url: formData.imagen_url.trim() || null,
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

                        <div className="form-group">
                            <label>Imagen (Opcional)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <button
                                    type="button"
                                    className={`btn ${imagenMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}
                                    onClick={() => { setImagenMode('url'); setImagePreview(null); setFormData(p => ({ ...p, imagen_url: '' })); }}
                                >
                                    URL
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${imagenMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}
                                    onClick={() => { setImagenMode('file'); setFormData(p => ({ ...p, imagen_url: '' })); }}
                                >
                                    Subir archivo
                                </button>
                            </div>
                            {imagenMode === 'url' ? (
                                <input
                                    type="url"
                                    id="imagen_url"
                                    name="imagen_url"
                                    value={formData.imagen_url}
                                    onChange={handleChange}
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                />
                            ) : (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        style={{ width: '100%' }}
                                    >
                                        {uploadingImage ? 'Subiendo...' : 'Seleccionar imagen'}
                                    </button>
                                    {imagePreview && (
                                        <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setImagePreview(null); setFormData(p => ({ ...p, imagen_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', lineHeight: '24px', textAlign: 'center', padding: 0 }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
