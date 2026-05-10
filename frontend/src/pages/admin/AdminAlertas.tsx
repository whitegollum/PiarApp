import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alerta, AlertaListResponse } from '../../types/alerta'
import { alertaService } from '../../services/alertaService'
import AlertItem from '../../components/AlertItem'
import Navbar from '../../components/Navbar'
import { ArrowLeft, RefreshCw, Filter, X, Bell, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import '../../styles/Forms.css'
import '../../styles/Alerts.css'

interface Club { id: number; nombre: string; slug: string }

interface FiltrosState {
  tipo: string
  subtipo: string
  severidad: string
  estado: string
  usuario_id: number | undefined
}

const FILTROS_INICIAL: FiltrosState = {
  tipo: '',
  subtipo: '',
  severidad: '',
  estado: 'activa',
  usuario_id: undefined,
}

const AdminAlertas: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [loadingClubes, setLoadingClubes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [total, setTotal] = useState(0)
  const [clubes, setClubes] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAL)

  useEffect(() => {
    const fetchClubes = async () => {
      setLoadingClubes(true)
      setError(null)
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch('/api/clubes', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
        const data = await response.json()
        setClubes(data)
        if (data.length > 0) setSelectedClubId(data[0].id)
      } catch (e: any) {
        setError(e.message || 'Error al cargar clubes')
      } finally {
        setLoadingClubes(false)
      }
    }
    fetchClubes()
  }, [])

  useEffect(() => {
    const clubParam = searchParams.get('club')
    const usuarioParam = searchParams.get('usuario')
    if (clubParam) {
      const id = parseInt(clubParam, 10)
      if (!isNaN(id)) setSelectedClubId(id)
    }
    if (usuarioParam) {
      const id = parseInt(usuarioParam, 10)
      if (!isNaN(id)) setFiltros(prev => ({ ...prev, usuario_id: id }))
    }
  }, [searchParams])

  const cargarAlertas = useCallback(async () => {
    if (!selectedClubId) return
    setLoading(true)
    try {
      const data: AlertaListResponse = await alertaService.obtenerAlertasClub(selectedClubId, filtros)
      setAlertas(data.alertas)
      setTotal(data.total)
    } catch {
      // silently fail — list will be empty
    } finally {
      setLoading(false)
    }
  }, [selectedClubId, filtros])

  useEffect(() => {
    if (selectedClubId) cargarAlertas()
  }, [selectedClubId, cargarAlertas])

  const handleGenerarAlertas = async () => {
    if (!selectedClubId) return
    setLoading(true)
    try {
      await alertaService.generarAlertasClub(selectedClubId)
      await cargarAlertas()
    } catch (e: any) {
      setError(`Error al generar alertas: ${e.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResolver = async (id: number) => {
    try { await alertaService.accionarAlerta(id, 'resolver'); await cargarAlertas() }
    catch { setError('Error al resolver alerta') }
  }

  const handleIgnorar = async (id: number) => {
    try { await alertaService.accionarAlerta(id, 'ignorar'); await cargarAlertas() }
    catch { setError('Error al ignorar alerta') }
  }

  const handleVerPerfil = (usuarioId: number) => {
    const club = clubes.find(c => c.id === selectedClubId)
    if (club) navigate(`/clubs/${club.slug}/miembros/${usuarioId}`)
  }

  const handleFiltroChange = (campo: keyof FiltrosState, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
  }

  const limpiarFiltros = () => setFiltros(FILTROS_INICIAL)

  // --- Active chips ---
  const LABELS: Record<string, string> = {
    'documento_por_vencer': 'Por vencer', 'documento_vencido': 'Vencido',
    'carnet_piloto': 'Carnet piloto', 'seguro_rc': 'Seguro RC',
    'warning': 'Aviso', 'danger': 'Urgente', 'critical': 'Crítico',
    'activa': 'Activas', 'resuelta': 'Resueltas', 'ignorada': 'Ignoradas',
  }
  interface Chip { key: string; label: string; onRemove: () => void }
  const activeChips: Chip[] = [
    filtros.estado     ? { key: 'estado',    label: LABELS[filtros.estado]     || filtros.estado,    onRemove: () => handleFiltroChange('estado', '') }    : null,
    filtros.tipo       ? { key: 'tipo',      label: LABELS[filtros.tipo]       || filtros.tipo,      onRemove: () => handleFiltroChange('tipo', '') }      : null,
    filtros.subtipo    ? { key: 'subtipo',   label: LABELS[filtros.subtipo]    || filtros.subtipo,   onRemove: () => handleFiltroChange('subtipo', '') }   : null,
    filtros.severidad  ? { key: 'severidad', label: LABELS[filtros.severidad]  || filtros.severidad, onRemove: () => handleFiltroChange('severidad', '') } : null,
    filtros.usuario_id ? { key: 'usuario',   label: `Usuario #${filtros.usuario_id}`,                onRemove: () => setFiltros(p => ({ ...p, usuario_id: undefined })) } : null,
  ].filter(Boolean) as Chip[]

  // Summary pill shown in main content
  const estadoLabel = filtros.estado ? (LABELS[filtros.estado] || filtros.estado) : 'Todas'
  const tipoLabel   = filtros.tipo   ? (LABELS[filtros.tipo]   || filtros.tipo)   : 'todos los tipos'
  const filterSummary = `${estadoLabel} · ${tipoLabel}`

  const clubParam = searchParams.get('club')

  return (
    <>
      <Navbar />
      <main className="form-main alerts-form-main">
        <div className="alerts-layout">

          {/* ── Sidebar de filtros ── */}
          <aside className="alerts-sidebar">
            <div className="alerts-sidebar-heading">
              <Filter size={15} />
              <span>Filtros</span>
              {activeChips.length > 0 && (
                <span className="alerts-filter-count">{activeChips.length}</span>
              )}
            </div>

            {/* Club */}
            <div className="filter-group">
              <label htmlFor="filter-club">Club</label>
              <select
                id="filter-club"
                value={selectedClubId || ''}
                onChange={(e) => setSelectedClubId(Number(e.target.value))}
                disabled={loadingClubes}
              >
                {loadingClubes
                  ? <option>Cargando...</option>
                  : <>
                      <option value="">Selecciona un club</option>
                      {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </>
                }
              </select>
            </div>

            {/* Active chips */}
            {activeChips.length > 0 && (
              <div className="alerts-chips-row">
                <span className="alerts-chips-label">Activos:</span>
                {activeChips.map(chip => (
                  <span key={chip.key} className="alerts-chip">
                    {chip.label}
                    <button className="alerts-chip-remove" onClick={chip.onRemove} aria-label={`Quitar ${chip.label}`}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="alerts-sidebar-divider">
              <Filter size={12} />
              <span>Filtros</span>
            </div>

            {/* TIPO */}
            <div className="filter-group">
              <label htmlFor="filter-tipo">Tipo</label>
              <select
                id="filter-tipo"
                className={filtros.tipo ? 'filter-select-active' : ''}
                value={filtros.tipo}
                onChange={(e) => handleFiltroChange('tipo', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="documento_por_vencer">Documento por vencer</option>
                <option value="documento_vencido">Documento vencido</option>
              </select>
            </div>

            {/* DOCUMENTO */}
            <div className="filter-group">
              <label htmlFor="filter-subtipo">Documento</label>
              <select
                id="filter-subtipo"
                className={filtros.subtipo ? 'filter-select-active' : ''}
                value={filtros.subtipo}
                onChange={(e) => handleFiltroChange('subtipo', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="carnet_piloto">Carnet de Piloto</option>
                <option value="seguro_rc">Seguro RC</option>
              </select>
            </div>

            {/* SEVERIDAD */}
            <div className="filter-group">
              <label htmlFor="filter-severidad">Severidad</label>
              <select
                id="filter-severidad"
                className={filtros.severidad ? 'filter-select-active' : ''}
                value={filtros.severidad}
                onChange={(e) => handleFiltroChange('severidad', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="warning">Aviso</option>
                <option value="danger">Urgente</option>
                <option value="critical">Crítico</option>
              </select>
            </div>

            {/* ESTADO */}
            <div className="filter-group">
              <label htmlFor="filter-estado">Estado</label>
              <select
                id="filter-estado"
                className={filtros.estado ? 'filter-select-active' : ''}
                value={filtros.estado}
                onChange={(e) => handleFiltroChange('estado', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="activa">Activas</option>
                <option value="resuelta">Resueltas</option>
                <option value="ignorada">Ignoradas</option>
              </select>
            </div>

            {activeChips.length > 0 && (
              <button className="alerts-limpiar-btn" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </aside>

          {/* ── Área principal ── */}
          <section className="alerts-main">

            {/* Volver */}
            <button
              className="alerts-volver-link"
              onClick={() => clubParam ? navigate(`/clubes/${clubParam}`) : navigate(-1)}
            >
              <ArrowLeft size={15} /> Volver
            </button>

            {/* Header */}
            <div className="alerts-main-header">
              <div className="alerts-main-title">
                <Bell size={22} />
                <h1>Gestión de Alertas</h1>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleGenerarAlertas}
                disabled={loading || !selectedClubId}
              >
                <RefreshCw size={14} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>

            {error && (
              <div className="alert alert-error alerts-error-bar">
                <span>{error}</span>
                <button onClick={() => setError(null)} aria-label="Cerrar"><X size={15} /></button>
              </div>
            )}

            {/* Pill resumen de filtros activos */}
            {selectedClubId && (
              <div className="alerts-summary-pill">
                <span className="alerts-summary-dot" />
                <span>{filterSummary}</span>
              </div>
            )}

            {/* Lista */}
            <div className="alerts-list-area">
              {loadingClubes ? (
                <div className="alerts-empty-state">
                  <Loader2 size={32} className="alerts-spinner-icon" />
                  <p>Cargando clubes...</p>
                </div>
              ) : clubes.length === 0 ? (
                <div className="alerts-empty-state">
                  <Building2 size={36} strokeWidth={1.2} />
                  <p>No hay clubes disponibles</p>
                  <span>Verifica que seas superadmin y que existan clubes en el sistema.</span>
                </div>
              ) : !selectedClubId ? (
                <div className="alerts-empty-state">
                  <Bell size={36} strokeWidth={1.2} />
                  <p>Selecciona un club para ver las alertas</p>
                </div>
              ) : loading ? (
                <div className="alerts-empty-state">
                  <Loader2 size={32} className="alerts-spinner-icon" />
                  <p>Cargando alertas...</p>
                </div>
              ) : alertas.length === 0 ? (
                <div className="alerts-empty-state">
                  <CheckCircle2 size={36} strokeWidth={1.2} style={{ color: '#16a34a' }} />
                  <p>No hay alertas {filtros.estado === 'activa' ? 'activas' : ''}</p>
                  <span>No hay problemas pendientes.</span>
                </div>
              ) : (
                <>
                  <p className="alerts-count">Mostrando {alertas.length} de {total} alertas</p>
                  {alertas.map(alerta => (
                    <AlertItem
                      key={alerta.id}
                      alerta={alerta}
                      onResolver={handleResolver}
                      onIgnorar={handleIgnorar}
                      onVerPerfil={handleVerPerfil}
                      mostrarUsuario={true}
                      compact={true}
                    />
                  ))}
                </>
              )}
            </div>

          </section>
        </div>
      </main>
    </>
  )
}

export default AdminAlertas
