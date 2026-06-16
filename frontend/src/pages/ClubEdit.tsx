import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import APIService from '../services/api'
import { UploadService } from '../services/contentService'
import FacilityManager from '../components/FacilityManager'
import '../styles/ClubEdit.css'

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion?: string
  ayuda_documentacion_md?: string
  logo_url?: string
  color_primario: string
  color_secundario: string
  color_acento: string
  pais?: string
  region?: string
  email_contacto?: string
  telefono?: string
  sitio_web?: string
  rtsp_url?: string
  latitud?: number
  longitud?: number
}

interface ClubUpdate {
  nombre?: string
  descripcion?: string
  ayuda_documentacion_md?: string
  logo_url?: string
  color_primario?: string
  color_secundario?: string
  color_acento?: string
  pais?: string
  region?: string
  latitud?: number
  longitud?: number
  email_contacto?: string
  telefono?: string
  sitio_web?: string
  rtsp_url?: string
}

interface GenerarDatosResult {
  success: boolean
  message: string
  detalles: {
    usuarios_creados: number
    noticias_creadas: number
    eventos_creados: number
    productos_creados: number
    documentacion_creada: number
    ubicacion_actualizada: boolean
    password_instalaciones_creada: boolean
  }
}

export default function ClubEdit() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role, loading: roleLoading } = useClubRole(clubId)
  
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatingData, setGeneratingData] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Configuración de alertas
  const [alertConfig, setAlertConfig] = useState({
    alertas_documentacion_enabled: true,
    alertas_doc_ausente_enabled: true,
  })
  const [originalAlertConfig, setOriginalAlertConfig] = useState({
    alertas_documentacion_enabled: true,
    alertas_doc_ausente_enabled: true,
  })

  // Formulario
  const [formData, setFormData] = useState<ClubUpdate>({
    nombre: '',
    descripcion: '',
    ayuda_documentacion_md: '',
    logo_url: '',
    color_primario: '#FF6B35',
    color_secundario: '#004E89',
    color_acento: '#F77F00',
    pais: '',
    region: '',
    latitud: undefined,
    longitud: undefined,
    email_contacto: '',
    telefono: '',
    sitio_web: '',
    rtsp_url: ''
  })

  useEffect(() => {
    if (!usuario) {
      navigate('/auth/login')
      return
    }

    if (!roleLoading && role !== 'administrador' && !usuario.es_superadmin) {
      navigate(`/clubes/${clubId}`)
      return
    }

    const cargarClub = async () => {
      try {
        setLoading(true)
        const [clubData, configData] = await Promise.all([
          APIService.get<Club>(`/clubes/${clubId}`),
          APIService.get<{ alertas_documentacion_enabled: boolean; alertas_doc_ausente_enabled: boolean }>(
            `/clubs/${clubId}/alertas/config`
          ).catch(() => ({ alertas_documentacion_enabled: true, alertas_doc_ausente_enabled: true })),
        ])
        setClub(clubData)
        setFormData({
          nombre: clubData.nombre,
          descripcion: clubData.descripcion,
          ayuda_documentacion_md: clubData.ayuda_documentacion_md,
          logo_url: clubData.logo_url,
          color_primario: clubData.color_primario,
          color_secundario: clubData.color_secundario,
          color_acento: clubData.color_acento,
          latitud: clubData.latitud,
          longitud: clubData.longitud,
          pais: clubData.pais,
          region: clubData.region,
          email_contacto: clubData.email_contacto,
          telefono: clubData.telefono,
          sitio_web: clubData.sitio_web,
          rtsp_url: clubData.rtsp_url
        })
        const cfg = {
          alertas_documentacion_enabled: configData.alertas_documentacion_enabled ?? true,
          alertas_doc_ausente_enabled: configData.alertas_doc_ausente_enabled ?? true,
        }
        setAlertConfig(cfg)
        setOriginalAlertConfig(cfg)
      } catch (err) {
        setError('Error al cargar club: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    if (!roleLoading) {
      cargarClub()
    }
  }, [clubId, usuario, navigate, role, roleLoading])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      setError('')
      const url = await UploadService.uploadImage(file)
      setFormData(prev => ({ ...prev, logo_url: url }))
    } catch (err) {
      setError('Error al subir el logo: ' + (err as Error).message)
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const updateData: ClubUpdate = {}
      
      // Solo incluir campos que fueron modificados
      if (formData.nombre !== club?.nombre) updateData.nombre = formData.nombre
      if (formData.descripcion !== club?.descripcion) updateData.descripcion = formData.descripcion
      if (formData.ayuda_documentacion_md !== club?.ayuda_documentacion_md) {
        updateData.ayuda_documentacion_md = formData.ayuda_documentacion_md
      }
      if (formData.logo_url !== club?.logo_url) updateData.logo_url = formData.logo_url
      if (formData.color_primario !== club?.color_primario) updateData.color_primario = formData.color_primario
      if (formData.color_secundario !== club?.color_secundario) updateData.color_secundario = formData.color_secundario
      if (formData.color_acento !== club?.color_acento) updateData.color_acento = formData.color_acento
      if (formData.pais !== club?.pais) updateData.pais = formData.pais
      if (formData.region !== club?.region) updateData.region = formData.region
      if (formData.email_contacto !== club?.email_contacto) updateData.email_contacto = formData.email_contacto
      if (formData.telefono !== club?.telefono) updateData.telefono = formData.telefono
      if (formData.sitio_web !== club?.sitio_web) updateData.sitio_web = formData.sitio_web
      if (formData.rtsp_url !== club?.rtsp_url) updateData.rtsp_url = formData.rtsp_url
      if (formData.latitud !== club?.latitud) updateData.latitud = formData.latitud
      if (formData.longitud !== club?.longitud) updateData.longitud = formData.longitud

      const alertConfigChanged =
        alertConfig.alertas_documentacion_enabled !== originalAlertConfig.alertas_documentacion_enabled ||
        alertConfig.alertas_doc_ausente_enabled !== originalAlertConfig.alertas_doc_ausente_enabled

      if (Object.keys(updateData).length === 0 && !alertConfigChanged) {
        setError('No hay cambios para guardar')
        return
      }

      const requests: Promise<unknown>[] = []
      if (Object.keys(updateData).length > 0) {
        requests.push(APIService.put(`/clubes/${clubId}`, updateData))
      }
      if (alertConfigChanged) {
        requests.push(APIService.patch(`/clubs/${clubId}/alertas/config`, alertConfig))
      }
      await Promise.all(requests)

      setSuccess('Club actualizado exitosamente')
      setTimeout(() => {
        navigate(`/clubes/${clubId}`)
      }, 1500)
    } catch (err) {
      setError('Error al guardar cambios: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerarDatosEjemplo = async () => {
    if (!confirm('¿Estás seguro de que quieres generar datos de ejemplo?\n\nEsto creará:\n- 5 usuarios miembros\n- Documentación reglamentaria con diferentes estados (para probar alertas)\n- Ubicación geográfica\n- Contraseña de instalaciones\n- 5 noticias\n- 5 eventos\n- 5 productos en la tienda')) {
      return
    }

    try {
      setGeneratingData(true)
      setError('')
      setSuccess('')

      const resultado = await APIService.post<GenerarDatosResult>(`/clubes/${clubId}/generar-datos-ejemplo`, {})
      
      setSuccess(
        `¡Datos generados correctamente!\n` +
        `Usuarios: ${resultado.detalles.usuarios_creados}\n` +
        `Documentación: ${resultado.detalles.documentacion_creada} registros\n` +
        `Noticias: ${resultado.detalles.noticias_creadas}\n` +
        `Eventos: ${resultado.detalles.eventos_creados}\n` +
        `Productos: ${resultado.detalles.productos_creados}\n` +
        `Ubicación: ${resultado.detalles.ubicacion_actualizada ? '✓' : '✗'}\n` +
        `Password instalaciones: ${resultado.detalles.password_instalaciones_creada ? '✓' : '✗'}\n\n` +
        `💡 Tip: Visita la sección de Alertas en Admin para ver las alertas generadas por documentos vencidos.`
      )
      
      // Recargar datos del club
      setTimeout(() => {
        window.location.reload()
      }, 4000)
    } catch (err: any) {
      setError('Error al generar datos de ejemplo: ' + (err.message || 'Error desconocido'))
    } finally {
      setGeneratingData(false)
    }
  }

  if (!usuario) return null

  if (loading) {
    return (
      <div className="club-edit-layout">
        <main className="club-edit-main">
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error && !club) {
    return (
      <div className="club-edit-layout">
        <main className="club-edit-main">
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}`)}>
            Volver
          </button>
        </main>
      </div>
    )
  }

  return (
    <>

      <main className="club-edit-main">
        <div className="club-edit-container">
          <div className="edit-header">
            <button 
              className="btn btn-back"
              onClick={() => navigate(`/clubes/${clubId}`)}
            >
              ← Volver
            </button>
            <h1>Editar Club</h1>
            <button
              className="btn btn-warning"
              onClick={handleGenerarDatosEjemplo}
              disabled={generatingData}
              style={{ marginLeft: 'auto' }}
              title="Generar datos ficticios para pruebas"
            >
              {generatingData ? '🔄 Generando...' : '🎲 Generar Datos de Ejemplo'}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="club-edit-form">
            {/* Información Básica */}
            <section className="form-section">
              <h2>Información Básica</h2>
              
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Club</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows={4}
                  placeholder="Describir el club..."
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="ayuda_documentacion_md">Ayuda de Documentación (Markdown)</label>
                <textarea
                  id="ayuda_documentacion_md"
                  name="ayuda_documentacion_md"
                  value={formData.ayuda_documentacion_md || ''}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows={6}
                  placeholder="Guía para socios sobre seguro RC, carnet, links útiles..."
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="logo_url">Logo del Club</label>
                <div className="logo-upload-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo del club"
                      style={{
                        width: '64px',
                        height: '64px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        padding: '4px'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      border: '1px dashed #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#aaa',
                      fontSize: '0.75rem',
                      textAlign: 'center'
                    }}>
                      Sin logo
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                      {uploadingLogo ? '⏳ Subiendo...' : '📤 Subir imagen'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {formData.logo_url && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="url"
                  id="logo_url"
                  name="logo_url"
                  value={formData.logo_url || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://ejemplo.com/logo.png — o sube una imagen arriba"
                  style={{ marginTop: '0.75rem' }}
                />
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  Sube una imagen (PNG, JPG, GIF o WEBP) o pega una URL externa.
                </small>
              </div>
            </section>

            {/* Colores */}
            <section className="form-section">
              <h2>Colores</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="color_primario">
                    Color Primario
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_primario"
                      name="color_primario"
                      value={formData.color_primario}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_primario}
                      onChange={handleColorChange}
                      name="color_primario"
                      className="form-input color-value"
                      placeholder="#FF6B35"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="color_secundario">
                    Color Secundario
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_secundario"
                      name="color_secundario"
                      value={formData.color_secundario}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_secundario}
                      onChange={handleColorChange}
                      name="color_secundario"
                      className="form-input color-value"
                      placeholder="#004E89"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="color_acento">
                    Color Acento (fondo noticias)
                  </label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      id="color_acento"
                      name="color_acento"
                      value={formData.color_acento}
                      onChange={handleColorChange}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.color_acento}
                      onChange={handleColorChange}
                      name="color_acento"
                      className="form-input color-value"
                      placeholder="#F77F00"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Información de Contacto */}
            <section className="form-section">
              <h2>Información de Contacto</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pais">País</label>
                  <input
                    type="text"
                    id="pais"
                    name="pais"
                    value={formData.pais || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="España"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="region">Región/Provincia</label>
                  <input
                    type="text"
                    id="region"
                    name="region"
                    value={formData.region || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Madrid"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email_contacto">Email de Contacto</label>
                  <input
                    type="email"
                    id="email_contacto"
                    name="email_contacto"
                    value={formData.email_contacto || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="contacto@club.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="+34 91 234 5678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sitio_web">Sitio Web</label>
                <input
                  type="url"
                  id="sitio_web"
                  name="sitio_web"
                  value={formData.sitio_web || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://www.club.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="rtsp_url">
                  URL Cámara RTSP/HLS
                  <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>
                    (opcional - mostrará cámara en vivo en página principal)
                  </span>
                </label>
                <input
                  type="url"
                  id="rtsp_url"
                  name="rtsp_url"
                  value={formData.rtsp_url || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="rtsp://camara.club.com/stream o https://stream.club.com/hls/live.m3u8"
                />
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  Soporta RTSP, HLS (m3u8) y URLs de streaming directas
                </small>
              </div>
            </section>

            {/* Ubicación Geográfica */}
            <section className="form-section">
              <h2>Ubicación Geográfica</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="latitud">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    id="latitud"
                    name="latitud"
                    value={formData.latitud || ''}
                    onChange={(e) => setFormData({...formData, latitud: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="form-input"
                    placeholder="40.4168"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="longitud">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    id="longitud"
                    name="longitud"
                    value={formData.longitud || ''}
                    onChange={(e) => setFormData({...formData, longitud: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="form-input"
                    placeholder="-3.7038"
                  />
                </div>
              </div>
            </section>

            {/* Configuración de Alertas */}
            <section className="form-section">
              <h2>Configuración de Alertas de Documentación</h2>

              <div className="alert-config-list">
                <div className="alert-config-item">
                  <div className="alert-config-info">
                    <span className="alert-config-label">Alertas por documentación caducada</span>
                    <span className="alert-config-desc">
                      Avisa cuando el carnet de piloto o el seguro RC de un socio está próximo a vencer o ya ha vencido.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={alertConfig.alertas_documentacion_enabled}
                      onChange={(e) =>
                        setAlertConfig(prev => ({ ...prev, alertas_documentacion_enabled: e.target.checked }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="alert-config-item">
                  <div className="alert-config-info">
                    <span className="alert-config-label">Alertas por documentación no subida</span>
                    <span className="alert-config-desc">
                      Avisa cuando un socio no ha registrado en la plataforma su carnet de piloto o seguro RC.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={alertConfig.alertas_doc_ausente_enabled}
                      onChange={(e) =>
                        setAlertConfig(prev => ({ ...prev, alertas_doc_ausente_enabled: e.target.checked }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </section>

            {/* Botones */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/clubes/${clubId}`)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>

          {/* Gestión de Instalaciones */}
          {club && (
            <div style={{ marginTop: '2rem' }}>
              <FacilityManager clubId={club.id} />
            </div>
          )}

        </div>
      </main>
    </>
  )
}
