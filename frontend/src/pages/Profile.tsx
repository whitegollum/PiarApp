import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import APIService from '../services/api'
import SocioService, { Socio, SocioCreate, SocioUpdate } from '../services/socioService'
import '../styles/Forms.css'
import '../styles/Profile.css'

interface FormData {
  nombre_completo: string
  email: string
  current_password?: string
  new_password?: string
  confirm_password?: string
}

interface ProfileUser {
  id: number
  email: string
  nombre_completo: string
  fecha_creacion: string
  ultimo_login?: string
  email_verificado?: boolean
  es_superadmin?: boolean
}

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion?: string
  fecha_creacion: string
}

interface SocioFormState {
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  direccion: string
  especialidades: string
}

const emptySocioForm: SocioFormState = {
  nombre: '',
  email: '',
  telefono: '',
  fecha_nacimiento: '',
  direccion: '',
  especialidades: ''
}

const toDateInput = (value?: string): string => {
  if (!value) return ''
  return value.slice(0, 10)
}

const parseEspecialidades = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function Profile() {
  const navigate = useNavigate()
  const { usuario, updateUser } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    nombre_completo: usuario?.nombre_completo || '',
    email: usuario?.email || '',
  })
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)
  const [socio, setSocio] = useState<Socio | null>(null)
  const [socioForm, setSocioForm] = useState<SocioFormState>(emptySocioForm)
  const [socioFotoFile, setSocioFotoFile] = useState<File | null>(null)
  const [socioFotoUrl, setSocioFotoUrl] = useState<string>('')
  const [loadingSocio, setLoadingSocio] = useState(false)
  const [socioError, setSocioError] = useState<string | null>(null)
  const [socioSuccess, setSocioSuccess] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoadingProfile(true)
        setError(null)
        const [profileData, clubsData] = await Promise.all([
          APIService.get<ProfileUser>('/auth/usuarios/me'),
          APIService.get<Club[]>('/clubes')
        ])
        setProfileUser(profileData)
        setClubs(clubsData)
        if (clubsData.length > 0) {
          setSelectedClubId(prev => prev ?? clubsData[0].id)
        }
        setFormData({
          nombre_completo: profileData.nombre_completo,
          email: profileData.email
        })
      } catch (err) {
        setError('Error al cargar la informacion del perfil')
        console.error(err)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfileData()
  }, [])

  useEffect(() => {
    if (!selectedClubId || !usuario?.id) {
      return
    }

    const loadSocio = async () => {
      try {
        setLoadingSocio(true)
        setSocioError(null)
        setSocioSuccess(null)
        const socios = await SocioService.getSociosByClub(selectedClubId)
        const socioMatch = socios.find((item) => item.usuario_id === usuario.id) || null
        setSocio(socioMatch)
        setSocioFotoFile(null)

        if (socioMatch?.tiene_foto) {
          const photo = await SocioService.fetchFotoBlob(socioMatch.id)
          setSocioFotoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return photo
          })
        } else {
          setSocioFotoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return ''
          })
        }

        if (socioMatch) {
          setSocioForm({
            nombre: socioMatch.nombre,
            email: socioMatch.email,
            telefono: socioMatch.telefono || '',
            fecha_nacimiento: toDateInput(socioMatch.fecha_nacimiento),
            direccion: socioMatch.direccion || '',
            especialidades: (socioMatch.especialidades || []).join(', ')
          })
        } else {
          setSocioForm({
            ...emptySocioForm,
            nombre: usuario.nombre_completo || '',
            email: usuario.email || ''
          })
        }
      } catch (err) {
        setSocioError('Error al cargar el perfil de socio')
      } finally {
        setLoadingSocio(false)
      }
    }

    loadSocio()
  }, [selectedClubId, usuario])

  useEffect(() => {
    return () => {
      if (socioFotoUrl) {
        URL.revokeObjectURL(socioFotoUrl)
      }
    }
  }, [socioFotoUrl])

  const selectedClub = useMemo(() => {
    if (!selectedClubId) return null
    return clubs.find((club) => club.id === selectedClubId) || null
  }, [clubs, selectedClubId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      setLoading(true)
      const response = await APIService.put<ProfileUser>('/auth/usuarios/me', {
        nombre_completo: formData.nombre_completo,
      })

      setProfileUser(response)
      updateUser(response)
      setSuccess('Perfil actualizado exitosamente')
      setIsEditing(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError((err as Error).message || 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!formData.current_password || !formData.new_password) {
      setPasswordError('Por favor completa todos los campos de contraseña')
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    if (formData.new_password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    try {
      setLoading(true)
      await APIService.post('/auth/usuarios/cambiar-contraseña', {
        contraseña_actual: formData.current_password,
        contraseña_nueva: formData.new_password,
      })
      
      setPasswordSuccess('Contraseña cambiada exitosamente')
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
      setShowPasswordForm(false)
      setTimeout(() => setPasswordSuccess(null), 3000)
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setPasswordError((err as Error).message || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadData = async () => {
    try {
      setLoading(true)
      const data = await APIService.get('/auth/usuarios/me/export')
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `piar-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('Datos descargados exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Error al descargar datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSocioChange = (key: keyof SocioFormState, value: string) => {
    setSocioForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSocioSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedClubId || !usuario?.id) {
      return
    }

    try {
      setLoading(true)
      setSocioError(null)
      setSocioSuccess(null)

      const payload: SocioUpdate = {
        nombre: socioForm.nombre,
        email: socioForm.email,
        telefono: socioForm.telefono || undefined,
        fecha_nacimiento: socioForm.fecha_nacimiento || undefined,
        direccion: socioForm.direccion || undefined,
        especialidades: parseEspecialidades(socioForm.especialidades)
      }

      let savedSocio: Socio
      if (socio) {
        savedSocio = await SocioService.updateSocio(socio.id, payload)
      } else {
        const createPayload: SocioCreate = {
          nombre: socioForm.nombre,
          email: socioForm.email,
          telefono: socioForm.telefono || undefined,
          fecha_nacimiento: socioForm.fecha_nacimiento || undefined,
          direccion: socioForm.direccion || undefined,
          especialidades: parseEspecialidades(socioForm.especialidades),
          club_id: selectedClubId,
          usuario_id: usuario.id,
          estado: 'activo'
        }
        savedSocio = await SocioService.createSocio(createPayload)
      }

      if (socioFotoFile) {
        await SocioService.uploadFoto(savedSocio.id, socioFotoFile)
        const photo = await SocioService.fetchFotoBlob(savedSocio.id)
        setSocioFotoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return photo
        })
        setSocioFotoFile(null)
      }

      setSocio(savedSocio)
      setSocioSuccess('Perfil de socio actualizado correctamente')
    } catch (err) {
      setSocioError((err as Error).message || 'Error al guardar el perfil de socio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="profile-layout">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Mi Perfil</h1>
            <p>Administra tu información personal</p>
          </div>

          {loadingProfile && (
            <div className="loading-wrapper">
              <div className="spinner"></div>
            </div>
          )}

          {/* Sección de información del usuario */}
          <section className="profile-section">
            <h2>Información Personal</h2>
            
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleProfileUpdate} className="form-container">
              <div className="form-group">
                <label htmlFor="nombre_completo">Nombre Completo</label>
                <input
                  type="text"
                  id="nombre_completo"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="form-input"
                />
                <small className="help-text">El email no puede ser modificado</small>
              </div>

              <div className="form-actions">
                {!isEditing ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                    disabled={loadingProfile}
                  >
                    ✏️ Editar Perfil
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setIsEditing(false)
                        if (profileUser) {
                          setFormData({
                            nombre_completo: profileUser.nombre_completo,
                            email: profileUser.email
                          })
                        }
                      }}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>

          {/* Sección de cuenta */}
          <section className="profile-section">
            <h2>Cuenta</h2>
            <div className="profile-info-list">
              <div className="profile-info-item">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{profileUser?.email || usuario?.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email verificado</span>
                <span className={`badge ${profileUser?.email_verificado ? 'badge-success' : 'badge-warning'}`}>
                  {profileUser?.email_verificado ? '✓ Verificado' : 'Pendiente'}
                </span>
              </div>
              {profileUser?.es_superadmin && (
                <div className="profile-info-item">
                  <span className="profile-info-label">Rol Global</span>
                  <span className="badge badge-superadmin" style={{ background: '#7c3aed', color: 'white' }}>
                    👑 Super Administrador
                  </span>
                </div>
              )}
              <div className="profile-info-item">
                <span className="profile-info-label">Fecha de creación</span>
                <span className="profile-info-value">
                  {profileUser?.fecha_creacion
                    ? new Date(profileUser.fecha_creacion).toLocaleDateString('es-ES')
                    : 'Sin datos'}
                </span>
              </div>
            </div>
          </section>

          {/* Sección de clubes */}
          <section className="profile-section">
            <h2>Mis Clubes</h2>
            {clubs.length === 0 ? (
              <div className="empty-state">
                <p>No perteneces a ningun club aun</p>
              </div>
            ) : (
              <div className="profile-clubs">
                {clubs.map(club => (
                  <div key={club.id} className="profile-club-item">
                    <div>
                      <h3>{club.nombre}</h3>
                      <p>{club.descripcion || club.slug}</p>
                    </div>
                    <small>
                      Creado: {new Date(club.fecha_creacion).toLocaleDateString('es-ES')}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2>Documentacion Reglamentaria</h2>
            <p>Gestiona tu seguro RC y carnet de piloto desde tu perfil.</p>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/perfil/documentacion')}
            >
              📄 Ir a Documentacion
            </button>
          </section>

          <section className="profile-section">
            <h2>Perfil de Socio</h2>
            <p>Completa tu ficha ampliada y sube tu foto de carnet por club.</p>

            {loadingSocio && <div className="loading">Cargando perfil de socio...</div>}
            {socioError && <div className="alert alert-error">{socioError}</div>}
            {socioSuccess && <div className="alert alert-success">{socioSuccess}</div>}

            {!loadingSocio && clubs.length === 0 && (
              <div className="empty-state">
                <p>No perteneces a ningun club aun</p>
              </div>
            )}

            {!loadingSocio && clubs.length > 0 && (
              <div className="profile-card">
                <div className="form-group">
                  <label htmlFor="socioClubSelect">Club</label>
                  <select
                    id="socioClubSelect"
                    className="form-input"
                    value={selectedClubId ?? ''}
                    onChange={(e) => setSelectedClubId(Number(e.target.value))}
                  >
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.nombre}
                      </option>
                    ))}
                  </select>
                  {selectedClub?.descripcion && (
                    <small className="help-text">{selectedClub.descripcion}</small>
                  )}
                </div>

                {socio && (
                  <div className="socio-status">
                    <span className={`status-pill ${socio.estado === 'activo' ? 'ok' : 'pending'}`}>
                      Estado: {socio.estado}
                    </span>
                  </div>
                )}

                <form className="form" onSubmit={handleSocioSubmit}>
                  <div className="form-group">
                    <label htmlFor="socioNombre">Nombre completo</label>
                    <input
                      id="socioNombre"
                      type="text"
                      value={socioForm.nombre}
                      onChange={(e) => handleSocioChange('nombre', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="socioEmail">Email</label>
                    <input
                      id="socioEmail"
                      type="email"
                      value={socioForm.email}
                      onChange={(e) => handleSocioChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="socioTelefono">Telefono</label>
                      <input
                        id="socioTelefono"
                        type="tel"
                        value={socioForm.telefono}
                        onChange={(e) => handleSocioChange('telefono', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="socioNacimiento">Fecha de nacimiento</label>
                      <input
                        id="socioNacimiento"
                        type="date"
                        value={socioForm.fecha_nacimiento}
                        onChange={(e) => handleSocioChange('fecha_nacimiento', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="socioDireccion">Direccion</label>
                    <textarea
                      id="socioDireccion"
                      value={socioForm.direccion}
                      onChange={(e) => handleSocioChange('direccion', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="socioEspecialidades">Especialidades</label>
                    <input
                      id="socioEspecialidades"
                      type="text"
                      value={socioForm.especialidades}
                      onChange={(e) => handleSocioChange('especialidades', e.target.value)}
                      placeholder="Acrobacia, FPV, escala..."
                    />
                    <small className="help-text">Separalas con comas</small>
                  </div>

                  <div className="form-group">
                    <label>Foto de carnet</label>
                    <div className="socio-photo-row">
                      <div className="socio-photo-preview">
                        {socioFotoUrl ? (
                          <img src={socioFotoUrl} alt="Foto de carnet" />
                        ) : (
                          <div className="photo-placeholder">Sin foto</div>
                        )}
                      </div>
                      <div className="socio-photo-actions">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSocioFotoFile(e.target.files?.[0] || null)}
                        />
                        <small className="help-text">JPG, PNG o WebP.</small>
                        {socioFotoFile && <small className="help-text">{socioFotoFile.name}</small>}
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* Sección de seguridad */}
          <section className="profile-section">
            <h2>Seguridad</h2>
            
            {!showPasswordForm ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowPasswordForm(true)}
              >
                🔐 Cambiar Contraseña
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="form-container">
                <div className="form-group">
                  <label htmlFor="current_password">Contraseña Actual</label>
                  <input
                    type="password"
                    id="current_password"
                    name="current_password"
                    value={formData.current_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new_password">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="new_password"
                    name="new_password"
                    value={formData.new_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                  <small className="help-text">Mínimo 8 caracteres</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_password">Confirmar Contraseña</label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            )}
            {passwordError && <div className="alert alert-error">{passwordError}</div>}
            {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
          </section>

          {/* Sección de datos */}
          <section className="profile-section danger-section">
            <h2>Datos Personales</h2>
            <p>Descarga una copia de todos tus datos personales</p>
            <button 
              className="btn btn-secondary" 
              onClick={handleDownloadData}
              disabled={loading}
            >
              📥 Descargar mis Datos
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
