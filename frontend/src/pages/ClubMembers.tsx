import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Siren, Crown, User, Clock, Check, Download, MoreVertical } from 'lucide-react'
import APIService from '../services/api'
import SocioService, { Socio } from '../services/socioService'
import { DocumentacionService, DocumentacionResponse } from '../services/documentacionService'
import { alertaService } from '../services/alertaService'
import { useClubRole } from '../hooks/useClubRole'
import '../styles/ClubMembers.css'
import '../styles/ClubDetail.css'

interface Miembro {
  id: number
  usuario_id: number
  club_id: number
  rol: 'administrador' | 'miembro'
  estado: 'activo' | 'pendiente' | 'inactivo'
  fecha_aprobacion?: string
  usuario?: {
    id: number
    email: string
    nombre_completo: string
  }
}

interface Club {
  id: number
  nombre: string
}

interface InvitacionResponse {
  message: string
  invitaciones: Array<{
    email: string
    token: string
    status: string
  }>
  errores?: Array<{
    email: string
    status: string
    error: string
  }> | null
  total_procesados: number
  exitosos: number
  fallidos: number
}

export default function ClubMembers() {
  const navigate = useNavigate()
  const { clubId } = useParams<{ clubId: string }>()
  const { usuario } = useAuth()
  const { role } = useClubRole(clubId)
  const [, setClub] = useState<Club | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [socios, setSocios] = useState<Record<number, Socio>>({})
  const [socioPhotoUrls, setSocioPhotoUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitacionEmail, setInvitacionEmail] = useState('')
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false)
  const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null)
  const [estadoUpdatingId, setEstadoUpdatingId] = useState<number | null>(null)
  const [docsUserId, setDocsUserId] = useState<number | null>(null)
  const [docsData, setDocsData] = useState<DocumentacionResponse | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [alertasPorUsuario, setAlertasPorUsuario] = useState<Record<number, number>>({})
  const [, setLoadingAlertas] = useState(false)
  const [activeTab, setActiveTab] = useState<'activos' | 'inactivos'>('activos')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const activos = useMemo(() => miembros.filter(m => m.estado === 'activo'), [miembros])
  const inactivos = useMemo(() => miembros.filter(m => m.estado !== 'activo'), [miembros])
  const visibleMiembros = activeTab === 'activos' ? activos : inactivos

  useEffect(() => {
    if (clubId) {
      loadClubAndMembers()
    }
  }, [clubId])

  useEffect(() => {
    if (!clubId) return
    const isAdmin = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin
    if (isAdmin) {
      loadAlertasPorUsuario()
    }
  }, [role, usuario?.es_superadmin, clubId])

  useEffect(() => {
    let isActive = true

    const loadPhotos = async () => {
      const sociosWithPhoto = Object.values(socios).filter((socio) => socio.tiene_foto)

      if (sociosWithPhoto.length === 0) {
        setSocioPhotoUrls((prev) => {
          Object.values(prev).forEach((url) => URL.revokeObjectURL(url))
          return {}
        })
        return
      }

      const results = await Promise.all(
        sociosWithPhoto.map(async (socio) => [
          socio.usuario_id,
          await SocioService.fetchFotoBlob(socio.id)
        ] as const)
      )

      if (!isActive) {
        results.forEach(([, url]) => {
          if (url) URL.revokeObjectURL(url)
        })
        return
      }

      setSocioPhotoUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url))
        const next: Record<number, string> = {}
        results.forEach(([userId, url]) => {
          if (url) {
            next[userId] = url
          }
        })
        return next
      })
    }

    loadPhotos()

    return () => {
      isActive = false
    }
  }, [socios])

  const loadClubAndMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const [clubData, miembrosData, sociosList] = await Promise.all([
        APIService.get<Club>(`/clubes/${clubId}`),
        APIService.get<Miembro[]>(`/clubes/${clubId}/miembros?include_inactivos=true`),
        SocioService.getSociosByClub(Number(clubId)).catch(() => []) as Promise<Socio[]>
      ])
      
      setClub(clubData)
      const sociosMap = sociosList.reduce<Record<number, Socio>>((acc, s) => {
        acc[s.usuario_id] = s
        return acc
      }, {})
      setSocios(sociosMap)

      setMiembros(miembrosData)
    } catch (err) {
      setError('Error al cargar los datos del club')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadAlertasPorUsuario = async () => {
    try {
      setLoadingAlertas(true)
      const alertas = await alertaService.obtenerAlertasPorUsuario(Number(clubId))
      setAlertasPorUsuario(alertas)
    } catch (err) {
      console.error('Error al cargar alertas:', err)
      // No mostrar error al usuario, solo log
    } finally {
      setLoadingAlertas(false)
    }
  }

  const handleInvitarMiembro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!invitacionEmail) {
      setError('Por favor ingresa al menos un email')
      return
    }

    try {
      setEnviandoInvitacion(true)
      const data = await APIService.post<InvitacionResponse>(`/clubes/${clubId}/miembros/invitar`, {
        email: invitacionEmail,
      })
      
      // Mostrar resultados de las invitaciones
      const exitosos = data.exitosos || 0
      const fallidos = data.fallidos || 0
      const errores = data.errores || []
      
      if (fallidos === 0) {
        setSuccess(`✓ ${exitosos} invitación(es) enviada(s) exitosamente`)
      } else {
        let mensaje = `✓ ${exitosos} invitación(es) enviada(s)`
        if (fallidos > 0) {
          mensaje += `\n✗ ${fallidos} fallida(s)`
          if (errores.length > 0) {
            const detallesErrores = errores.map((e: any) => `${e.email}: ${e.error}`).join('\n')
            mensaje += `\n\nDetalles:\n${detallesErrores}`
          }
        }
        setError(mensaje)
      }
      
      setInvitacionEmail('')
      setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
    } catch (err) {
      setError((err as Error).message || 'Error al enviar la invitación')
    } finally {
      setEnviandoInvitacion(false)
    }
  }

  const handleRemoveMember = async (usuarioId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del club?')) {
      return
    }

    try {
      setError(null)
      await APIService.delete(`/clubes/${clubId}/miembros/${usuarioId}`)
      await loadClubAndMembers()
      setSuccess('Miembro eliminado del club')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Error al remover el miembro')
      console.error(err)
    }
  }

  const handleDeleteSocio = async (socioId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este socio? Esta acción es irreversible.')) {
        return
    }
    try {
        setError(null)
        await SocioService.deleteSocio(socioId)
        setSuccess('Socio eliminado exitosamente')
        // Refresh data or remove from state
        setSocios(prev => {
            const newState = { ...prev }
            const userId = Object.keys(newState).find(k => newState[Number(k)].id === socioId)
            if (userId) delete newState[Number(userId)]
            return newState
        })
        setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
        setError('Error al eliminar socio')
        console.error(err)
    }
  }

  const handleOpenDocs = async (userId: number) => {
    setDocsUserId(userId)
    setDocsLoading(true)
    setDocsError(null)
    setDocsData(null)
    try {
        const data = await DocumentacionService.getByUser(userId)
        setDocsData(data)
    } catch (err) {
        const msg = (err as Error).message
        if (msg.includes('404')) {
            setDocsError('No hay documentación para este usuario')
        } else {
            setDocsError('Error al cargar documentación')
        }
    } finally {
        setDocsLoading(false)
    }
  }

  const handleDownloadDoc = async (type: 'rc' | 'carnet') => {
    if (!docsUserId) return
    try {
        let blob: Blob
        if (type === 'rc') blob = await DocumentacionService.downloadRC(docsUserId)
        else blob = await DocumentacionService.downloadCarnet(docsUserId)
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = type === 'rc' ? 'seguro_rc' : 'carnet_piloto'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    } catch (err) {
        alert('Error al descargar archivo')
        console.error(err)
    }
  }

  const handleChangeRole = async (usuarioId: number, newRole: Miembro['rol']) => {
    if (usuarioId === usuario?.id) {
      return
    }
    try {
      setError(null)
      setRoleUpdatingId(usuarioId)
      await APIService.put(`/clubes/${clubId}/miembros/${usuarioId}/rol`, {
        rol: newRole
      })
      setMiembros(prev => prev.map(m => (
        m.usuario_id === usuarioId ? { ...m, rol: newRole } : m
      )))
      setSuccess('Rol actualizado exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Error al actualizar el rol')
      console.error(err)
    } finally {
      setRoleUpdatingId(null)
    }
  }

  const handleChangeEstado = async (usuarioId: number, estado: Miembro['estado']) => {
    if (usuarioId === usuario?.id) {
      return
    }
    try {
      setError(null)
      setEstadoUpdatingId(usuarioId)
      await APIService.put(`/clubes/${clubId}/miembros/${usuarioId}/estado`, {
        estado
      })
      setMiembros(prev => prev.map(m => (
        m.usuario_id === usuarioId ? { ...m, estado } : m
      )))
      setSuccess('Estado actualizado exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Error al actualizar el estado')
      console.error(err)
    } finally {
      setEstadoUpdatingId(null)
    }
  }

  const handleMemberAction = async (miembro: Miembro, action: string) => {
    if (!action) {
      return
    }

    if (action === 'docs') {
      await handleOpenDocs(miembro.usuario_id)
      return
    }

    if (action === 'baja_socio') {
      const socio = socios[miembro.usuario_id]
      if (socio) {
        await handleDeleteSocio(socio.id)
      }
      return
    }

    if (action === 'rol_admin') {
      await handleChangeRole(miembro.usuario_id, 'administrador')
      return
    }

    if (action === 'rol_miembro') {
      await handleChangeRole(miembro.usuario_id, 'miembro')
      return
    }

    if (action === 'desactivar') {
      await handleChangeEstado(miembro.usuario_id, 'inactivo')
      return
    }

    if (action === 'activar') {
      await handleChangeEstado(miembro.usuario_id, 'activo')
      return
    }

    if (action === 'eliminar') {
      await handleRemoveMember(miembro.usuario_id)
    }
  }

  const isAdmin = miembros.some(m => m.usuario_id === usuario?.id && m.rol === 'administrador')

  const MemberKebab = useCallback(({ miembro }: { miembro: Miembro }) => {
    const ref = useRef<HTMLDivElement>(null)
    const isOpen = openMenuId === miembro.id
    const isSelf = miembro.usuario_id === usuario?.id
    const isAdminRole = miembro.rol === 'administrador'
    const hasSocio = Boolean(socios[miembro.usuario_id])
    const isInactive = miembro.estado === 'inactivo'
    const isBusy = roleUpdatingId === miembro.usuario_id || estadoUpdatingId === miembro.usuario_id

    useEffect(() => {
      if (!isOpen) return
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenuId(null)
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    const doAction = (action: string) => {
      setOpenMenuId(null)
      handleMemberAction(miembro, action)
    }

    return (
      <div className="member-kebab" ref={ref}>
        <button
          className="member-kebab-btn"
          onClick={() => setOpenMenuId(isOpen ? null : miembro.id)}
          disabled={isBusy}
        >
          <MoreVertical size={18} />
        </button>
        {isOpen && (
          <div className="member-kebab-menu">
            <button className="member-kebab-item" onClick={() => doAction('docs')}>
              <Download size={14} /> Ver Docs
            </button>
            {hasSocio && (
              <button className="member-kebab-item member-kebab-item--danger" onClick={() => doAction('baja_socio')}>
                Baja Socio
              </button>
            )}
            {!isSelf && isAdminRole && (
              <button className="member-kebab-item" onClick={() => doAction('rol_miembro')}>
                <User size={14} /> Quitar Admin
              </button>
            )}
            {!isSelf && !isAdminRole && (
              <button className="member-kebab-item" onClick={() => doAction('rol_admin')}>
                <Crown size={14} /> Hacer Admin
              </button>
            )}
            {!isSelf && !isAdminRole && !isInactive && (
              <button className="member-kebab-item member-kebab-item--danger" onClick={() => doAction('desactivar')}>
                Desactivar
              </button>
            )}
            {!isSelf && !isAdminRole && isInactive && (
              <button className="member-kebab-item" onClick={() => doAction('activar')}>
                <Check size={14} /> Activar
              </button>
            )}
            {!isSelf && !isAdminRole && isInactive && (
              <button className="member-kebab-item member-kebab-item--danger" onClick={() => doAction('eliminar')}>
                Eliminar del club
              </button>
            )}
          </div>
        )}
      </div>
    )
  }, [openMenuId, socios, roleUpdatingId, estadoUpdatingId, usuario?.id, handleMemberAction])

  if (loading) {
    return (
      <>
        <div className="loading-wrapper">
          <div className="spinner"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="club-detail-main">
        <div className="club-detail-container">

          {/* Header */}
          <div className="page-header-row">
            <h1 className="page-title">Miembros</h1>
            {isAdmin && (
              <form onSubmit={handleInvitarMiembro} className="members-invite-row">
                <input
                  type="text"
                  placeholder="Email para invitar"
                  value={invitacionEmail}
                  onChange={(e) => setInvitacionEmail(e.target.value)}
                  className="form-input members-invite-input"
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm members-invite-btn"
                  disabled={enviandoInvitacion}
                  title="Enviar invitación"
                >
                  <Mail size={16} />
                </button>
              </form>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Tabs */}
          <div className="content-tabs">
            <button
              className={`content-tab ${activeTab === 'activos' ? 'active' : ''}`}
              onClick={() => setActiveTab('activos')}
            >
              Activos · {activos.length}
            </button>
            <button
              className={`content-tab ${activeTab === 'inactivos' ? 'active' : ''}`}
              onClick={() => setActiveTab('inactivos')}
            >
              Inactivos · {inactivos.length}
            </button>
          </div>

          {/* Lista de miembros */}
          {visibleMiembros.length === 0 ? (
            <div className="empty-state">
              <p>No hay miembros en esta categoría</p>
            </div>
          ) : (
            <div className="members-list-v2">
              {visibleMiembros.map(miembro => {
                const numAlertas = alertasPorUsuario[miembro.usuario_id] || 0
                const photoUrl = socioPhotoUrls[miembro.usuario_id]

                return (
                  <article key={miembro.id} className="member-card-v2">
                    <div className="member-card-left">
                      <div className="member-avatar-v2">
                        {photoUrl ? (
                          <img src={photoUrl} alt={miembro.usuario?.nombre_completo} />
                        ) : (
                          (miembro.usuario?.nombre_completo || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="member-card-info">
                        <div className="member-card-name-row">
                          <span className="member-card-name">
                            {miembro.usuario?.nombre_completo || 'Usuario desconocido'}
                          </span>
                          {numAlertas > 0 && (
                            <button
                              onClick={() => navigate(`/admin/alertas?club=${clubId}&usuario=${miembro.usuario_id}`)}
                              className="alert-badge-button"
                              title={`${numAlertas} alerta(s)`}
                            >
                              <Siren size={12} /> {numAlertas}
                            </button>
                          )}
                        </div>
                        <p className="member-card-email">{miembro.usuario?.email}</p>
                        <div className="member-card-meta">
                          {miembro.rol === 'administrador' ? (
                            <span className="member-role-pill member-role-admin">
                              <Crown size={11} /> Admin
                            </span>
                          ) : (
                            <span className="member-role-pill member-role-member">
                              <User size={11} /> Miembro
                            </span>
                          )}
                          {miembro.estado === 'pendiente' && (
                            <span className="member-status-pill member-status-pending">
                              <Clock size={11} /> Pendiente
                            </span>
                          )}
                          {socios[miembro.usuario_id] && (
                            <span className="member-role-pill member-role-socio">Socio</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && <MemberKebab miembro={miembro} />}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {docsUserId && (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white', padding: '2rem', borderRadius: '8px',
                maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
                position: 'relative'
            }}>
                <button 
                    onClick={() => setDocsUserId(null)}
                    style={{position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
                >
                    &times;
                </button>
                <h2>Documentación de Usuario</h2>
                {docsLoading && <p>Cargando...</p>}
                {docsError && <p className="alert alert-error">{docsError}</p>}
                
                {docsData && (
                    <div className="docs-details">
                        <div className="doc-section" style={{marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem'}}>
                            <h3>Seguro RC</h3>
                            <p><strong>Número:</strong> {docsData.rc_numero || 'No registrado'}</p>
                            <p><strong>Vencimiento:</strong> {docsData.rc_fecha_vencimiento ? new Date(docsData.rc_fecha_vencimiento).toLocaleDateString() : '-'}</p>
                            {docsData.rc_tiene_archivo ? (
                                <button className="btn btn-primary btn-sm" onClick={() => handleDownloadDoc('rc')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Download size={14} /> Descargar PDF
                                </button>
                            ) : (
                                <span className="badge badge-warning">Sin archivo</span>
                            )}
                        </div>
                        
                        <div className="doc-section">
                            <h3>Carnet/Licencia</h3>
                            <p><strong>Número:</strong> {docsData.carnet_numero || 'No registrado'}</p>
                            <p><strong>Vencimiento:</strong> {docsData.carnet_fecha_vencimiento ? new Date(docsData.carnet_fecha_vencimiento).toLocaleDateString() : '-'}</p>
                            {docsData.carnet_tiene_archivo ? (
                                <button className="btn btn-primary btn-sm" onClick={() => handleDownloadDoc('carnet')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Download size={14} /> Descargar Archivo
                                </button>
                            ) : (
                                <span className="badge badge-warning">Sin archivo</span>
                            )}
                        </div>
                    </div>
                )}
                
                <div style={{marginTop: '2rem', textAlign: 'right'}}>
                    <button className="btn btn-secondary" onClick={() => setDocsUserId(null)}>Cerrar</button>
                </div>
            </div>
        </div>
      )}
    </>
  )
}
