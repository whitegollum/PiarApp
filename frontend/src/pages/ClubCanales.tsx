import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { ArrowLeft, Radio, Plane, PlaneLanding, AlertTriangle, User, QrCode } from 'lucide-react'
import { CanalesService, CanalesPanel, CanalEstado } from '../services/canalesService'
import QRInvitadoModal from '../components/QRInvitadoModal'
import APIService from '../services/api'
import '../styles/Canales.css'
import '../styles/ClubDetail.css'

// ──────────────────────────────────────────────
// Tabla de equivalencias FPV
// ──────────────────────────────────────────────
type FpvSystem = 'raceband' | 'dji' | 'o3'

const FPV_SYSTEMS: { id: FpvSystem; label: string }[] = [
  { id: 'raceband', label: 'Analógico / HDZero / Walksnail' },
  { id: 'dji',      label: 'DJI Vista / Air Unit'           },
  { id: 'o3',       label: 'O3 (20 MHz FCC)'                },
]

// Label que aparece en las gafas para cada canal canónico (índice 0 = canal 1)
const GOGGLE_LABEL: Record<FpvSystem, (string | null)[]> = {
  raceband: ['R1',  'R2',  'R3',  'R4',  'R5',  'R6',  'R7',  'R8' ],
  dji:      ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH8', 'CH6', 'CH7'],
  o3:       ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', null ],
}

// Frecuencia en MHz para cada canal canónico (índice 0 = canal 1)
const FREQ_MHZ: Record<FpvSystem, (number | null)[]> = {
  raceband: [5658, 5695, 5732, 5769, 5806, 5843, 5880, 5917],
  dji:      [5660, 5695, 5735, 5770, 5805, 5839, 5878, 5914],
  o3:       [5660, 5695, 5735, 5770, 5805, 5839, 5878, null ],
}

// Orden de visualización: canales canónicos ordenados según el número de canal en las gafas
const DISPLAY_ORDER: Record<FpvSystem, number[]> = {
  raceband: [1, 2, 3, 4, 5, 6, 7, 8],
  dji:      [1, 2, 3, 4, 5, 7, 8, 6], // DJI CH1→C1, CH2→C2, …, CH6→C7, CH7→C8, CH8→C6
  o3:       [1, 2, 3, 4, 5, 6, 7, 8], // CH1–CH7, C8 no disponible
}

function getGoggleLabel(canonicalNum: number, system: FpvSystem): string | null {
  return GOGGLE_LABEL[system][canonicalNum - 1] ?? null
}
function getFreq(canonicalNum: number, system: FpvSystem): number | null {
  return FREQ_MHZ[system][canonicalNum - 1] ?? null
}

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
  const [fpvSystem, setFpvSystem] = useState<FpvSystem>(
    () => (localStorage.getItem('piar_fpv_system') as FpvSystem) || 'raceband'
  )

  const handleSystemChange = (sys: FpvSystem) => {
    setFpvSystem(sys)
    localStorage.setItem('piar_fpv_system', sys)
  }

  // Canales ordenados según el sistema FPV seleccionado
  const sortedCanales = panel
    ? DISPLAY_ORDER[fpvSystem].map(n => panel.canales.find(c => c.canal_numero === n)!)
    : []

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
      const canalActualizado = data.canales.find(c => c.canal_numero === canalNumero)
      if (canalActualizado?.en_vuelo) {
        mostrarNotificacion(`${canalActualizado.piloto_volando} está volando en Canal ${canalNumero}`)
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

  const estoyEnCanal = (canal: CanalEstado): boolean =>
    canal.usuarios.some(u => u.usuario_id === usuario?.id)

  const estoyVolando = (canal: CanalEstado): boolean =>
    canal.usuarios.some(u => u.usuario_id === usuario?.id && u.en_vuelo)

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
          <span>Recuerda configurar tus gafas (DJI, Walksnail o Analógicas) en <strong>RaceMode</strong>, dado que si no es así las correspondencias de canales cambian.</span>
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

        {loading ? (
          <div className="canales-loading">Cargando canales...</div>
        ) : panel && (
          <div className="canales-grid">
            {sortedCanales.map(canal => (
              <CanalCard
                key={canal.canal_numero}
                canal={canal}
                fpvSystem={fpvSystem}
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
  )
}

interface CanalCardProps {
  canal: CanalEstado
  fpvSystem: FpvSystem
  estoyEnCanal: boolean
  estoyVolando: boolean
  onOcupar: () => void
  onLiberar: () => void
  onToggleVuelo: () => void
}

function CanalCard({ canal, fpvSystem, estoyEnCanal, estoyVolando, onOcupar, onLiberar, onToggleVuelo }: CanalCardProps) {
  const tieneMultiplesUsuarios = canal.usuarios.length >= 2
  const goggleLabel = getGoggleLabel(canal.canal_numero, fpvSystem)
  const freq = getFreq(canal.canal_numero, fpvSystem)
  const noDisponible = goggleLabel === null

  return (
    <div className={`canal-card${canal.en_vuelo ? ' canal-en-vuelo' : ''}${estoyEnCanal ? ' canal-activo' : ''}${noDisponible ? ' canal-no-disponible' : ''}`}>

      <div className="canal-card-header">
        <div className="canal-header-info">
          <span className="canal-numero">{goggleLabel ?? 'N/D'}</span>
          {freq && <span className="canal-freq">{freq} MHz</span>}
        </div>
        {canal.en_vuelo && (
          <span className="canal-badge-vuelo">EN VUELO</span>
        )}
      </div>

      <div className="canal-pilotos">
        {canal.usuarios.length === 0 ? (
          <p className="canal-vacio">Sin pilotos — canal libre</p>
        ) : (
          <ul className="canal-lista-pilotos">
            {canal.usuarios.map((u, i) => (
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
            {tieneMultiplesUsuarios && (
              <button
                className={`btn btn-sm canal-btn-vuelo${estoyVolando ? ' canal-btn-aterrizar' : ''}`}
                onClick={onToggleVuelo}
                disabled={canal.en_vuelo && !estoyVolando}
              >
                {estoyVolando
                  ? <><PlaneLanding size={14} /> Aterrizar</>
                  : <><Plane size={14} /> A volar</>
                }
              </button>
            )}
          </>
        )}
      </div>

      {canal.en_vuelo && canal.piloto_volando && !estoyVolando && estoyEnCanal && (
        <div className="canal-aviso-vuelo">
          <AlertTriangle size={14} />
          {canal.piloto_volando} está volando en esta frecuencia
        </div>
      )}
    </div>
  )
}
