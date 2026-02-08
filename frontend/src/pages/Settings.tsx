import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import '../styles/Settings.css'

interface UserPreferences {
  notifications_enabled: boolean
  email_digest: 'daily' | 'weekly' | 'never'
  dark_mode: boolean
  language: 'es' | 'en'
}

export default function Settings() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications_enabled: true,
    email_digest: 'weekly',
    dark_mode: false,
    language: 'es',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    // Simular guardado
    setTimeout(() => {
      setSuccess('Preferencias guardadas exitosamente')
      setSaving(false)
      setTimeout(() => setSuccess(null), 3000)
    }, 500)
  }

  return (
    <>
      <Navbar />
      <div className="settings-layout">
        <div className="settings-container">
          <div className="settings-header">
            <h1>Configuración</h1>
            <p>Personaliza tu experiencia en PIAR</p>
          </div>

          {success && <div className="alert alert-success">{success}</div>}

          {/* Sección de Notificaciones */}
          <section className="settings-section">
            <h2>🔔 Notificaciones</h2>
            <div className="setting-item">
              <div className="setting-content">
                <h3>Habilitar Notificaciones</h3>
                <p>Recibe alertas de actividades importantes en tus clubs</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.notifications_enabled}
                  onChange={(e) => handlePreferenceChange('notifications_enabled', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {preferences.notifications_enabled && (
              <div className="setting-item">
                <div className="setting-content">
                  <h3>Frecuencia de Resumen por Email</h3>
                  <p>Recibe un resumen de actividades</p>
                </div>
                <select
                  value={preferences.email_digest}
                  onChange={(e) => handlePreferenceChange('email_digest', e.target.value)}
                  className="settings-select"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="never">Nunca</option>
                </select>
              </div>
            )}
          </section>

          {/* Sección de Apariencia */}
          <section className="settings-section">
            <h2>🎨 Apariencia</h2>
            <div className="setting-item">
              <div className="setting-content">
                <h3>Tema Oscuro</h3>
                <p>Usar tema oscuro en toda la aplicación</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.dark_mode}
                  onChange={(e) => handlePreferenceChange('dark_mode', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-content">
                <h3>Idioma</h3>
                <p>Selecciona el idioma de la interfaz</p>
              </div>
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="settings-select"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>

          {/* Sección de Privacidad */}
          <section className="settings-section">
            <h2>🔐 Privacidad</h2>
            <div className="setting-description">
              <p>Controla cómo compartimos tus datos en los clubs</p>
            </div>
            
            <div className="setting-item">
              <div className="setting-content">
                <h3>Ver mi Perfil Público</h3>
                <p>Otros miembros pueden ver tu nombre y email en la lista del club</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={true} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-content">
                <h3>Mostrar Estado Online</h3>
                <p>Deja que otros sepan cuando estás en línea</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={true} />
                <span className="slider"></span>
              </label>
            </div>
          </section>

          {/* Sección de Cuenta */}
          <section className="settings-section">
            <h2>👤 Cuenta</h2>
            <div className="setting-item">
              <div className="setting-content">
                <h3>Email Verificado</h3>
                <p>{usuario?.email}</p>
              </div>
              <span className="badge badge-success">✓ Verificado</span>
            </div>

            <div className="setting-item">
              <div className="setting-content">
                <h3>Cambiar Contraseña</h3>
                <p>Actualiza tu contraseña de forma segura</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/perfil')}
              >
                Cambiar →
              </button>
            </div>
          </section>

          {/* Sección de Seguridad */}
          <section className="settings-section danger-section">
            <h2>⚠️ Zona de Peligro</h2>
            <div className="setting-item danger">
              <div className="setting-content">
                <h3>Eliminar Cuenta</h3>
                <p style={{ color: '#dc2626' }}>
                  Esta acción es permanente y no puede ser deshecha
                </p>
              </div>
              <button className="btn btn-danger btn-sm">
                Eliminar Cuenta
              </button>
            </div>
          </section>

          {/* Botones de Acción */}
          <div className="settings-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? 'Guardando...' : '💾 Guardar Preferencias'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
