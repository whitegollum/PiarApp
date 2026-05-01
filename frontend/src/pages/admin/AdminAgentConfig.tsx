import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AgentAdminService, ChatService, AgentConfig, ProviderModel, DebugResponse } from '../../services/chatService'
import Navbar from '../../components/Navbar'
import '../../styles/Forms.css'
import '../../styles/Admin.css'

const PERSONA_FILES = ['identity.md', 'soul.md', 'tools.md', 'agents.md'] as const

const PROVIDERS = [
  { value: 'openai_apikey', label: 'OpenAI (API Key)' },
  { value: 'openai_oauth', label: 'OpenAI (OAuth)' },
  { value: 'github_copilot', label: 'GitHub Copilot' },
]

const AdminAgentConfig = () => {
  const { usuario, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [config, setConfig] = useState<AgentConfig>({
    provider: 'openai_apikey',
    model_id: 'gpt-4o-mini',
    enabled: true,
    max_tokens: 2048,
    temperature: 70,
  })
  const [models, setModels] = useState<ProviderModel[]>([])
  const [personas, setPersonas] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'config' | 'persona' | 'debug'>('config')
  const [activePersona, setActivePersona] = useState<string>('identity.md')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // OAuth state
  const [oauthFlow, setOauthFlow] = useState<{
    type: 'openai' | 'copilot'
    // OpenAI PKCE: abre URL en navegador
    authorizationUrl?: string
    // Copilot device-code: muestra código
    userCode?: string
    verificationUri?: string
    deviceCode?: string
    polling: boolean
  } | null>(null)

  // Debug state
  const [debugRunning, setDebugRunning] = useState(false)
  const [debugResult, setDebugResult] = useState<DebugResponse | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)

  const handleDebugTest = async (message: string) => {
    setDebugRunning(true)
    setDebugResult(null)
    setDebugError(null)
    try {
      const result = await ChatService.debugMessage(message)
      setDebugResult(result)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error desconocido'
      setDebugError(detail)
    } finally {
      setDebugRunning(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!usuario?.es_superadmin) {
      navigate('/')
      return
    }
    loadConfig()
  }, [usuario, authLoading, navigate])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const cfg = await AgentAdminService.getConfig()
      setConfig(cfg)
      await loadModels(cfg.provider)
      await loadPersonas()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Error cargando configuración del agente' })
    } finally {
      setLoading(false)
    }
  }

  const loadModels = async (provider: string) => {
    try {
      const m = await AgentAdminService.listModels(provider)
      setModels(m)
    } catch {
      setModels([])
    }
  }

  const loadPersonas = async () => {
    const result: Record<string, string> = {}
    for (const f of PERSONA_FILES) {
      try {
        const data = await AgentAdminService.getPersonaFile(f)
        result[f] = data.content
      } catch {
        result[f] = ''
      }
    }
    setPersonas(result)
  }

  const handleProviderChange = async (provider: string) => {
    setConfig(prev => ({ ...prev, provider }))
    await loadModels(provider)
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const updated = await AgentAdminService.updateConfig(config)
      setConfig(updated)
      setMessage({ type: 'success', text: 'Configuración guardada' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Error guardando configuración' })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePersona = async (filename: string) => {
    try {
      setSaving(true)
      setMessage(null)
      await AgentAdminService.updatePersonaFile(filename, personas[filename] || '')
      setMessage({ type: 'success', text: `${filename} guardado` })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: `Error guardando ${filename}` })
    } finally {
      setSaving(false)
    }
  }

  const startOAuth = async (type: 'openai' | 'copilot') => {
    try {
      if (type === 'openai') {
        const res = await AgentAdminService.startOpenAIOAuth()
        setOauthFlow({
          type,
          authorizationUrl: res.authorization_url,
          polling: true,
        })
        // Abrir URL de autorización en nueva pestaña
        window.open(res.authorization_url, '_blank')
        // Iniciar polling
        pollOpenAIOAuth()
      } else {
        const res = await AgentAdminService.startCopilotOAuth()
        setOauthFlow({
          type,
          userCode: res.user_code,
          verificationUri: res.verification_uri,
          deviceCode: res.device_code,
          polling: true,
        })
        pollCopilotOAuth(res.device_code)
      }
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Error iniciando flujo OAuth' })
    }
  }

  const pollOpenAIOAuth = () => {
    const interval = setInterval(async () => {
      try {
        const res = await AgentAdminService.pollOpenAIOAuth()
        if (res.status === 'complete') {
          clearInterval(interval)
          setOauthFlow(null)
          setMessage({ type: 'success', text: 'OpenAI conectado correctamente' })
        } else if (res.status === 'error' || res.status === 'no_flow') {
          clearInterval(interval)
          setOauthFlow(null)
          setMessage({ type: 'error', text: res.detail || 'Flujo OAuth fallido' })
        }
      } catch {
        clearInterval(interval)
        setOauthFlow(null)
      }
    }, 3000)
  }

  const pollCopilotOAuth = (deviceCode: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await AgentAdminService.pollCopilotOAuth(deviceCode)
        if (res.status === 'complete') {
          clearInterval(interval)
          setOauthFlow(null)
          setMessage({ type: 'success', text: 'GitHub Copilot conectado correctamente' })
        } else if (res.status === 'expired' || res.status === 'error') {
          clearInterval(interval)
          setOauthFlow(null)
          setMessage({ type: 'error', text: `Flujo OAuth: ${res.status}` })
        }
      } catch {
        clearInterval(interval)
        setOauthFlow(null)
      }
    }, 5000)
  }

  // Test connection state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await ChatService.sendMessage('Hola, esto es una prueba de conexión. Responde brevemente.', null, null)
      if (res.response) {
        setTestResult({ type: 'success', text: `Respuesta recibida: "${res.response.slice(0, 150)}${res.response.length > 150 ? '...' : ''}"` })
      } else {
        setTestResult({ type: 'error', text: 'No se recibió respuesta del agente' })
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error desconocido'
      setTestResult({ type: 'error', text: `Error: ${detail}` })
    } finally {
      setTesting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="form-layout">
        <Navbar />
        <main className="form-main">
          <div className="form-container">
            <p>Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="form-layout">
      <Navbar />
      <main className="form-main">
        <div className="form-container" style={{ maxWidth: '800px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ marginBottom: '1rem' }}
          >
            ← Volver
          </button>

          <h1>Configuración del Agente IA</h1>
          <p className="subtitle">Configura el proveedor, modelo y personalidad del asistente.</p>

          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('config')}
            >
              Proveedor y Modelo
            </button>
            <button
              className={`btn ${activeTab === 'persona' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('persona')}
            >
              Personalidad
            </button>
            <button
              className={`btn ${activeTab === 'debug' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('debug')}
            >
              🔬 Debug
            </button>
          </div>

          {activeTab === 'config' && (
            <div className="config-section">
              {/* Enabled toggle */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  Agente habilitado
                </label>
              </div>

              {/* Provider */}
              <div className="form-group">
                <label>Proveedor</label>
                <select
                  value={config.provider}
                  onChange={e => handleProviderChange(e.target.value)}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* OAuth buttons */}
              {config.provider === 'openai_oauth' && (
                <div className="form-group">
                  <button className="btn btn-secondary" onClick={() => startOAuth('openai')}>
                    Conectar OpenAI OAuth
                  </button>
                </div>
              )}
              {config.provider === 'github_copilot' && (
                <div className="form-group">
                  <button className="btn btn-secondary" onClick={() => startOAuth('copilot')}>
                    Conectar GitHub Copilot
                  </button>
                </div>
              )}

              {/* OAuth status */}
              {oauthFlow && (
                <div className="oauth-box" style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '1rem',
                  margin: '1rem 0',
                }}>
                  {oauthFlow.type === 'openai' && (
                    <>
                      <p><strong>Autenticación OpenAI (PKCE)</strong></p>
                      <p>
                        Se ha abierto una pestaña para que inicies sesión en OpenAI.
                        {oauthFlow.authorizationUrl && (
                          <> Si no se abrió, <a href={oauthFlow.authorizationUrl} target="_blank" rel="noopener noreferrer">haz click aquí</a>.</>
                        )}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#666' }}>Esperando que completes el login...</p>
                    </>
                  )}
                  {oauthFlow.type === 'copilot' && oauthFlow.userCode && (
                    <>
                      <p><strong>Código de autorización GitHub:</strong></p>
                      <code style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{oauthFlow.userCode}</code>
                      <p style={{ marginTop: '0.5rem' }}>
                        Visita{' '}
                        <a href={oauthFlow.verificationUri} target="_blank" rel="noopener noreferrer">
                          {oauthFlow.verificationUri}
                        </a>
                        {' '}e introduce el código.
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#666' }}>Esperando autorización...</p>
                    </>
                  )}
                </div>
              )}

              {/* Model */}
              <div className="form-group">
                <label>Modelo</label>
                {models.length > 0 ? (
                  <select
                    value={config.model_id}
                    onChange={e => setConfig(prev => ({ ...prev, model_id: e.target.value }))}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={config.model_id}
                    onChange={e => setConfig(prev => ({ ...prev, model_id: e.target.value }))}
                    placeholder="gpt-4o-mini"
                  />
                )}
              </div>

              {/* Max tokens */}
              <div className="form-group">
                <label>Máx. tokens: {config.max_tokens}</label>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={config.max_tokens}
                  onChange={e => setConfig(prev => ({ ...prev, max_tokens: Number(e.target.value) }))}
                />
              </div>

              {/* Temperature */}
              <div className="form-group">
                <label>Temperatura: {(config.temperature / 100).toFixed(2)}</label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={config.temperature}
                  onChange={e => setConfig(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>

              {/* Test connection */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{ width: '100%' }}
                >
                  {testing ? 'Probando conexión...' : '🧪 Probar conexión (enviar mensaje de prueba)'}
                </button>
                {testResult && (
                  <div
                    className={`alert alert-${testResult.type}`}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {testResult.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'persona' && (
            <div className="persona-section">
              {/* Persona file selector */}
              <div className="form-group">
                <label>Archivo</label>
                <select
                  value={activePersona}
                  onChange={e => setActivePersona(e.target.value)}
                >
                  {PERSONA_FILES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <textarea
                  value={personas[activePersona] || ''}
                  onChange={e => setPersonas(prev => ({ ...prev, [activePersona]: e.target.value }))}
                  rows={15}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder={`Contenido de ${activePersona}...`}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleSavePersona(activePersona)}
                disabled={saving}
              >
                {saving ? 'Guardando...' : `Guardar ${activePersona}`}
              </button>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="debug-section">
              <h3>🔬 Panel de Debug - Prueba de conexión con diagnóstico</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Envía mensajes de prueba y observa toda la información del pipeline: eventos SSE,
                parsing, tool calls y resultados.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDebugTest('Hola, esto es una prueba de conexión. Responde brevemente.')}
                  disabled={debugRunning}
                >
                  {debugRunning ? '⏳ Ejecutando...' : '🧪 Prueba Simple (sin tools)'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDebugTest('Dime qué clubes hay disponibles. Lista sus nombres.')}
                  disabled={debugRunning}
                >
                  {debugRunning ? '⏳ Ejecutando...' : '🔧 Prueba con Tool Call (listar clubes)'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setDebugResult(null); setDebugError(null) }}
                >
                  🗑️ Limpiar
                </button>
              </div>

              {debugError && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  <strong>Error:</strong> {debugError}
                </div>
              )}

              {debugResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Response summary */}
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                    <strong>✅ Respuesta final:</strong>
                    <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                      {debugResult.response || '(sin respuesta)'}
                    </p>
                  </div>

                  {/* Tool calls summary */}
                  {debugResult.tool_calls && (
                    <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                      <strong>🔧 Tool Calls detectados:</strong>
                      <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto', maxHeight: '200px' }}>
                        {JSON.stringify(debugResult.tool_calls, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Tool results */}
                  {debugResult.tool_results && (
                    <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '8px', border: '1px solid #fde047' }}>
                      <strong>📋 Resultados de Tools:</strong>
                      <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px' }}>
                        {JSON.stringify(debugResult.tool_results, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Full debug log */}
                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '0.5rem 0' }}>
                      📜 Log completo del pipeline ({debugResult.debug_log.length} pasos)
                    </summary>
                    <div style={{
                      background: '#1f2937', color: '#e5e7eb', borderRadius: '8px',
                      padding: '1rem', maxHeight: '500px', overflow: 'auto',
                      fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4',
                    }}>
                      {debugResult.debug_log.map((step, i) => (
                        <div key={i} style={{ marginBottom: '0.75rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
                          <span style={{ color: '#60a5fa' }}>[{i + 1}] {step.step}</span>
                          <pre style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(
                              Object.fromEntries(Object.entries(step).filter(([k]) => k !== 'step')),
                              null, 2
                            )}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminAgentConfig
