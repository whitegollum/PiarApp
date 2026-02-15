import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NewsService } from '../services/contentService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

const EditNews: React.FC = () => {
  const { clubId, noticiaId } = useParams<{ clubId: string; noticiaId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'General',
    imagen_url: '',
    visible_para: 'publico',
    permite_comentarios: true,
    estado: 'publicada'
  });

  useEffect(() => {
    const fetchNews = async () => {
      if (!clubId || !noticiaId) return;
      try {
        const news = await NewsService.getById(parseInt(clubId), parseInt(noticiaId));
        setFormData({
          titulo: news.titulo,
          contenido: news.contenido,
          categoria: news.categoria || 'General',
          imagen_url: news.imagen_url || '',
          visible_para: news.visible_para || 'publico',
          permite_comentarios: news.permite_comentarios,
          estado: news.estado
        });
      } catch (err) {
        setError('Error al cargar la noticia.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [clubId, noticiaId]);

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
    if (!clubId || !noticiaId) return;
    
    setSaving(true);
    setError(null);

    try {
      await NewsService.update(parseInt(clubId), parseInt(noticiaId), formData);
      navigate(`/clubes/${clubId}/noticias`);
    } catch (err) {
      setError('Error al actualizar la noticia.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clubId || !noticiaId) return;
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta noticia? Esta acción no se puede deshacer.')) return;

    setSaving(true);
    try {
      await NewsService.delete(parseInt(clubId), parseInt(noticiaId));
      navigate(`/clubes/${clubId}/noticias`);
    } catch (err) {
      setError('Error al eliminar la noticia.');
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
            <h1>Editar Noticia</h1>
            <p className="subtitle">Modifica los detalles de la noticia</p>
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="imagen_url">URL de Imagen</label>
              <input
                type="url"
                id="imagen_url"
                name="imagen_url"
                value={formData.imagen_url}
                onChange={handleChange}
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
                <option value="borrador">Borrador</option>
                <option value="publicada">Publicada</option>
                <option value="archivada">Archivada</option>
              </select>
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

export default EditNews;
