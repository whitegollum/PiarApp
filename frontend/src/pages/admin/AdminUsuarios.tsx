import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import APIService from '../../services/api'
import Navbar from '../../components/Navbar'
import { Users, Search, UserCheck, UserX, Shield, Plus, X } from 'lucide-react'
import '../../styles/Forms.css'
import '../../styles/Admin.css'
import '../../styles/AdminUsuarios.css'

interface UsuarioClub {
  club_id: number
  club_nombre: string
  rol: string
  estado: string
}

interface UsuarioAdmin {
  id: number
  email: string
  nombre_completo: string
  activo: boolean
  es_superadmin: boolean
  email_verificado: boolean
  fecha_creacion?: string
  ultimo_login?: string
  clubes: UsuarioClub[]
}

interface ClubBasico {
  id: number
  nombre: string
  slug: string
}

const ROLES = [
  'administrador',
  'editor',
  'moderador',
  'gestor_eventos',
  'tesorero',
  'socio',
  'visitante',
]

export default function AdminUsuarios() {
  const { usuario, isLoading } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [clubes, setClubes] = useState<ClubBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<number | null>(null)

  // Estado del formulario de asociación por usuario
  const [nuevoClubId, setNuevoClubId] = useState<string>('')
  const [nuevoRol, setNuevoRol] = useState<string>('socio')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!isLoading && (!usuario || !usuario.es_superadmin)) {
      navigate('/')
      return
    }
    if (usuario?.es_superadmin) cargarDatos()
  }, [usuario, isLoading, navigate])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [usuariosData, clubesData] = await Promise.all([
        APIService.get<UsuarioAdmin[]>('/admin/usuarios'),
        APIService.get<ClubBasico[]>('/clubes'),
      ])
      setUsuarios(usuariosData)
      setClubes(clubesData)
    } catch (err) {
      setError('Error al cargar usuarios: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const actualizarUsuarioEnLista = (actualizado: UsuarioAdmin) => {
    setUsuarios(prev => prev.map(u => (u.id === actualizado.id ? actualizado : u)))
  }

  const toggleActivo = async (u: UsuarioAdmin) => {
    setError('')
    try {
      const actualizado = await APIService.patch<UsuarioAdmin>(`/admin/usuarios/${u.id}`, {
        activo: !u.activo,
      })
      actualizarUsuarioEnLista(actualizado)
    } catch (err) {
      setError('Error al actualizar usuario: ' + (err as Error).message)
    }
  }

  const asociarClub = async (u: UsuarioAdmin) => {
    if (!nuevoClubId) return
    setProcesando(true)
    setError('')
    try {
      const actualizado = await APIService.post<UsuarioAdmin>(`/admin/usuarios/${u.id}/clubes`, {
        club_id: parseInt(nuevoClubId),
        rol: nuevoRol,
      })
      actualizarUsuarioEnLista(actualizado)
      setNuevoClubId('')
      setNuevoRol('socio')
    } catch (err) {
      setError('Error al asociar al club: ' + (err as Error).message)
    } finally {
      setProcesando(false)
    }
  }

  const retirarClub = async (u: UsuarioAdmin, clubId: number) => {
    setError('')
    try {
      const actualizado = await APIService.delete<UsuarioAdmin>(`/admin/usuarios/${u.id}/clubes/${clubId}`)
      actualizarUsuarioEnLista(actualizado)
    } catch (err) {
      setError('Error al retirar del club: ' + (err as Error).message)
    }
  }

  const toggleExpandir = (id: number) => {
    setExpandido(prev => (prev === id ? null : id))
    setNuevoClubId('')
    setNuevoRol('socio')
  }

  if (isLoading) return null
  if (!usuario?.es_superadmin) return null

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      u.nombre_completo.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.clubes.some(c => c.club_nombre.toLowerCase().includes(q))
    )
  })

  return (
    <>
      <Navbar />
      <main className="form-main">
        <div className="admin-usuarios-page">
          <div className="admin-header">
            <h1><Users size={24} /> Usuarios</h1>
            <p className="subtitle">Gestiona todos los usuarios de la aplicación, sus clubes y su estado.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="admin-usuarios-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Buscar por nombre, email o club..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="admin-usuarios-skeleton">
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="admin-usuarios-empty">
              <Users size={48} strokeWidth={1.2} />
              <h3>No se encontraron usuarios</h3>
            </div>
          ) : (
            <div className="admin-usuarios-list">
              {usuariosFiltrados.map(u => (
                <div key={u.id} className={`admin-usuario-card ${!u.activo ? 'inactivo' : ''}`}>
                  <div className="admin-usuario-main" onClick={() => toggleExpandir(u.id)}>
                    <div className="admin-usuario-avatar">
                      {u.nombre_completo.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-usuario-info">
                      <div className="admin-usuario-nombre">
                        {u.nombre_completo}
                        {u.es_superadmin && (
                          <span className="badge badge-super" title="Superadministrador">
                            <Shield size={11} /> Super
                          </span>
                        )}
                        <span className={`badge ${u.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="admin-usuario-email">{u.email}</div>
                      <div className="admin-usuario-clubes-resumen">
                        {u.clubes.length === 0
                          ? 'Sin clubes'
                          : `${u.clubes.length} club${u.clubes.length > 1 ? 'es' : ''}`}
                      </div>
                    </div>
                    <div className="admin-usuario-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => toggleActivo(u)}
                        disabled={u.id === usuario.id}
                        title={u.id === usuario.id ? 'No puedes cambiar tu propia cuenta' : ''}
                      >
                        {u.activo ? <><UserX size={14} /> Desactivar</> : <><UserCheck size={14} /> Activar</>}
                      </button>
                    </div>
                  </div>

                  {expandido === u.id && (
                    <div className="admin-usuario-detalle">
                      <h4>Clubes</h4>
                      {u.clubes.length === 0 ? (
                        <p className="admin-usuario-sin-clubes">Este usuario no pertenece a ningún club.</p>
                      ) : (
                        <div className="admin-usuario-club-chips">
                          {u.clubes.map(c => (
                            <div key={c.club_id} className="admin-club-chip">
                              <span className="admin-club-chip-nombre">{c.club_nombre}</span>
                              <span className="admin-club-chip-rol">{c.rol}</span>
                              <button
                                className="admin-club-chip-remove"
                                title={`Retirar de ${c.club_nombre}`}
                                onClick={() => retirarClub(u, c.club_id)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="admin-usuario-asociar">
                        <select
                          value={nuevoClubId}
                          onChange={e => setNuevoClubId(e.target.value)}
                        >
                          <option value="">Selecciona un club...</option>
                          {clubes
                            .filter(c => !u.clubes.some(uc => uc.club_id === c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)}>
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => asociarClub(u)}
                          disabled={!nuevoClubId || procesando}
                        >
                          <Plus size={14} /> Asociar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
