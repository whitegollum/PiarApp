import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TareasService, TareaCreate } from '../services/tareasComunitariasService'
import '../styles/Tareas.css'

export default function CreateTarea() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<TareaCreate>({
    titulo: '',
    descripcion: '',
    puntos: 0,
    categoria: '',
    prioridad: 'media',
    fecha_limite: '',
    max_participantes: undefined
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !form.titulo.trim()) return
    try {
      setLoading(true)
      const data: any = { ...form }
      if (!data.fecha_limite) delete data.fecha_limite
      if (!data.max_participantes) delete data.max_participantes
      if (!data.categoria) delete data.categoria
      await TareasService.crear(parseInt(clubId), data)
      navigate(`/clubes/${clubId}/tareas`)
    } catch (err: any) {
      alert(err.message || 'Error al crear tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tarea-form-page">
      <h1>Crear Tarea Comunitaria</h1>
      <form onSubmit={handleSubmit} className="tarea-form">
        <div className="form-group">
          <label>Título *</label>
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm({ ...form, titulo: e.target.value })}
            required
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
          <label>Puntos *</label>
          <input
            type="number"
            min="0"
            value={form.puntos}
            onChange={e => setForm({ ...form, puntos: parseInt(e.target.value) || 0 })}
            required
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
          <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
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
          <label>Máx. participantes (vacío = sin límite)</label>
          <input
            type="number"
            min="1"
            value={form.max_participantes || ''}
            onChange={e => setForm({ ...form, max_participantes: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Tarea'}
          </button>
          <button type="button" className="btn-cancelar" onClick={() => navigate(`/clubes/${clubId}/tareas`)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
