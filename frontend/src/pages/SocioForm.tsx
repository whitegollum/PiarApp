import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SocioService, { Socio, SocioCreate, SocioUpdate } from '../services/socioService';
import Navbar from '../components/Navbar';
import '../styles/Forms.css';

export default function SocioForm() {
  const navigate = useNavigate();
  const { clubId, socioId } = useParams<{ clubId: string; socioId: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const userIdParam = queryParams.get('userId');

  const isEdit = Boolean(socioId);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socioData, setSocioData] = useState<SocioCreate>({
    club_id: Number(clubId),
    usuario_id: userIdParam ? Number(userIdParam) : 0,
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    especialidades: [],
    estado: 'activo'
  });
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEdit && socioId) {
      loadSocio(Number(socioId));
    }
  }, [isEdit, socioId]);

  const loadSocio = async (id: number) => {
    try {
      setLoading(true);
      const data = await SocioService.getSocioById(id);
      setSocioData({
        club_id: data.club_id,
        usuario_id: data.usuario_id,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        especialidades: data.especialidades || [],
        estado: data.estado
      });
    } catch (err) {
      setError('Error al cargar datos del socio');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let savedSocio: Socio; 
      if (isEdit && socioId) {
        savedSocio = await SocioService.updateSocio(Number(socioId), socioData);
      } else {
        savedSocio = await SocioService.createSocio(socioData);
      }

      if (fotoFile) {
        await SocioService.uploadFoto(savedSocio.id, fotoFile);
      }

      navigate(`/clubes/${clubId}/miembros`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar socio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="form-container">
        <h1>{isEdit ? 'Editar Socio' : 'Nuevo Socio'}</h1>
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              value={socioData.nombre}
              onChange={(e) => setSocioData({...socioData, nombre: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={socioData.email}
              onChange={(e) => setSocioData({...socioData, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={socioData.telefono}
              onChange={(e) => setSocioData({...socioData, telefono: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <textarea
              value={socioData.direccion}
              onChange={(e) => setSocioData({...socioData, direccion: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select
              value={socioData.estado}
              onChange={(e) => setSocioData({...socioData, estado: e.target.value})}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="form-group">
            <label>Foto de Carnet</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFotoFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </>
  );
}
