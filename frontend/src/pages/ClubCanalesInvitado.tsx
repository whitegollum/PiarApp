import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Radio, Plane, PlaneLanding, AlertTriangle, User, UserPlus, Pencil, Check, X, RefreshCw } from 'lucide-react'
import { InvitadosService, CanalesPanelInvitado } from '../services/invitadosService'
import { FpvSystem, FPV_SYSTEMS, buildSlotViews, FpvSlotView } from '../utils/fpvSystems'
import TablaFrecuenciasModal from '../components/TablaFrecuenciasModal'
import '../styles/Canales.css'

type Paso = 'bienvenida' | 'panel'

export default function ClubCanalesInvitado() {
  const { tokenQr } = useParams<{ tokenQr: string }>()

  const [paso, setPaso] = useState<Paso>('bienvenida')
  const [nombre, setNombre] = useState('')
  const [sesionToken, setSesionToken] = useState<string | null>(null)
  const [clubId, setClubId] = useState<number | null>(null)
  const [panel, setPanel] = useState<CanalesPanelInvitado | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notificacion, setNotificacion] = useState<string | null>(null)
  const [refrescando, setRefrescando] = useState(false)
  const [mostrarTablaFreq, setMostrarTablaFreq] = useState(false)
  const [fpvSystem, setFpvSystem] = useState<FpvSystem>(
    () => (localStorage.getItem('piar_fpv_system') as FpvSystem) || 'raceband'
  )

  // Estado de edición de nombre
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const inputEdicionRef = useRef<HTMLInputElement>(null)

  const handleSystemChange = (sys: FpvSystem) => {
    setFpvSystem(sys)
    localStorage.setItem('piar_fpv_system', sys)
  }

  // Tarjetas de canal (una por canal canónico, salvo O4-5/O4-6 que son dos)
  const slots = panel ? buildSlotViews(panel.canales, fpvSystem) : []

  const mostrarNotificacion = (msg: string) => {
    setNotificacion(msg)
    setTimeout(() => setNotificacion(null), 4000)
  }

  const handleRefrescar = async () => {
    if (!sesionToken || !clubId) return
    setRefrescando(true)
    try {
      await cargarPanel(sesionToken, clubId)
    } finally {
      setRefrescando(false)
    }
  }

  const cargarPanel = useCallback(async (token: string, cid: number) => {
    try {
      const data = await InvitadosService.obtenerPanel(token, cid)
      setPanel(data)
    } catch {
      // silencioso en polling
    }
  }, [])

  // Polling cada 5 s una vez en el panel
  useEffect(() => {
    if (paso !== 'panel' || !sesionToken || !clubId) return
    cargarPanel(sesionToken, clubId)
    const id = setInterval(() => cargarPanel(sesionToken, clubId), 5000)
    return () => clearInterval(id)
  }, [paso, sesionToken, clubId, cargarPanel])

  // Focus automático al abrir la edición de nombre
  useEffect(() => {
    if (editandoNombre) {
      setTimeout(() => inputEdicionRef.current?.focus(), 50)
    }
  }, [editandoNombre])

  const handleUnirse = async () => {
    if (!tokenQr) return
    setLoading(true)
    setError('')
    try {
      const sesion = await InvitadosService.unirse(tokenQr, nombre.trim() || null)
      setSesionToken(sesion.token)
      setClubId(sesion.club_id)
      const data = await InvitadosService.obtenerPanel(sesion.token, sesion.club_id)
      setPanel(data)
      setPaso('panel')
    } catch (err: any) {
      setError(err.message || 'No se pudo acceder. El enlace puede ser inválido.')
    } finally {
      setLoading(false)
    }
  }

  const handleOcupar = async (canalNumero: number, subCanal: string | null) => {
    if (!sesionToken || !clubId) return
    try {
      const data = await InvitadosService.ocuparCanal(sesionToken, clubId, canalNumero, subCanal)
      setPanel(data)
    } catch (err: any) {
      alert(err.message || 'Error al ocupar canal')
    }
  }

  const handleLiberar = async () => {
    if (!sesionToken || !clubId) return
    try {
      const data = await InvitadosService.liberarCanal(sesionToken, clubId)
      setPanel(data)
    } catch (err: any) {
      alert(err.message || 'Error al liberar canal')
    }
  }

  const handleToggleVuelo = async () => {
    if (!sesionToken || !clubId) return
    try {
      const data = await InvitadosService.toggleVuelo(sesionToken, clubId)
      setPanel(data)
      const miSlot = buildSlotViews(data.canales, fpvSystem).find(
        s => s.canalNumero === data.mi_canal && s.subCanal === data.mi_sub_canal
      )
      const etiqueta = miSlot?.label ?? `Canal ${data.mi_canal}`
      if (data.en_vuelo) {
        mostrarNotificacion(`${data.mi_nombre} está volando en ${etiqueta}`)
      } else {
        mostrarNotificacion(`${etiqueta} — has aterrizado`)
      }
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de vuelo')
    }
  }

  const abrirEdicionNombre = () => {
    if (!panel) return
    // Quitar el prefijo "Cerdo " para mostrar solo el apellido en el input
    const nombreRaw = panel.mi_nombre.startsWith('Cerdo ')
      ? panel.mi_nombre.slice(6)
      : panel.mi_nombre
    setNombreEdicion(nombreRaw)
    setEditandoNombre(true)
  }

  const confirmarNombre = async () => {
    if (!sesionToken || !clubId) return
    try {
      const sesion = await InvitadosService.cambiarNombre(
        sesionToken,
        clubId,
        nombreEdicion.trim() || null,
      )
      setPanel((prev) => prev ? { ...prev, mi_nombre: sesion.nombre } : prev)
      setEditandoNombre(false)
    } catch (err: any) {
      alert(err.message || 'Error al cambiar nombre')
    }
  }

  const cancelarEdicion = () => setEditandoNombre(false)

  // ── Paso 1: Bienvenida ────────────────────────────────────────────────────
  if (paso === 'bienvenida') {
    return (
      <main className="form-main">
        <div className="canales-page invitado-bienvenida">
          <div className="invitado-welcome-card">
            <div className="invitado-welcome-icon">
              <UserPlus size={40} strokeWidth={1.5} />
            </div>
            <h1 className="invitado-welcome-title">Bienvenido al panel de vuelo</h1>
            <p className="invitado-welcome-desc">
              Podrás ver y ocupar canales de frecuencia sin necesidad de registrarte.
            </p>

            <div className="invitado-nombre-field">
              <label htmlFor="nombre-invitado">¿Cómo te llamamos?</label>
              <input
                id="nombre-invitado"
                type="text"
                placeholder="Tu nombre (opcional)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnirse()}
                maxLength={30}
                autoFocus
              />
              <p className="invitado-nombre-hint">
                Si lo dejas en blanco te asignamos un nombre creativo
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button
              className="btn btn-primary invitado-btn-entrar"
              onClick={handleUnirse}
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Entrar al panel de vuelo'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Paso 2: Panel de canales ──────────────────────────────────────────────
  return (
    <main className="form-main">
      <div className="canales-page">

        <div className="header-actions">
          <button
            className="btn-back"
            onClick={handleRefrescar}
            disabled={refrescando}
            title="Refrescar estado de los canales"
            aria-label="Refrescar estado de los canales"
          >
            <RefreshCw size={18} className={refrescando ? 'icon-spin' : undefined} />
          </button>
          <h1>
            <Radio size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Canal de Vuelo
          </h1>
          <span className="canales-live-indicator" title="Actualización automática" />
        </div>

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

        {mostrarTablaFreq && (
          <TablaFrecuenciasModal onClose={() => setMostrarTablaFreq(false)} />
        )}

        {/* Badge de nombre editable */}
        {panel && (
          <div className="invitado-nombre-badge">
            <span className="canales-desc">Conectado como</span>
            {editandoNombre ? (
              <div className="invitado-nombre-edit-row">
                <span className="invitado-cerdo-prefix">Cerdo</span>
                <input
                  ref={inputEdicionRef}
                  className="invitado-nombre-edit-input"
                  value={nombreEdicion}
                  onChange={(e) => setNombreEdicion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmarNombre()
                    if (e.key === 'Escape') cancelarEdicion()
                  }}
                  maxLength={30}
                  placeholder="nombre"
                />
                <button className="btn-back" onClick={confirmarNombre} title="Confirmar">
                  <Check size={16} />
                </button>
                <button className="btn-back" onClick={cancelarEdicion} title="Cancelar">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                className="invitado-nombre-btn"
                onClick={abrirEdicionNombre}
                title="Pulsa para cambiar tu nombre"
              >
                <span className="invitado-nombre-pink">{panel.mi_nombre}</span>
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}

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

        {notificacion && (
          <div className="canales-notificacion">
            <Plane size={14} />
            {notificacion}
          </div>
        )}

        {panel && (
          <div className="canales-grid">
            {slots.map((slot) => (
              <CanalCardInvitado
                key={slot.key}
                slot={slot}
                estoyAqui={slot.canalNumero === panel.mi_canal && slot.subCanal === panel.mi_sub_canal}
                enVuelo={panel.en_vuelo}
                onOcupar={() => handleOcupar(slot.canalNumero, slot.subCanal)}
                onLiberar={handleLiberar}
                onToggleVuelo={handleToggleVuelo}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

interface CanalCardInvitadoProps {
  slot: FpvSlotView
  estoyAqui: boolean
  enVuelo: boolean
  onOcupar: () => void
  onLiberar: () => void
  onToggleVuelo: () => void
}

function CanalCardInvitado({
  slot,
  estoyAqui,
  enVuelo,
  onOcupar,
  onLiberar,
  onToggleVuelo,
}: CanalCardInvitadoProps) {
  const noDisponible = slot.label === null

  return (
    <div
      className={`canal-card${slot.enVuelo ? ' canal-en-vuelo' : ''}${estoyAqui ? ' canal-activo' : ''}${noDisponible ? ' canal-no-disponible' : ''}`}
    >
      <div className="canal-card-header">
        <div className="canal-header-info">
          <span className="canal-numero">{slot.label ?? 'N/D'}</span>
          {slot.freq && <span className="canal-freq">{slot.freq} MHz</span>}
        </div>
        {slot.enVuelo && <span className="canal-badge-vuelo">EN VUELO</span>}
      </div>

      <div className="canal-pilotos">
        {slot.usuarios.length === 0 ? (
          <p className="canal-vacio">Sin pilotos — canal libre</p>
        ) : (
          <ul className="canal-lista-pilotos">
            {slot.usuarios.map((u, i) => (
              <li key={i} className={u.en_vuelo ? 'piloto-en-vuelo' : ''}>
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
        {!estoyAqui ? (
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
              className={`btn btn-sm canal-btn-vuelo${enVuelo ? ' canal-btn-aterrizar' : ''}`}
              onClick={onToggleVuelo}
              disabled={slot.enVuelo && !enVuelo}
            >
              {enVuelo
                ? <><PlaneLanding size={14} /> Aterrizar</>
                : <><Plane size={14} /> A volar</>
              }
            </button>
          </>
        )}
      </div>

      {slot.enVuelo && slot.pilotoVolando && !enVuelo && estoyAqui && (
        <div className="canal-aviso-vuelo">
          <AlertTriangle size={14} />
          {slot.pilotoVolando} está volando en esta frecuencia
        </div>
      )}
    </div>
  )
}
