import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import APIService from '../../services/api'
import Navbar from '../../components/Navbar'
import '../../styles/Forms.css'
import '../../styles/Admin.css'

interface AfiliacionConfig {
  aliexpress_banner_url: string
  aliexpress_redirect_enabled: boolean
}

interface ProductoStats {
  id: number
  nombre: string
  proveedor: string | null
  url_afiliacion: string
  clicks: number
  club_id: number
  club_nombre: string
}

interface ClubStats {
  club_id: number
  club_nombre: string
  total_productos: number
  total_clicks: number
}

interface ProveedorStats {
  proveedor: string
  total_productos: number
  total_clicks: number
}

interface StatsData {
  resumen: {
    total_productos: number
    productos_activos: number
    total_clicks: number
  }
  top_productos: ProductoStats[]
  stats_por_club: ClubStats[]
  stats_por_proveedor: ProveedorStats[]
}

const AdminAfiliacion = () => {
  const { usuario, isLoading } = useAuth()
  const navigate = useNavigate()

  const [config, setConfig] = useState<AfiliacionConfig>({
    aliexpress_banner_url: '',
    aliexpress_redirect_enabled: true
  })
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'stats'>('stats')

  useEffect(() => {
    if (isLoading) return
    if (!usuario?.es_superadmin) {
      navigate('/')
      return
    }
    loadData()
  }, [usuario, isLoading, navigate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [configData, statsData] = await Promise.all([
        APIService.get<AfiliacionConfig>('/admin/config/afiliacion'),
        APIService.get<StatsData>('/admin/config/afiliacion/stats')
      ])
      setConfig(configData)
      setStats(statsData)
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Error cargando datos de afiliación' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)
      const updated = await APIService.put<AfiliacionConfig>('/admin/config/afiliacion', config)
      setConfig(updated)
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Error guardando configuración' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="form-layout">
        <Navbar />
        <main className="form-main">
          <div className="form-container">
            <div className="help-text">Cargando...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="form-layout">
      <Navbar />
      <main className="form-main">
        <div className="form-container" style={{ maxWidth: '900px' }}>
          <div className="form-header">
            <h1>🔗 Gestión de Afiliaciones</h1>
            <p className="subtitle">Configuración del sistema de redirección y estadísticas de uso.</p>
          </div>

          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '0' }}>
            <button
              onClick={() => setActiveTab('stats')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: activeTab === 'stats' ? '3px solid #FF6B35' : '3px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'stats' ? 600 : 400,
                color: activeTab === 'stats' ? '#FF6B35' : '#666',
                fontSize: '14px'
              }}
            >
              📊 Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('config')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: activeTab === 'config' ? '3px solid #FF6B35' : '3px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'config' ? 600 : 400,
                color: activeTab === 'config' ? '#FF6B35' : '#666',
                fontSize: '14px'
              }}
            >
              ⚙️ Configuración
            </button>
          </div>

          {/* Tab: Estadísticas */}
          {activeTab === 'stats' && stats && (
            <div>
              {/* Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF6B35' }}>{stats.resumen.total_clicks}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Clicks totales</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#2196F3' }}>{stats.resumen.total_productos}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Productos totales</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#4CAF50' }}>{stats.resumen.productos_activos}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Productos activos</div>
                </div>
              </div>

              {/* Top productos */}
              {stats.top_productos.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>🏆 Top Productos por Clicks</h3>
                  <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Proveedor</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Club</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top_productos.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <a
                                href={p.url_afiliacion}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#333', textDecoration: 'none' }}
                                title={p.url_afiliacion}
                              >
                                {p.nombre}
                              </a>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#666' }}>{p.proveedor || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#666' }}>{p.club_nombre}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#FF6B35' }}>{p.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stats por club */}
              {stats.stats_por_club.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>🏢 Estadísticas por Club</h3>
                  <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Club</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Productos</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.stats_por_club.map((s) => (
                          <tr key={s.club_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '10px 12px' }}>{s.club_nombre}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>{s.total_productos}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{s.total_clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stats por proveedor */}
              {stats.stats_por_proveedor.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>🏪 Estadísticas por Proveedor</h3>
                  <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Proveedor</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Productos</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.stats_por_proveedor.map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '10px 12px' }}>{s.proveedor}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>{s.total_productos}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{s.total_clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {stats.top_productos.length === 0 && stats.stats_por_club.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <p>📦 No hay datos de afiliación todavía.</p>
                  <p style={{ fontSize: '13px' }}>Las estadísticas aparecerán cuando los socios hagan click en productos.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Configuración */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="form">
              <div className="form-group">
                <label htmlFor="banner_url">URL del Banner de Afiliación</label>
                <input
                  id="banner_url"
                  type="url"
                  value={config.aliexpress_banner_url}
                  onChange={(e) => setConfig({ ...config, aliexpress_banner_url: e.target.value })}
                  placeholder="https://s.click.aliexpress.com/e/_oFVB2sT?bz=300*250"
                />
                <small style={{ color: '#999', fontSize: '12px' }}>
                  URL del banner que se abre para asentar la cookie de afiliación antes de redirigir al producto.
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.aliexpress_redirect_enabled}
                    onChange={(e) => setConfig({ ...config, aliexpress_redirect_enabled: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Redirección de afiliación habilitada</span>
                </label>
                <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Si se deshabilita, los enlaces de productos redirigen directamente sin pasar por el banner de afiliación.
                </small>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>

              <div style={{ marginTop: '32px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                <strong>ℹ️ Información</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                  <li>El sistema abre el banner en una pestaña nueva para asentar la cookie de afiliación y luego redirige al producto.</li>
                  <li>Tasa de atribución estimada: ~50-70% Chrome desktop, ~30% Android, {'<'}10% iOS (Safari ITP).</li>
                  <li>Solución temporal hasta que se aprueben las credenciales de la AliExpress Affiliate API.</li>
                </ul>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminAfiliacion
