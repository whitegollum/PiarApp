import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import APIService from '../services/api'
import SocioService, { Socio, SocioCreate, SocioUpdate } from '../services/socioService'
import '../styles/Forms.css'
import '../styles/SocioProfile.css'

interface ClubSummary {
  id: number
  nombre: string
  descripcion?: string
}

interface SocioFormState {
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  direccion: string
  especialidades: string
}

const emptyForm: SocioFormState = {
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

export default function SocioProfile() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [clubs, setClubs] = useState<ClubSummary[]>([])
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)
  const [socio, setSocio] = useState<Socio | null>(null)
  const [form, setForm] = useState<SocioFormState>(emptyForm)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadClubs = async () => {
      try {
        setLoading(true)
        const clubsData = await APIService.get<ClubSummary[]>('/clubes')
        setClubs(clubsData)
        if (clubsData.length > 0) {
          setSelectedClubId(clubsData[0].id)
        }
      } catch (err) {
        setError('Error al cargar clubes')
      } finally {
        setLoading(false)
      }
    }

    loadClubs()
  }, [])

  useEffect(() => {
    if (!selectedClubId || !usuario?.id) {
      return
    }

    const loadSocio = async () => {
      try {
        setLoading(true)
        setError(null)
        setSuccess(null)
        const socios = await SocioService.getSociosByClub(selectedClubId)
        const socioMatch = socios.find((item) => item.usuario_id === usuario.id) || null
        setSocio(socioMatch)
        setFotoFile(null)

        if (socioMatch?.tiene_foto) {
          const photo = await SocioService.fetchFotoBlob(socioMatch.id)
          setFotoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return photo
          })
        } else {
          setFotoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return ''
          })
        }

        if (socioMatch) {
          setForm({
            nombre: socioMatch.nombre,
            email: socioMatch.email,
            telefono: socioMatch.telefono || '',
            fecha_nacimiento: toDateInput(socioMatch.fecha_nacimiento),
            direccion: socioMatch.direccion || '',
            especialidades: (socioMatch.especialidades || []).join(', ')
          })
        } else {
          setForm({
            ...emptyForm,
            nombre: usuario.nombre_completo || '',
            email: usuario.email || ''
          })
        }
      } catch (err) {
        setError('Error al cargar el perfil de socio')
      } finally {
        setLoading(false)
      }
    }

    loadSocio()
  }, [selectedClubId, usuario])

  useEffect(() => {
    return () => {
      if (fotoUrl) {
        URL.revokeObjectURL(fotoUrl)
      }
    }
  }, [fotoUrl])

  const selectedClub = useMemo(() => {
    if (!selectedClubId) return null
    return clubs.find((club) => club.id === selectedClubId) || null
  }, [clubs, selectedClubId])

  const handleChange = (key: keyof SocioFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedClubId || !usuario?.id) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const payload: SocioUpdate = {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        direccion: form.direccion || undefined,
        especialidades: parseEspecialidades(form.especialidades)
      }

      let savedSocio: Socio
      if (socio) {
        savedSocio = await SocioService.updateSocio(socio.id, payload)
      } else {
        const createPayload: SocioCreate = {
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono || undefined,
          fecha_nacimiento: form.fecha_nacimiento || undefined,
          direccion: form.direccion || undefined,
          especialidades: parseEspecialidades(form.especialidades),
          club_id: selectedClubId,
          usuario_id: usuario.id,
          estado: 'activo'
        }
        savedSocio = await SocioService.createSocio(createPayload)
      }

      if (fotoFile) {
        await SocioService.uploadFoto(savedSocio.id, fotoFile)
        const photo = await SocioService.fetchFotoBlob(savedSocio.id)
        setFotoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return photo
        })
        setFotoFile(null)
      }

      setSocio(savedSocio)
      setSuccess('Perfil de socio actualizado correctamente')
    } catch (err) {
      setError((err as Error).message || 'Error al guardar el perfil de socio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="form-main">
        <div className="form-container socio-profile">
          <div className="form-header">
            <h1>Perfil de Socio</h1>
            <p className="subtitle">Completa tu ficha ampliada y sube tu foto de carnet.</p>
          </div>

          {loading && <div className="loading">Cargando...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {!loading && clubs.length === 0 && (
            <div className="empty-state">
              <p>No perteneces a ningun club todavia.</p>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Volver</button>
            </div>
          )}

          {!loading && clubs.length > 0 && (
            <>
              <div className="form-group">
                <label htmlFor="clubSelect">Club</label>
                <select
                  id="clubSelect"
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

              <form className="form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="nombre">Nombre completo</label>
                  <input
                    id="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="telefono">Telefono</label>
                    <input
                      id="telefono"
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
                    <input
                      id="fecha_nacimiento"
                      type="date"
                      value={form.fecha_nacimiento}
                      onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="direccion">Direccion</label>
                  <textarea
                    id="direccion"
                    value={form.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="especialidades">Especialidades</label>
                  <input
                    id="especialidades"
                    type="text"
                    value={form.especialidades}
                    onChange={(e) => handleChange('especialidades', e.target.value)}
                    placeholder="Acrobacia, FPV, escala..."
                  />
                  <small className="help-text">Separalas con comas</small>
                </div>

                <div className="form-group">
                  <label>Foto de carnet</label>
                  <div className="socio-photo-row">
                    <div className="socio-photo-preview">
                      {fotoUrl ? (
                        <img src={fotoUrl} alt="Foto de carnet" />
                      ) : (
                        <div className="photo-placeholder">Sin foto</div>
                      )}
                    </div>
                    <div className="socio-photo-actions">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                      />
                      <small className="help-text">JPG, PNG o WebP.</small>
                      {fotoFile && <small className="help-text">{fotoFile.name}</small>}
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/perfil')}>
                    Volver
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  )
}
