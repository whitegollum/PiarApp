import { useState, useEffect } from 'react'
import { Key } from 'lucide-react'
import APIService from '../services/api'
import '../styles/FacilityManager.css'

interface FacilityPassword {
  codigo: string
  descripcion: string
  activa: boolean
  fecha_creacion: string
}

interface FacilityHistory {
  id: number
  codigo: string
  descripcion: string
  fecha_creacion: string
  creado_por_id: number
  activa: boolean
}

export default function FacilityManager({ clubId }: { clubId: number }) {
  const [current, setCurrent] = useState<FacilityPassword | null>(null)
  const [history, setHistory] = useState<FacilityHistory[]>([])
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // Intentar cargar la actual
      try {
        const data = await APIService.get<FacilityPassword>(`/clubes/${clubId}/instalacion/password`)
        setCurrent(data)
      } catch (err) {
        setCurrent(null)
      }

      // Cargar historial
      const hist = await APIService.get<FacilityHistory[]>(`/clubes/${clubId}/instalacion/history`)
      setHistory(hist)
    } catch (err) {
      console.error("Error loading facility data", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [clubId])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    
    try {
      setLoading(true)
      const payload = { codigo: code, descripcion: desc }
      const newPass = await APIService.post<FacilityPassword>(`/clubes/${clubId}/instalacion/password`, payload)
      setCurrent(newPass)
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
      setCode('')
      setDesc('')
      loadData() // Recargar historial
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al actualizar contraseña' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="facility-manager-container">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={20} /> Gestión de Acceso a Instalaciones</h2>
      
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="current-status-card">
        <h3>Estado Actual</h3>
        {current ? (
          <div className="status-active">
            <span className="code-display">{current.codigo}</span>
            <span className="desc-display">{current.descripcion}</span>
            <span className="date-display">
              Creado: {new Date(current.fecha_creacion).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <div className="status-inactive">
            No hay contraseña activa configurada
          </div>
        )}
      </div>

      <form onSubmit={handleUpdate} className="update-form">
        <h3>Establecer Nueva Contraseña</h3>
        <div className="form-group">
          <label>Nuevo Código</label>
          <input 
            type="text" 
            value={code} 
            onChange={e => setCode(e.target.value)}
            placeholder="Ej: 1234, A7B9..."
            required 
            maxLength={20}
          />
        </div>
        <div className="form-group">
          <label>Descripción (Opcional)</label>
          <input 
            type="text" 
            value={desc} 
            onChange={e => setDesc(e.target.value)}
            placeholder="Ej: Acceso Principal, Candado Este..."
            maxLength={100}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !code}>
          {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>
      </form>

      <div className="history-section">
        <button 
          className="btn btn-outline btn-sm"
          onClick={() => setShowHistory(!showHistory)}
          type="button"
        >
          {showHistory ? 'Ocultar Historial' : 'Ver Historial de Cambios'}
        </button>

        {showHistory && (
          <div className="history-list">
            {history.length === 0 ? (
              <p>No hay historial disponible</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id} className={item.activa ? 'row-active' : ''}>
                      <td>{new Date(item.fecha_creacion).toLocaleString()}</td>
                      <td>{item.codigo}</td>
                      <td>{item.descripcion}</td>
                      <td>{item.activa ? 'Activa' : 'Inactiva'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
