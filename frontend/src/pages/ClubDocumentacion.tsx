import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DocumentacionService, DocumentacionResponse } from '../services/documentacionService'
import '../styles/ClubDetail.css'
import '../styles/Forms.css'
import '../styles/Documentacion.css'

interface FormState {
  rc_numero: string
  rc_fecha_emision: string
  rc_fecha_vencimiento: string
  carnet_numero: string
  carnet_fecha_emision: string
  carnet_fecha_vencimiento: string
}

const emptyForm: FormState = {
  rc_numero: '',
  rc_fecha_emision: '',
  rc_fecha_vencimiento: '',
  carnet_numero: '',
  carnet_fecha_emision: '',
  carnet_fecha_vencimiento: ''
}


const toDateInput = (value?: string | null): string => {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

export default function ClubDocumentacion() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [doc, setDoc] = useState<DocumentacionResponse | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [rcFile, setRcFile] = useState<File | null>(null)
  const [carnetFile, setCarnetFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await DocumentacionService.getMe()
      setDoc(data)
      setForm({
        rc_numero: data.rc_numero || '',
        rc_fecha_emision: toDateInput(data.rc_fecha_emision),
        rc_fecha_vencimiento: toDateInput(data.rc_fecha_vencimiento),
        carnet_numero: data.carnet_numero || '',
        carnet_fecha_emision: toDateInput(data.carnet_fecha_emision),
        carnet_fecha_vencimiento: toDateInput(data.carnet_fecha_vencimiento)
      })
    } catch (err) {
      const message = (err as Error).message
      if (message.includes('404')) {
        setDoc(null)
        setForm(emptyForm)
      } else {
        setError(message || 'Error al cargar documentacion')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const payload = new FormData()

      if (form.rc_numero) payload.append('rc_numero', form.rc_numero)
      if (form.rc_fecha_emision) payload.append('rc_fecha_emision', form.rc_fecha_emision)
      if (form.rc_fecha_vencimiento) payload.append('rc_fecha_vencimiento', form.rc_fecha_vencimiento)
      if (form.carnet_numero) payload.append('carnet_numero', form.carnet_numero)
      if (form.carnet_fecha_emision) payload.append('carnet_fecha_emision', form.carnet_fecha_emision)
      if (form.carnet_fecha_vencimiento) payload.append('carnet_fecha_vencimiento', form.carnet_fecha_vencimiento)
      if (rcFile) payload.append('rc_archivo', rcFile)
      if (carnetFile) payload.append('carnet_archivo', carnetFile)

      const updated = await DocumentacionService.upsertMe(payload)
      setDoc(updated)
      setSuccess('Documentacion actualizada correctamente')
      setRcFile(null)
      setCarnetFile(null)
    } catch (err) {
      setError((err as Error).message || 'Error al guardar la documentacion')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (type: 'rc' | 'carnet') => {
    try {
      const result = type === 'rc'
        ? await DocumentacionService.downloadRc()
        : await DocumentacionService.downloadCarnet()

      const url = window.URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.filename
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message || 'Error al descargar archivo')
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="club-detail-main">
          <div className="club-detail-container">
            <div className="loading">Cargando...</div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="club-detail-main">
        <div className="club-detail-container">
          <div className="header-actions">
            <button className="btn btn-back" onClick={() => navigate('/perfil')}>
              ← Volver al Perfil
            </button>
          </div>

          <div className="documentacion-header">
            <div>
              <h1>Documentacion Reglamentaria</h1>
              <p>Sube tu seguro RC y carnet de piloto. Esta documentacion es valida para todos los clubes.</p>
            </div>
            <div className="documentacion-status">
              <span className={`status-pill ${doc ? 'ok' : 'pending'}`}>
                {doc ? 'Documentacion registrada' : 'Pendiente'}
              </span>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form className="documentacion-form" onSubmit={handleSubmit}>
            <div className="documentacion-grid">
              <section className="doc-card">
                <div className="doc-card-header">
                  <h2>Seguro RC</h2>
                  {doc?.rc_tiene_archivo && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload('rc')}
                    >
                      Descargar
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Numero de poliza</label>
                  <input
                    type="text"
                    value={form.rc_numero}
                    onChange={(e) => handleChange('rc_numero', e.target.value)}
                    placeholder="Ej: RC-123456"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Fecha emision</label>
                    <input
                      type="date"
                      value={form.rc_fecha_emision}
                      onChange={(e) => handleChange('rc_fecha_emision', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha vencimiento</label>
                    <input
                      type="date"
                      value={form.rc_fecha_vencimiento}
                      onChange={(e) => handleChange('rc_fecha_vencimiento', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Archivo RC (PDF o imagen)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setRcFile(e.target.files?.[0] || null)}
                  />
                  {doc?.rc_archivo_nombre && (
                    <span className="file-hint">Actual: {doc.rc_archivo_nombre}</span>
                  )}
                  {rcFile && (
                    <span className="file-hint">Nuevo: {rcFile.name}</span>
                  )}
                </div>
              </section>

              <section className="doc-card">
                <div className="doc-card-header">
                  <h2>Carnet de piloto</h2>
                  {doc?.carnet_tiene_archivo && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload('carnet')}
                    >
                      Descargar
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Numero de carnet</label>
                  <input
                    type="text"
                    value={form.carnet_numero}
                    onChange={(e) => handleChange('carnet_numero', e.target.value)}
                    placeholder="Ej: PIL-987654"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Fecha emision</label>
                    <input
                      type="date"
                      value={form.carnet_fecha_emision}
                      onChange={(e) => handleChange('carnet_fecha_emision', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha vencimiento</label>
                    <input
                      type="date"
                      value={form.carnet_fecha_vencimiento}
                      onChange={(e) => handleChange('carnet_fecha_vencimiento', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Archivo carnet (PDF o imagen)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setCarnetFile(e.target.files?.[0] || null)}
                  />
                  {doc?.carnet_archivo_nombre && (
                    <span className="file-hint">Actual: {doc.carnet_archivo_nombre}</span>
                  )}
                  {carnetFile && (
                    <span className="file-hint">Nuevo: {carnetFile.name}</span>
                  )}
                </div>
              </section>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/perfil')}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar documentacion'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
