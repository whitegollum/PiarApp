import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NewsService } from '../services/contentService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

const CreateNews: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'General',
    imagen_url: '',
    visible_para: 'publico', // Default visibility
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      await NewsService.create(parseInt(id), formData);
      navigate(`/clubes/${id}/noticias`);
    } catch (err) {
      setError('Error al crear la noticia. Inténtalo de nuevo.');
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
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Título de la noticia"
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
                <option value="General">General</option>
                <option value="Competicion">Competición</option>
                <option value="Social">Social</option>
                <option value="Avisos">Avisos</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contenido">Contenido *</label>
              <textarea
                id="contenido"
                name="contenido"
                required
                rows={6}
                value={formData.contenido}
                onChange={handleChange}
                placeholder="Escribe el contenido de la noticia..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="imagen_url">URL de Imagen (Opcional)</label>
              <input
                type="url"
                id="imagen_url"
                name="imagen_url"
                value={formData.imagen_url}
                onChange={handleChange}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
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
                <option value="miembros">Solo Miembros</option>
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
