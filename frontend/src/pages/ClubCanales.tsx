import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { Radio, Plane, PlaneLanding, AlertTriangle } from 'lucide-react'
import { CanalesService, CanalesPanel, CanalEstado } from '../services/canalesService'
import APIService from '../services/api'
import '../styles/Canales.css'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ClubCanales() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const { role: _role } = useClubRole(clubId)

  const [, setClub] = useState<Club | null>(null)
  const [panel, setPanel] = useState<CanalesPanel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notificacion, setNotificacion] = useState<string | null>(null)


  const cargarCanales = useCallback(async () => {
    if (!clubId) return
    try {
      const data = await CanalesService.obtenerPanel(parseInt(clubId))
      setPanel(data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Error al cargar canales')
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (!clubId) return
    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(setClub).catch(() => {})
    cargarCanales()
  }, [clubId, cargarCanales])

  // Polling cada 5 segundos para mantener el panel actualizado
  useEffect(() => {
    if (!clubId) return
    const interval = setInterval(cargarCanales, 5000)
    return () => clearInterval(interval)
  }, [clubId, cargarCanales])

  const mostrarNotificacion = (mensaje: string) => {
    setNotificacion(mensaje)
    setTimeout(() => setNotificacion(null), 4000)
  }

  const handleOcupar = async (canalNumero: number) => {
    if (!clubId) return
    try {
      const data = await CanalesService.ocuparCanal(parseInt(clubId), canalNumero)
      setPanel(data)
    } catch (err: any) {
      alert(err.message || 'Error al ocupar canal')
    }
  }

  const handleLiberar = async (canalNumero: number) => {
    if (!clubId) return
    try {
      const data = await CanalesService.liberarCanal(parseInt(clubId), canalNumero)
      setPanel(data)
    } catch (err: any) {
      alert(err.message || 'Error al liberar canal')
    }
  }

  const handleToggleVuelo = async (canalNumero: number) => {
    if (!clubId) return
    try {
      const data = await CanalesService.toggleVuelo(parseInt(clubId), canalNumero)
      setPanel(data)

      // Notificar cambio de estado
      const canalActualizado = data.canales.find(c => c.canal_numero === canalNumero)
      if (canalActualizado?.en_vuelo) {
            mostrarNotificacion(`✈️ ${canalActualizado.piloto_volando} está volando en Canal ${canalNumero}`)
      } else {
            mostrarNotificacion(`Canal ${canalNumero} está libre`)
      }
    } catch (err: any) {
      if (err.message?.includes('409')) {
        alert('No puedes volar: hay otro piloto volando en este canal')
      } else {
        alert(err.message || 'Error al cambiar estado de vuelo')
      }
    }
  }

  const estoyEnCanal = (canal: CanalEstado): boolean => {
    return canal.usuarios.some(u => u.usuario_id === usuario?.id)
  }

  const estoyVolando = (canal: CanalEstado): boolean => {
    return canal.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)
  }

  return (
    <>

      <main className="club-detail-main">
        <div className="club-detail-container">
          <div className="canales-header">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Radio size={24} /> Panel de Canales</h1>
            <p className="canales-subtitle">
              Coordina el uso de frecuencias con otros pilotos del club
            </p>
          </div>

          {notificacion && (
            <div className="canales-notificacion">
              {notificacion}
            </div>
          )}

          {error && <div className="canales-error">{error}</div>}

          {loading ? (
            <div className="canales-loading">Cargando canales...</div>
          ) : panel && (
            <div className="canales-grid">
              {panel.canales.map(canal => (
                <CanalCard
                  key={canal.canal_numero}
                  canal={canal}
                  estoyEnCanal={estoyEnCanal(canal)}
                  estoyVolando={estoyVolando(canal)}
                  onOcupar={() => handleOcupar(canal.canal_numero)}
                  onLiberar={() => handleLiberar(canal.canal_numero)}
                  onToggleVuelo={() => handleToggleVuelo(canal.canal_numero)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

interface CanalCardProps {
  canal: CanalEstado
  estoyEnCanal: boolean
  estoyVolando: boolean
  onOcupar: () => void
  onLiberar: () => void
  onToggleVuelo: () => void
}

function CanalCard({ canal, estoyEnCanal, estoyVolando, onOcupar, onLiberar, onToggleVuelo }: CanalCardProps) {
  const tieneMultiplesUsuarios = canal.usuarios.length >= 2

  return (
    <div className={`canal-card ${canal.en_vuelo ? 'canal-en-vuelo' : ''} ${estoyEnCanal ? 'canal-activo' : ''}`}>
      <div className="canal-header">
        <span className="canal-numero">Canal {canal.canal_numero}</span>
        {canal.en_vuelo && (
          <span className="canal-badge-vuelo">EN VUELO</span>
        )}
      </div>

      <div className="canal-usuarios">
        {canal.usuarios.length === 0 ? (
          <p className="canal-vacio">Sin pilotos</p>
        ) : (
          <ul className="canal-lista-usuarios">
            {canal.usuarios.map(u => (
              <li key={u.usuario_id} className={u.en_vuelo ? 'usuario-volando' : ''}>
                {u.en_vuelo ? <><Plane size={14} /> </> : ''}
                {u.nombre}
                {u.en_vuelo && <span className="badge-volando">volando</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="canal-acciones">
        {!estoyEnCanal ? (
          <button className="btn-canal btn-ocupar" onClick={onOcupar}>
            Entrar en canal
          </button>
        ) : (
          <>
            <button className="btn-canal btn-liberar" onClick={onLiberar}>
              Salir del canal
            </button>
            {tieneMultiplesUsuarios && (
              <button
                className={`btn-canal btn-vuelo ${estoyVolando ? 'btn-vuelo-activo' : ''}`}
                onClick={onToggleVuelo}
                disabled={canal.en_vuelo && !estoyVolando}
              >
                {estoyVolando ? <><PlaneLanding size={16} /> Terminar vuelo</> : <><Plane size={16} /> Voy a volar</>}
              </button>
            )}
          </>
        )}
      </div>

      {canal.en_vuelo && canal.piloto_volando && !estoyVolando && estoyEnCanal && (
        <div className="canal-aviso-vuelo" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={14} /> {canal.piloto_volando} está volando en esta frecuencia
        </div>
      )}
    </div>
  )
}
