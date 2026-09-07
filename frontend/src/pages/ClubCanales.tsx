import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { ArrowLeft, Radio, Plane, PlaneLanding, AlertTriangle, User, QrCode, RefreshCw } from 'lucide-react'
import { CanalesService, CanalesPanel } from '../services/canalesService'
import QRInvitadoModal from '../components/QRInvitadoModal'
import TablaFrecuenciasModal from '../components/TablaFrecuenciasModal'
import APIService from '../services/api'
import { FpvSystem, FPV_SYSTEMS, buildSlotViews, FpvSlotView } from '../utils/fpvSystems'
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
  const navigate = useNavigate()

  const [, setClub] = useState<Club | null>(null)
  const [panel, setPanel] = useState<CanalesPanel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notificacion, setNotificacion] = useState<string | null>(null)
  const [mostrarQR, setMostrarQR] = useState(false)
  const [mostrarTablaFreq, setMostrarTablaFreq] = useState(false)
  const [refrescando, setRefrescando] = useState(false)
  const [fpvSystem, setFpvSystem] = useState<FpvSystem>(
    () => (localStorage.getItem('piar_fpv_system') as FpvSystem) || 'raceband'
  )

  const handleSystemChange = (sys: FpvSystem) => {
    setFpvSystem(sys)
    localStorage.setItem('piar_fpv_system', sys)
  }

  // Tarjetas de canal (una por canal canónico, salvo O4-5/O4-6 que son dos)
  const slots = panel ? buildSlotViews(panel.canales, fpvSystem) : []

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

  useEffect(() => {
    if (!clubId) return
    const interval = setInterval(cargarCanales, 5000)
    return () => clearInterval(interval)
  }, [clubId, cargarCanales])

  const mostrarNotificacion = (mensaje: string) => {
    setNotificacion(mensaje)
    setTimeout(() => setNotificacion(null), 4000)
  }

  const handleRefrescar = async () => {
    setRefrescando(true)
    try {
      await cargarCanales()
    } finally {
      setRefrescando(false)
    }
  }

  const handleOcupar = async (canalNumero: number, subCanal: string | null) => {
    if (!clubId) return
    try {
      const data = await CanalesService.ocuparCanal(parseInt(clubId), canalNumero, subCanal)
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

  const handleToggleVuelo = async (canalNumero: number, etiqueta: string) => {
    if (!clubId) return
    try {
      const data = await CanalesService.toggleVuelo(parseInt(clubId), canalNumero)
      setPanel(data)
      const canalActualizado = data.canales.find(c => c.canal_numero === canalNumero)
      const yoVolando = canalActualizado?.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)
      if (yoVolando) {
        mostrarNotificacion(`Estás volando en ${etiqueta}`)
      } else {
        mostrarNotificacion(`${etiqueta} — has aterrizado`)
      }
    } catch (err: any) {
      if (err.message?.includes('409')) {
        alert('No puedes volar: hay otro piloto volando en este canal')
      } else {
        alert(err.message || 'Error al cambiar estado de vuelo')
      }
    }
  }

  const estoyEnSlot = (slot: FpvSlotView): boolean =>
    slot.usuarios.some(u => u.usuario_id === usuario?.id)

  const estoyVolandoEnSlot = (slot: FpvSlotView): boolean =>
    slot.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)

  return (
    <main className="form-main">
      <div className="canales-page">

        {/* Header */}
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <h1>
            <Radio size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Canal de Vuelo
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-back"
              onClick={handleRefrescar}
              disabled={refrescando}
              title="Refrescar estado de los canales"
              aria-label="Refrescar estado de los canales"
            >
              <RefreshCw size={18} className={refrescando ? 'icon-spin' : undefined} />
            </button>
            <button
              className="btn-back"
              onClick={() => setMostrarQR(true)}
              title="Mostrar QR para invitar a un piloto"
              aria-label="Mostrar QR para invitado"
            >
              <QrCode size={20} />
            </button>
            <span className="canales-live-indicator" title="Actualización en tiempo real" />
          </div>
        </div>
        <p className="canales-desc">Coordina el uso de frecuencias con otros pilotos del club</p>

        {/* Aviso RaceMode */}
        <div className="canales-aviso-racemode">
          <AlertTriangle size={15} />
          <span>
            Recuerda configurar tus gafas siempre que sea posible en <strong>RaceMode</strong>, para maximizar la compatibilidad de frecuencias.{' '}
            <button
              type="button"
              className="canales-aviso-racemode-link"
              onClick={() => setMostrarTablaFreq(true)}
            >
              Ver tabla de frecuencias
            </button>
          </span>
        </div>

        {/* Selector de sistema FPV */}
        <div className="fpv-system-selector">
          <span className="fpv-system-label">Tu sistema FPV:</span>
          <div className="fpv-system-tabs">
            {FPV_SYSTEMS.map(sys => (
              <button
                key={sys.id}
                className={`fpv-tab${fpvSystem === sys.id ? ' fpv-tab-active' : ''}`}
                onClick={() => handleSystemChange(sys.id)}
              >
                {sys.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toast de notificación */}
        {notificacion && (
          <div className="canales-notificacion">
            <Plane size={14} />
            {notificacion}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {mostrarQR && clubId && (
          <QRInvitadoModal
            clubId={parseInt(clubId)}
            onClose={() => setMostrarQR(false)}
          />
        )}

        {mostrarTablaFreq && (
          <TablaFrecuenciasModal onClose={() => setMostrarTablaFreq(false)} />
        )}

        {loading ? (
          <div className="canales-loading">Cargando canales...</div>
        ) : panel && (
          <div className="canales-grid">
            {slots.map(slot => (
              <CanalCard
                key={slot.key}
                slot={slot}
                estoyEnCanal={estoyEnSlot(slot)}
                estoyVolando={estoyVolandoEnSlot(slot)}
                onOcupar={() => handleOcupar(slot.canalNumero, slot.subCanal)}
                onLiberar={() => handleLiberar(slot.canalNumero)}
                onToggleVuelo={() => handleToggleVuelo(slot.canalNumero, slot.label ?? `Canal ${slot.canalNumero}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

interface CanalCardProps {
  slot: FpvSlotView
  estoyEnCanal: boolean
  estoyVolando: boolean
  onOcupar: () => void
  onLiberar: () => void
  onToggleVuelo: () => void
}

function CanalCard({ slot, estoyEnCanal, estoyVolando, onOcupar, onLiberar, onToggleVuelo }: CanalCardProps) {
  const noDisponible = slot.label === null

  return (
    <div className={`canal-card${slot.enVuelo ? ' canal-en-vuelo' : ''}${estoyEnCanal ? ' canal-activo' : ''}${noDisponible ? ' canal-no-disponible' : ''}`}>

      <div className="canal-card-header">
        <div className="canal-header-info">
          <span className="canal-numero">{slot.label ?? 'N/D'}</span>
          {slot.freq && <span className="canal-freq">{slot.freq} MHz</span>}
        </div>
        {slot.enVuelo && (
          <span className="canal-badge-vuelo">EN VUELO</span>
        )}
      </div>

      <div className="canal-pilotos">
        {slot.usuarios.length === 0 ? (
          <p className="canal-vacio">Sin pilotos — canal libre</p>
        ) : (
          <ul className="canal-lista-pilotos">
            {slot.usuarios.map((u, i) => (
              <li key={u.es_invitado ? `inv-${i}` : u.usuario_id} className={u.en_vuelo ? 'piloto-en-vuelo' : ''}>
                {u.en_vuelo ? <Plane size={13} /> : <User size={13} />}
                {u.es_invitado
                  ? <span className="invitado-nombre-pink">{u.nombre}</span>
                  : <span>{u.nombre}</span>
                }
                {u.en_vuelo && <span className="badge-en-vuelo">en vuelo</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="canal-acciones">
        {!estoyEnCanal ? (
          <button
            className="btn btn-primary btn-sm canal-btn-full"
            onClick={onOcupar}
            disabled={noDisponible}
            title={noDisponible ? 'Canal no disponible en este sistema' : undefined}
          >
            {noDisponible ? 'No disponible' : 'Entrar en canal'}
          </button>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" onClick={onLiberar}>
              Salir
            </button>
            <button
              className={`btn btn-sm canal-btn-vuelo${estoyVolando ? ' canal-btn-aterrizar' : ''}`}
              onClick={onToggleVuelo}
              disabled={slot.enVuelo && !estoyVolando}
            >
              {estoyVolando
                ? <><PlaneLanding size={14} /> Aterrizar</>
                : <><Plane size={14} /> A volar</>
              }
            </button>
          </>
        )}
      </div>

      {slot.enVuelo && slot.pilotoVolando && !estoyVolando && estoyEnCanal && (
        <div className="canal-aviso-vuelo">
          <AlertTriangle size={14} />
          {slot.pilotoVolando} está volando en esta frecuencia
        </div>
      )}
    </div>
  )
}
