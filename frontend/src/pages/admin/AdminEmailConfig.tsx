import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, EmailConfig } from '../../services/adminService'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/Navbar'
import '../../styles/Forms.css'

const AdminEmailConfig = () => {
    const { usuario, isLoading } = useAuth()
    const navigate = useNavigate()

    const [config, setConfig] = useState<EmailConfig>({
        smtp_server: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_from_email: '',
        smtp_use_tls: true,
        smtp_use_ssl: false,
        frontend_url: ''
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [testEmail, setTestEmail] = useState('')
    const [debugInfo, setDebugInfo] = useState<any>(null)

    const isBusy = isLoading || loading

    useEffect(() => {
        if (isLoading) return
        if (!usuario?.es_superadmin) {
            navigate('/')
            return
        }
        loadConfig()
    }, [usuario, isLoading, navigate])

    const loadConfig = async () => {
        try {
            setLoading(true)
            const data = await adminService.getEmailConfig()
            setConfig(data)
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Error cargando configuracion' })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            setMessage(null)
            const updated = await adminService.updateEmailConfig(config)
            setConfig(updated)
            setMessage({ type: 'success', text: 'Configuracion guardada correctamente' })
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Error guardando configuracion' })
        } finally {
            setSaving(false)
        }
    }

    const handleTestEmail = async () => {
        if (!testEmail) return
        try {
            setTesting(true)
            setMessage(null)
            setDebugInfo(null)
            const result = await adminService.sendTestEmail(testEmail)
            setMessage({ type: 'success', text: `Email de prueba enviado a ${testEmail}` })
            // @ts-ignore - El resultado puede tener información de debug
            if (result?.debug) {
                // @ts-ignore
                setDebugInfo(result.debug)
            }
        } catch (error: any) {
            console.error(error)
            
            // Intentar extraer detalles del error
            let errorDetail = error?.response?.data?.detail
            let errorMsg = 'Error enviando email de prueba'
            let debugData = null
            
            if (errorDetail && typeof errorDetail === 'object') {
                // El error tiene estructura detallada
                errorMsg = errorDetail.message || errorMsg
                debugData = {
                    error: errorDetail.error,
                    config: errorDetail.config,
                    steps: [errorDetail.message]
                }
            } else if (errorDetail && typeof errorDetail === 'string') {
                errorMsg = errorDetail
            } else if (error?.message) {
                errorMsg = error.message
            }
            
            setMessage({ type: 'error', text: errorMsg })
            if (debugData) {
                setDebugInfo(debugData)
            }
        } finally {
            setTesting(false)
        }
    }

    const renderContent = () => (
        <div className="form-layout">
            <Navbar />
            <main className="form-main">
                <div className="form-container">
                    <div className="form-header">
                        <h1>Configuracion de Email (SMTP)</h1>
                        <p className="subtitle">Configura el servidor y la URL base usada en los emails.</p>
                    </div>

                    {isBusy && <div className="help-text">Cargando configuracion...</div>}

                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="smtp_server">Servidor SMTP *</label>
                            <input
                                id="smtp_server"
                                type="text"
                                value={config.smtp_server}
                                onChange={(e) => setConfig({ ...config, smtp_server: e.target.value })}
                                disabled={isBusy}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="smtp_port">Puerto *</label>
                            <input
                                id="smtp_port"
                                type="number"
                                value={config.smtp_port}
                                onChange={(e) => setConfig({ ...config, smtp_port: Number(e.target.value) })}
                                disabled={isBusy}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="smtp_username">Usuario SMTP</label>
                            <input
                                id="smtp_username"
                                type="text"
                                value={config.smtp_username}
                                onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                                disabled={isBusy}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="smtp_password">Contrasena SMTP</label>
                            <input
                                id="smtp_password"
                                type="password"
                                value={config.smtp_password || ''}
                                onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                                disabled={isBusy}
                                placeholder="Dejar en blanco para no cambiar"
                            />
                            <span className="help-text">Deja el campo vacio si no quieres actualizarla.</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="smtp_from_email">Email remitente (From) *</label>
                            <input
                                id="smtp_from_email"
                                type="email"
                                value={config.smtp_from_email}
                                onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                                disabled={isBusy}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="frontend_url">URL del frontend *</label>
                            <input
                                id="frontend_url"
                                type="url"
                                value={config.frontend_url}
                                onChange={(e) => setConfig({ ...config, frontend_url: e.target.value })}
                                disabled={isBusy}
                                required
                            />
                            <span className="help-text">Se usa para construir los enlaces en emails (ej: https://app.midominio.com).</span>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_tls}
                                    onChange={(e) => setConfig({ ...config, smtp_use_tls: e.target.checked })}
                                    disabled={isBusy}
                                />{' '}
                                Usar TLS
                            </label>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_ssl}
                                    onChange={(e) => setConfig({ ...config, smtp_use_ssl: e.target.checked })}
                                    disabled={isBusy}
                                />{' '}
                                Usar SSL
                            </label>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={() => navigate('/admin')}>
                                Volver
                            </button>
                            <button type="submit" className="btn-primary" disabled={saving || isBusy}>
                                {saving ? 'Guardando...' : 'Guardar configuracion'}
                            </button>
                        </div>
                    </form>

                    <div className="form-section">
                        <h2>Probar configuracion</h2>
                        <div className="form-group">
                            <label htmlFor="test_email">Enviar email de prueba a</label>
                            <div className="form-row">
                                <input
                                    id="test_email"
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    disabled={isBusy}
                                    placeholder="tu@email.com"
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleTestEmail}
                                    disabled={testing || !testEmail || isBusy}
                                >
                                    {testing ? 'Enviando...' : 'Enviar prueba'}
                                </button>
                            </div>
                        </div>

                        {debugInfo && (
                            <div className="debug-info" style={{
                                marginTop: '20px',
                                padding: '15px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '4px',
                                fontSize: '13px',
                                fontFamily: 'monospace'
                            }}>
                                <h3 style={{ marginTop: 0, fontSize: '14px', fontWeight: 'bold' }}>Información de depuración</h3>
                                
                                {debugInfo.config && (
                                    <div style={{ marginBottom: '15px' }}>
                                        <strong>Configuración utilizada:</strong>
                                        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                                            <li>Servidor: {debugInfo.config.smtp_server}:{debugInfo.config.smtp_port}</li>
                                            <li>Usuario: {debugInfo.config.smtp_username}</li>
                                            <li>Email remitente: {debugInfo.config.smtp_from_email}</li>
                                            <li>TLS: {debugInfo.config.smtp_use_tls ? 'Sí' : 'No'}</li>
                                            <li>SSL: {debugInfo.config.smtp_use_ssl ? 'Sí' : 'No'}</li>
                                            <li>Contraseña: {debugInfo.config.password_configured ? '✓ Configurada' : '✗ No configurada'}</li>
                                        </ul>
                                    </div>
                                )}

                                {debugInfo.steps && debugInfo.steps.length > 0 && (
                                    <div>
                                        <strong>Pasos ejecutados:</strong>
                                        <ol style={{ marginTop: '5px', paddingLeft: '20px' }}>
                                            {debugInfo.steps.map((step: string, idx: number) => (
                                                <li key={idx}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {debugInfo.error && (
                                    <div style={{ 
                                        marginTop: '15px',
                                        padding: '10px',
                                        backgroundColor: '#ffe6e6',
                                        borderLeft: '3px solid #cc0000',
                                        borderRadius: '3px'
                                    }}>
                                        <strong>Error técnico:</strong>
                                        <div style={{ marginTop: '5px' }}>
                                            <div><strong>Tipo:</strong> {debugInfo.error.type}</div>
                                            <div><strong>Detalles:</strong> {debugInfo.error.details}</div>
                                        </div>
                                    </div>
                                )}

                                {debugInfo.timing && (
                                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                        Tiempo total: {debugInfo.timing.total_seconds}s
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )

    return renderContent()
}

export default AdminEmailConfig
