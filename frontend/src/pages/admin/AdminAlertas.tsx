import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alerta, AlertaListResponse } from '../../types/alerta';
import { alertaService } from '../../services/alertaService';
import AlertItem from '../../components/AlertItem';
import '../../styles/Alerts.css';

interface Club {
  id: number;
  nombre: string;
  slug: string;
}

const AdminAlertas: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [loadingClubes, setLoadingClubes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [total, setTotal] = useState(0);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: '',
    subtipo: '',
    severidad: '',
    estado: 'activa',
    usuario_id: undefined as number | undefined,
  });

  // Cargar lista de clubes al montar el componente
  useEffect(() => {
    const fetchClubes = async () => {
      setLoadingClubes(true);
      setError(null);
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/clubes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setClubes(data);
        // Seleccionar el primer club por defecto
        if (data.length > 0) {
          setSelectedClubId(data[0].id);
        }
      } catch (error: any) {
        console.error('[AdminAlertas] Error al cargar clubes:', error);
        setError(error.message || 'Error al cargar clubes');
      } finally {
        setLoadingClubes(false);
      }
    };

    fetchClubes();
  }, []);

  // Aplicar filtros desde query params (club y usuario)
  useEffect(() => {
    const clubParam = searchParams.get('club');
    const usuarioParam = searchParams.get('usuario');

    if (clubParam) {
      const clubId = parseInt(clubParam, 10);
      if (!isNaN(clubId)) {
        setSelectedClubId(clubId);
      }
    }

    if (usuarioParam) {
      const usuarioId = parseInt(usuarioParam, 10);
      if (!isNaN(usuarioId)) {
        setFiltros((prev) => ({ ...prev, usuario_id: usuarioId }));
      }
    }
  }, [searchParams]);

  const cargarAlertas = useCallback(async () => {
    if (!selectedClubId) return;

    setLoading(true);
    try {
      const data: AlertaListResponse = await alertaService.obtenerAlertasClub(
        selectedClubId,
        filtros
      );
      setAlertas(data.alertas);
      setTotal(data.total);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClubId, filtros]);

  useEffect(() => {
    if (selectedClubId) {
      cargarAlertas();
    }
  }, [selectedClubId, cargarAlertas]);

  const handleGenerarAlertas = async () => {
    if (!selectedClubId) return;

    try {
      setLoading(true);
      const result = await alertaService.generarAlertasClub(selectedClubId);
      
      const stats = result.estadisticas || result;
      
      // Mostrar mensaje primero
      alert(
        `Alertas generadas correctamente:\n\n` +
        `✅ Creadas: ${stats.creadas}\n` +
        `🔄 Actualizadas: ${stats.actualizadas}\n` +
        `✔️ Resueltas: ${stats.resueltas}`
      );
      
      // Recargar alertas DESPUÉS de cerrar el alert
      await cargarAlertas();
    } catch (error: any) {
      console.error('[AdminAlertas] Error:', error);
      alert(`Error al generar alertas:\n\n${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolver = async (alertaId: number) => {
    try {
      await alertaService.accionarAlerta(alertaId, 'resolver');
      // Recargar alertas
      await cargarAlertas();
    } catch (error) {
      console.error('Error al resolver alerta:', error);
      alert('Error al resolver alerta');
    }
  };

  const handleIgnorar = async (alertaId: number) => {
    try {
      await alertaService.accionarAlerta(alertaId, 'ignorar');
      // Recargar alertas
      await cargarAlertas();
    } catch (error) {
      console.error('Error al ignorar alerta:', error);
      alert('Error al ignorar alerta');
    }
  };

  const handleVerPerfil = (usuarioId: number) => {
    // Encontrar el slug del club seleccionado
    const club = clubes.find(c => c.id === selectedClubId);
    if (club) {
      navigate(`/clubs/${club.slug}/miembros/${usuarioId}`);
    }
  };

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
    }));
  };

  return (
    <div className="admin-alertas-container">
      <div className="alerts-list-header">
        <h1 className="alerts-list-title">🚨 Gestión de Alertas</h1>
        <button
          className="alert-btn alert-btn-ver"
          onClick={handleGenerarAlertas}
          disabled={loading || !selectedClubId}
        >
          🔄 Actualizar Alertas
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '1rem', 
          borderRadius: '8px', 
          margin: '1rem 0',
          border: '1px solid #ef5350'
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Selector de Club */}
      <div className="alerts-filters">
        <div className="alerts-filters-row">
          <div className="filter-group">
            <label>Club</label>
            <select
              value={selectedClubId || ''}
              onChange={(e) => setSelectedClubId(Number(e.target.value))}
              style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
              disabled={loadingClubes}
            >
              {loadingClubes ? (
                <option value="">Cargando clubes...</option>
              ) : (
                <>
                  <option value="">Selecciona un club</option>
                  {clubes.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.nombre}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="alerts-filters">
        <div className="alerts-filters-row">
          <div className="filter-group">
            <label>Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => handleFiltroChange('tipo', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="documento_por_vencer">Documento por vencer</option>
              <option value="documento_vencido">Documento vencido</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Documento</label>
            <select
              value={filtros.subtipo}
              onChange={(e) => handleFiltroChange('subtipo', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="carnet_piloto">Carnet de Piloto</option>
              <option value="seguro_rc">Seguro RC</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Severidad</label>
            <select
              value={filtros.severidad}
              onChange={(e) => handleFiltroChange('severidad', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="warning">⚠️ Aviso</option>
              <option value="danger">❌ Urgente</option>
              <option value="critical">🚨 Crítico</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
            >
              <option value="activa">Activas</option>
              <option value="resuelta">Resueltas</option>
              <option value="ignorada">Ignoradas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Indicador de filtro por usuario */}
      {filtros.usuario_id && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          margin: '1rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span style={{ fontSize: '0.95rem', color: '#856404' }}>
            Filtrando alertas del <strong>usuario ID: {filtros.usuario_id}</strong>
          </span>
          <button
            onClick={() => setFiltros(prev => ({ ...prev, usuario_id: undefined }))}
            style={{
              marginLeft: 'auto',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#ffc107',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: '#000'
            }}
          >
            ✖ Quitar filtro
          </button>
        </div>
      )}

      {/* Lista de alertas */}
      <div className="alerts-list-container">
        {loadingClubes ? (
          <div className="alerts-list-empty">
            <div className="alerts-list-empty-icon">⏳</div>
            <p>Cargando clubes...</p>
          </div>
        ) : clubes.length === 0 ? (
          <div className="alerts-list-empty">
            <div className="alerts-list-empty-icon">⚠️</div>
            <p>No hay clubes disponibles</p>
            <p style={{ fontSize: '0.9rem', color: '#999' }}>
              Verifica que seas superadmin y que existan clubes en el sistema.<br/>
              Si el problema persiste, revisa la consola del navegador (F12).
            </p>
          </div>
        ) : !selectedClubId ? (
          <div className="alerts-list-empty">
            <div className="alerts-list-empty-icon">👆</div>
            <p>Selecciona un club para ver las alertas</p>
          </div>
        ) : loading ? (
          <div className="alerts-list-empty">
            <div className="alerts-list-empty-icon">⏳</div>
            <p>Cargando alertas...</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="alerts-list-empty">
            <div className="alerts-list-empty-icon">✅</div>
            <p>No hay alertas {filtros.estado === 'activa' ? 'activas' : ''}</p>
            <p style={{ fontSize: '0.9rem', color: '#999' }}>
              ¡Excelente! No hay problemas pendientes.
            </p>
          </div>
        ) : (
          <>
            <div className="alerts-list-count">
              Mostrando {alertas.length} de {total} alertas
            </div>
            {alertas.map((alerta) => (
              <AlertItem
                key={alerta.id}
                alerta={alerta}
                onResolver={handleResolver}
                onIgnorar={handleIgnorar}
                onVerPerfil={handleVerPerfil}
                mostrarUsuario={true}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAlertas;
