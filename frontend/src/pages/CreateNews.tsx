import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NewsService, UploadService } from '../services/contentService';
import '../styles/Forms.css';

const CreateNews: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagenMode, setImagenMode] = useState<'url' | 'file'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'general',
    imagen_url: '',
    visible_para: 'socios', // Default visibility
    permite_comentarios: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
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
      // Prepare data - convert empty strings to undefined for optional fields
      const dataToSend = {
        ...formData,
        imagen_url: formData.imagen_url.trim() === '' ? undefined : formData.imagen_url
      };
      
      console.log('Sending news data:', dataToSend);
      await NewsService.create(parseInt(clubId), dataToSend);
      navigate(`/clubes/${clubId}/noticias`);
    } catch (err: any) {
      // Handle validation errors from backend
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
        const validationErrors = err.response.data.detail
          .map((e: any) => {
            const field = e.loc?.[1] || 'campo';
            const fieldNames: Record<string, string> = {
              'titulo': 'Título',
              'contenido': 'Contenido',
              'categoria': 'Categoría',
              'imagen_url': 'URL de Imagen'
            };
            const fieldName = fieldNames[field] || field;
            return `${fieldName}: ${e.msg}`;
          })
          .join(', ');
        setError(validationErrors);
      } else {
        const errorMsg = err.response?.data?.detail || err.message || 'Error al crear la noticia. Inténtalo de nuevo.';
        setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      console.error('Error creating news:', err);
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
            <h1>Nueva Noticia</h1>
            <p className="subtitle">Publica una novedad para los miembros del club</p>
          </div>
        
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="titulo">Título *</label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                required
                minLength={5}
                maxLength={200}
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Título de la noticia (mínimo 5 caracteres)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="categoria">Categoría</label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
              >
                <option value="general">General</option>
                <option value="competicion">Competición</option>
                <option value="social">Social</option>
                <option value="avisos">Avisos</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contenido">Contenido *</label>
              <textarea
                id="contenido"
                name="contenido"
                required
                minLength={10}
                maxLength={10000}
                rows={6}
                value={formData.contenido}
                onChange={handleChange}
                placeholder="Escribe el contenido de la noticia (mínimo 10 caracteres)..."
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="permite_comentarios"
                  name="permite_comentarios"
                  checked={formData.permite_comentarios}
                  onChange={handleCheckboxChange}
                  style={{ width: 'auto'}}
                />
                <label htmlFor="permite_comentarios">
                  Permitir comentarios
                </label>
            </div>

            <div className="form-group">
              <label htmlFor="visible_para">Visibilidad</label>
              <select
                id="visible_para"
                name="visible_para"
                value={formData.visible_para}
                onChange={handleChange}
              >
                <option value="publico">Público</option>
                <option value="socios">Solo Socios</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary"
                style={{ backgroundColor: '#e2e8f0', color: '#4a5568' }} // Inline style for secondary button if class missing
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Creando...' : 'Publicar Noticia'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateNews;
