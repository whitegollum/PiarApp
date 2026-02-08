import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import APIService from '../services/api'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitacionEmail, setInvitacionEmail] = useState('')
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false)
  const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null)
  const [roleSelections, setRoleSelections] = useState<Record<number, Miembro['rol']>>({})

  useEffect(() => {
    if (clubId) {
      loadClubAndMembers()
    }
  }, [clubId])

  const loadClubAndMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const [clubData, miembrosData] = await Promise.all([
        APIService.get<Club>(`/clubes/${clubId}`),
        APIService.get<Miembro[]>(`/clubes/${clubId}/miembros`),
      ])
      setClub(clubData)
      setMiembros(miembrosData)
      setRoleSelections(
        miembrosData.reduce<Record<number, Miembro['rol']>>((acc, miembro) => {
          acc[miembro.usuario_id] = miembro.rol
          return acc
        }, {})
      )
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
    if (!confirm('¿Estás seguro de que deseas remover a este miembro?')) {
      return
    }

    try {
      setError(null)
      await APIService.delete(`/clubes/${clubId}/miembros/${usuarioId}`)
      await loadClubAndMembers()
      setSuccess('Miembro removido exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Error al remover el miembro')
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
                {miembros.map(miembro => (
                  <div key={miembro.id} className="member-item">
                    <div className="member-avatar">
                      {miembro.usuario?.nombre_completo.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="member-info">
                      <h3>{miembro.usuario?.nombre_completo || 'Usuario desconocido'}</h3>
                      <p className="member-email">{miembro.usuario?.email || 'Sin email'}</p>
                      <div className="member-meta">
                        <span className={`role-badge role-${miembro.rol}`}>
                          {miembro.rol === 'administrador' ? '👑 Administrador' : '👤 Miembro'}
                        </span>
                        <span className={`status-badge status-${miembro.estado}`}>
                          {miembro.estado === 'activo' && '✓ Activo'}
                          {miembro.estado === 'pendiente' && '⏳ Pendiente'}
                          {miembro.estado === 'inactivo' && '× Inactivo'}
                        </span>
                        {miembro.fecha_aprobacion && <small>Aprobado: {new Date(miembro.fecha_aprobacion).toLocaleDateString('es-ES')}</small>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="member-actions">
                        {miembro.usuario_id !== usuario?.id && (
                          <>
                            <select
                              className="role-select"
                              value={roleSelections[miembro.usuario_id] || miembro.rol}
                              onChange={(e) =>
                                setRoleSelections(prev => ({
                                  ...prev,
                                  [miembro.usuario_id]: e.target.value as Miembro['rol']
                                }))
                              }
                              disabled={roleUpdatingId === miembro.usuario_id}
                            >
                              <option value="administrador">Administrador</option>
                              <option value="miembro">Miembro</option>
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleChangeRole(miembro.usuario_id, roleSelections[miembro.usuario_id] || miembro.rol)}
                              disabled={roleUpdatingId === miembro.usuario_id}
                            >
                              🔁 Cambiar rol
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveMember(miembro.usuario_id)}
                          disabled={miembro.usuario_id === usuario?.id}
                          title={miembro.usuario_id === usuario?.id ? 'No puedes removerte a ti mismo' : 'Remover miembro'}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
