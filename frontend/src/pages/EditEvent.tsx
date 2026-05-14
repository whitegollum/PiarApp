import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventService, UploadService } from '../services/contentService';
import '../styles/Forms.css';

const EditEvent: React.FC = () => {
    const { clubId, eventoId } = useParams<{ clubId: string; eventoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

                const existingImageUrl = event.imagen_url || '';
                setFormData({
                    nombre: event.nombre,
                    descripcion: event.descripcion,
                    tipo: event.tipo || 'social',
                    fecha_inicio: start.date,
                    hora_inicio: event.hora_inicio || start.time,
                    fecha_fin: end.date || start.date,
                    hora_fin: event.hora_fin || end.time,
                    ubicacion: event.ubicacion || '',
                    aforo_maximo: event.aforo_maximo ? event.aforo_maximo.toString() : '',
                    requisitos: event.requisitos && event.requisitos.notas ? event.requisitos.notas : '',
                    estado: event.estado,
                    imagen_url: existingImageUrl,
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
        if (!clubId || !eventoId) return;

        setSaving(true);
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
                estado: formData.estado,
                aforo_maximo: formData.aforo_maximo ? parseInt(formData.aforo_maximo) : null,
                requisitos: formData.requisitos ? { notas: formData.requisitos } : {},
                imagen_url: formData.imagen_url.trim() || null,
            };

            console.log('Updating event data:', payload);
            await EventService.update(parseInt(clubId), parseInt(eventoId), payload);
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
                const errorMsg = err.response?.data?.detail || err.message || 'Error al actualizar el evento.';
                setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
            }
            console.error('Error updating event:', err);
            console.error('Error response:', err.response?.data);
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
                                    minLength={5}
                                    maxLength={200}
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Nombre del evento (mínimo 5 caracteres)"
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
                            {imagenMode === 'url' && formData.imagen_url.trim() && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <img
                                        src={formData.imagen_url}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }}
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
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
