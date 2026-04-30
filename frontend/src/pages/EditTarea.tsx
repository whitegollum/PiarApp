import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TareasService, TareaUpdate } from '../services/tareasComunitariasService'
import '../styles/Tareas.css'

export default function EditTarea() {
  const { clubId, tareaId } = useParams<{ clubId: string; tareaId: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<TareaUpdate>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      if (!clubId || !tareaId) return
      try {
        const tarea = await TareasService.obtener(parseInt(clubId), parseInt(tareaId))
        setForm({
          titulo: tarea.titulo,
          descripcion: tarea.descripcion || '',
          puntos: tarea.puntos,
          categoria: tarea.categoria || '',
          prioridad: tarea.prioridad,
          fecha_limite: tarea.fecha_limite || '',
          max_participantes: tarea.max_participantes || undefined
        })
      } catch (err: any) {
        alert(err.message)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [clubId, tareaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !tareaId) return
    try {
      setLoading(true)
      const data: any = { ...form }
      if (!data.fecha_limite) delete data.fecha_limite
      if (!data.max_participantes) delete data.max_participantes
      if (!data.categoria) delete data.categoria
      await TareasService.actualizar(parseInt(clubId), parseInt(tareaId), data)
      navigate(`/clubes/${clubId}/tareas/${tareaId}`)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="tareas-loading">Cargando...</div>

  return (
    <div className="tarea-form-page">
      <h1>Editar Tarea</h1>
      <form onSubmit={handleSubmit} className="tarea-form">
        <div className="form-group">
          <label>Título</label>
          <input
            type="text"
            value={form.titulo || ''}
            onChange={e => setForm({ ...form, titulo: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={form.descripcion || ''}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Puntos</label>
          <input
            type="number"
            min="0"
            value={form.puntos ?? 0}
            onChange={e => setForm({ ...form, puntos: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label>Categoría</label>
          <input
            type="text"
            value={form.categoria || ''}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Prioridad</label>
          <select value={form.prioridad || 'media'} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="form-group">
          <label>Fecha límite</label>
          <input
            type="datetime-local"
            value={form.fecha_limite || ''}
            onChange={e => setForm({ ...form, fecha_limite: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Máx. participantes</label>
          <input
            type="number"
            min="1"
            value={form.max_participantes || ''}
            onChange={e => setForm({ ...form, max_participantes: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-guardar" disabled={loading}>Guardar</button>
          <button type="button" className="btn-cancelar" onClick={() => navigate(`/clubes/${clubId}/tareas/${tareaId}`)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
