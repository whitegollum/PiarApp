import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { PremiosService, PeriodoPremios, PeriodoPremiosCreate, PremioCreate } from '../services/tareasComunitariasService'
import { PremioCard } from '../components/PremioCard'
import '../styles/Ranking.css'

export default function AdminPremios() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const { role } = useClubRole(clubId)

  const [periodos, setPeriodos] = useState<PeriodoPremios[]>([])
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoPremios | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCrearPeriodo, setShowCrearPeriodo] = useState(false)
  const [showCrearPremio, setShowCrearPremio] = useState(false)

  const [nuevoPeriodo, setNuevoPeriodo] = useState<PeriodoPremiosCreate>({
    nombre: '', fecha_inicio: '', fecha_fin: '', tipo: 'mensual'
  })
  const [nuevoPremio, setNuevoPremio] = useState<PremioCreate>({
    nombre: '', descripcion: '', posicion: 1
  })

  const esAdmin = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin

  const cargarPeriodos = async () => {
    if (!clubId) return
    try {
      setLoading(true)
      const data = await PremiosService.listarPeriodos(parseInt(clubId))
      setPeriodos(data)
      if (data.length > 0 && !periodoActivo) setPeriodoActivo(data[0])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarPeriodos() }, [clubId])

  const handleCrearPeriodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return
    try {
      await PremiosService.crearPeriodo(parseInt(clubId), nuevoPeriodo)
      setShowCrearPeriodo(false)
      setNuevoPeriodo({ nombre: '', fecha_inicio: '', fecha_fin: '', tipo: 'mensual' })
      cargarPeriodos()
    } catch (err: any) { alert(err.message) }
  }

  const handleCrearPremio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !periodoActivo) return
    try {
      await PremiosService.crearPremio(parseInt(clubId), periodoActivo.id, nuevoPremio)
      setShowCrearPremio(false)
      setNuevoPremio({ nombre: '', descripcion: '', posicion: 1 })
      // Reload periodo
      const updated = await PremiosService.obtenerPeriodo(parseInt(clubId), periodoActivo.id)
      setPeriodoActivo(updated)
      cargarPeriodos()
    } catch (err: any) { alert(err.message) }
  }

  const handleCerrarPeriodo = async () => {
    if (!clubId || !periodoActivo) return
    if (!confirm('¿Cerrar este periodo? Se calculará el ranking automáticamente.')) return
    try {
      await PremiosService.cerrarPeriodo(parseInt(clubId), periodoActivo.id)
      cargarPeriodos()
      const updated = await PremiosService.obtenerPeriodo(parseInt(clubId), periodoActivo.id)
      setPeriodoActivo(updated)
    } catch (err: any) { alert(err.message) }
  }

  const handleConfirmarPremios = async () => {
    if (!clubId || !periodoActivo) return
    if (!confirm('¿Confirmar y publicar los premios?')) return
    try {
      await PremiosService.confirmarPremios(parseInt(clubId), periodoActivo.id)
      cargarPeriodos()
      const updated = await PremiosService.obtenerPeriodo(parseInt(clubId), periodoActivo.id)
      setPeriodoActivo(updated)
    } catch (err: any) { alert(err.message) }
  }

  if (!esAdmin) return <div className="ranking-error">Acceso solo para administradores</div>
  if (loading) return <div className="ranking-loading">Cargando...</div>

  return (
    <div className="admin-premios-page">
      <h1>Gestión de Premios</h1>

      <div className="premios-actions">
        <button className="btn-crear-periodo" onClick={() => setShowCrearPeriodo(true)}>
          + Nuevo Periodo
        </button>
      </div>

      {showCrearPeriodo && (
        <form onSubmit={handleCrearPeriodo} className="tarea-form premios-form">
          <div className="form-group">
            <label>Nombre</label>
            <input type="text" value={nuevoPeriodo.nombre} onChange={e => setNuevoPeriodo({ ...nuevoPeriodo, nombre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={nuevoPeriodo.tipo} onChange={e => setNuevoPeriodo({ ...nuevoPeriodo, tipo: e.target.value })}>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha inicio</label>
            <input type="datetime-local" value={nuevoPeriodo.fecha_inicio} onChange={e => setNuevoPeriodo({ ...nuevoPeriodo, fecha_inicio: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Fecha fin</label>
            <input type="datetime-local" value={nuevoPeriodo.fecha_fin} onChange={e => setNuevoPeriodo({ ...nuevoPeriodo, fecha_fin: e.target.value })} required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-guardar">Crear</button>
            <button type="button" className="btn-cancelar" onClick={() => setShowCrearPeriodo(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Selector de periodo */}
      <div className="premios-selector">
        <select
          value={periodoActivo?.id || ''}
          onChange={e => {
            const p = periodos.find(x => x.id === parseInt(e.target.value))
            setPeriodoActivo(p || null)
          }}
        >
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} ({p.estado})</option>
          ))}
        </select>
      </div>

      {periodoActivo && (
        <div className="premios-periodo-detail">
          <h2>{periodoActivo.nombre}</h2>
          <p>Estado: <strong>{periodoActivo.estado}</strong> | Tipo: {periodoActivo.tipo}</p>
          <p>{new Date(periodoActivo.fecha_inicio).toLocaleDateString()} - {new Date(periodoActivo.fecha_fin).toLocaleDateString()}</p>

          <div className="premios-periodo-actions">
            {periodoActivo.estado === 'activo' && (
              <>
                <button className="btn-cerrar-periodo" onClick={handleCerrarPeriodo}>Cerrar Periodo</button>
                <button className="btn-crear-premio" onClick={() => setShowCrearPremio(true)}>+ Añadir Premio</button>
              </>
            )}
            {periodoActivo.estado === 'cerrado' && (
              <button className="btn-confirmar-premios" onClick={handleConfirmarPremios}>Confirmar Premios</button>
            )}
          </div>

          {showCrearPremio && (
            <form onSubmit={handleCrearPremio} className="tarea-form premios-form">
              <div className="form-group">
                <label>Nombre del premio</label>
                <input type="text" value={nuevoPremio.nombre} onChange={e => setNuevoPremio({ ...nuevoPremio, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea value={nuevoPremio.descripcion || ''} onChange={e => setNuevoPremio({ ...nuevoPremio, descripcion: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Posición (1 = primer lugar)</label>
                <input type="number" min="1" value={nuevoPremio.posicion} onChange={e => setNuevoPremio({ ...nuevoPremio, posicion: parseInt(e.target.value) || 1 })} required />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-guardar">Crear Premio</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowCrearPremio(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="premios-lista">
            <h3>Premios definidos</h3>
            {periodoActivo.premios.length === 0 ? (
              <p>No hay premios definidos para este periodo</p>
            ) : (
              periodoActivo.premios.map(premio => (
                <PremioCard key={premio.id} premio={premio} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
