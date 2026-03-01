import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import APIService from '../services/api'
import SocioService, { Socio } from '../services/socioService'
import { DocumentacionService, DocumentacionResponse } from '../services/documentacionService'
import '../styles/ClubMembers.css'

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

export default function ClubMembers() {
  const navigate = useNavigate()
  const { clubId } = useParams<{ clubId: string }>()
  const { usuario } = useAuth()
  const [club, setClub] = useState<Club | null>(null)
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

  useEffect(() => {
    if (clubId) {
      loadClubAndMembers()
    }
  }, [clubId])

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

  const handleInvitarMiembro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!invitacionEmail) {
      setError('Por favor ingresa un email')
      return
    }

    try {
      setEnviandoInvitacion(true)
      await APIService.post(`/clubes/${clubId}/miembros/invitar`, {
        email: invitacionEmail,
      })
      
      setSuccess('Invitación enviada exitosamente')
      setInvitacionEmail('')
      setTimeout(() => setSuccess(null), 3000)
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-wrapper">
          <div className="spinner"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="club-members-layout">
        <div className="members-container">
          <div className="members-header">
            <button 
              className="btn btn-back"
              onClick={() => navigate(`/clubes/${clubId}`)}
            >
              ← Volver
            </button>
            <h1>Miembros de {club?.nombre}</h1>
            <p>Administra los miembros de tu club</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Sección de invitaciones (solo para administradores) */}
          {isAdmin && (
            <section className="members-section">
              <h2>Invitar Nuevo Miembro</h2>
              <form onSubmit={handleInvitarMiembro} className="invite-form">
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Email del nuevo miembro"
                    value={invitacionEmail}
                    onChange={(e) => setInvitacionEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={enviandoInvitacion}
                  >
                    {enviandoInvitacion ? 'Enviando...' : '📧 Invitar'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Lista de miembros */}
          <section className="members-section">
            <h2>Lista de Miembros ({miembros.length})</h2>
            
            {miembros.length === 0 ? (
              <div className="empty-state">
                <p>No hay miembros en este club aún</p>
              </div>
            ) : (
              <div className="members-list">
                {miembros.map(miembro => {
                  const isSelf = miembro.usuario_id === usuario?.id
                  const isAdminRole = miembro.rol === 'administrador'
                  const hasSocio = Boolean(socios[miembro.usuario_id])
                  const isInactive = miembro.estado === 'inactivo'
                  const isBusy = roleUpdatingId === miembro.usuario_id || estadoUpdatingId === miembro.usuario_id
                  const photoUrl = socioPhotoUrls[miembro.usuario_id]

                  return (
                  <div key={miembro.id} className="member-item">
                    <div className="member-avatar-col">
                      <div className="member-avatar">
                        {photoUrl ? (
                          <img src={photoUrl} alt={`Foto de ${miembro.usuario?.nombre_completo || 'socio'}`} />
                        ) : (
                          miembro.usuario?.nombre_completo.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <span className={`member-status-mini status-${miembro.estado}`}>
                        {miembro.estado === 'activo' && 'Activo'}
                        {miembro.estado === 'pendiente' && 'Pendiente'}
                        {miembro.estado === 'inactivo' && 'Inactivo'}
                      </span>
                    </div>
                    <div className="member-info">
                      <h3>{miembro.usuario?.nombre_completo || 'Usuario desconocido'}</h3>
                      <p className="member-email">{miembro.usuario?.email || 'Sin email'}</p>
                      <div className="member-meta">
                        <span
                          className={`role-badge role-${miembro.rol}`}
                          data-role-label={miembro.rol === 'administrador' ? 'Administrador' : 'Miembro'}
                        >
                          {miembro.rol === 'administrador' ? '👑 Administrador' : '👤 Miembro'}
                        </span>
                        <span className={`status-badge status-estado status-${miembro.estado}`}>
                          {miembro.estado === 'activo' && '✓ Activo'}
                          {miembro.estado === 'pendiente' && '⏳ Pendiente'}
                          {miembro.estado === 'inactivo' && '× Inactivo'}
                        </span>
                        {socios[miembro.usuario_id] && (
                          <span className="status-badge status-activo">Socio Activo</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="member-actions">
                        <select
                          className="actions-select"
                          defaultValue=""
                          onChange={(e) => {
                            const value = e.target.value
                            e.currentTarget.value = ''
                            handleMemberAction(miembro, value)
                          }}
                          disabled={isBusy}
                        >
                          <option value="" disabled>Acciones...</option>
                          <option value="docs">Ver Docs</option>
                          {hasSocio && <option value="baja_socio">Baja Socio</option>}
                          {!isSelf && miembro.rol === 'miembro' && <option value="rol_admin">Cambiar a Admin</option>}
                          {!isSelf && miembro.rol === 'administrador' && <option value="rol_miembro">Cambiar a Miembro</option>}
                          {!isSelf && !isAdminRole && !isInactive && <option value="desactivar">Desactivar</option>}
                          {!isSelf && !isAdminRole && isInactive && <option value="activar">Cambiar a Activo</option>}
                          {!isSelf && !isAdminRole && isInactive && <option value="eliminar">Eliminar del club</option>}
                        </select>
                        {miembro.fecha_aprobacion && (
                          <small className="approval-date approval-date-inline">
                            Aprobado: {new Date(miembro.fecha_aprobacion).toLocaleDateString('es-ES')}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

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
                                <button className="btn btn-primary btn-sm" onClick={() => handleDownloadDoc('rc')}>
                                    📥 Descargar PDF
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
                                <button className="btn btn-primary btn-sm" onClick={() => handleDownloadDoc('carnet')}>
                                    📥 Descargar Archivo
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
