import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Navbar.css'

interface NavbarProps {
  clubName?: string
  clubId?: string
  canEdit?: boolean
  totalAlertas?: number
}

export default function Navbar({ clubName, clubId, canEdit, totalAlertas }: NavbarProps = {}) {
  const [menuAbierto, setMenuAbierto] = React.useState(false)
  const [accionesAbiertas, setAccionesAbiertas] = React.useState(false)
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo y menú de acciones */}
        <div className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Menú hamburguesa solo si hay clubId */}
          {clubId ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setAccionesAbiertas(!accionesAbiertas)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  lineHeight: 1,
                }}
                title="Menú de acciones"
              >
                ☰
              </button>
              {accionesAbiertas && (
                <div className="dropdown-menu" style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0,
                  zIndex: 1000,
                  marginTop: '0.5rem'
                }}>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/', { state: { fromHomeButton: true } })
                      setAccionesAbiertas(false)
                    }}
                  >
                    🏠 Home
                  </button>
                  {canEdit && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/clubes/${clubId}/editar`)
                        setAccionesAbiertas(false)
                      }}
                    >
                      ✏️ Editar Club
                    </button>
                  )}
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/miembros`)
                      setAccionesAbiertas(false)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}
                  >
                    <span>👥 Administrar miembros</span>
                    {totalAlertas && totalAlertas > 0 && (
                      <span
                        style={{
                          background: '#ff4444',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}
                      >
                        🚨 {totalAlertas}
                      </span>
                    )}
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/noticias/crear`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    📰 Añadir noticia
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/eventos/crear`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    📅 Añadir evento
                  </button>
                  {canEdit && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/clubes/${clubId}/productos/admin`)
                        setAccionesAbiertas(false)
                      }}
                    >
                      🛒 Administrar Productos
                    </button>
                  )}
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setAccionesAbiertas(false)
                      // TODO: Navegar a editar contraseña
                    }}
                  >
                    🔒 Editar contraseña de acceso
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/">
              <span className="logo-icon">🛩️</span>
              <span className="logo-text">PiarAPP</span>
            </Link>
          )}
          
          {/* Nombre del club o logo PiarAPP */}
          {clubName ? (
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'white',
              paddingLeft: clubId ? '0' : '1rem',
              borderLeft: clubId ? 'none' : '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              {clubName}
            </span>
          ) : !clubId && (
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="logo-text">PiarAPP</span>
            </Link>
          )}
        </div>

        {/* Usuario y menú */}
        <div className="navbar-end">
          <div className="user-menu">
            <button 
              className="user-button"
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              <span className="user-avatar">
                {usuario?.nombre_completo?.charAt(0).toUpperCase() || '👤'}
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {menuAbierto && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="user-name">{usuario?.nombre_completo}</div>
                  <div className="user-email">{usuario?.email}</div>
                </div>
                <hr />
                <Link 
                  to="/perfil" 
                  className="dropdown-item"
                  onClick={() => setMenuAbierto(false)}
                >
                  👤 Mi Perfil
                </Link>
                <Link 
                  to="/configuracion" 
                  className="dropdown-item"
                  onClick={() => setMenuAbierto(false)}
                >
                  ⚙️ Configuración
                </Link>
                {usuario?.es_superadmin && (
                  <Link 
                    to="/admin" 
                    className="dropdown-item"
                    onClick={() => setMenuAbierto(false)}
                  >
                    🛡️ Admin (Super)
                  </Link>
                )}
                <hr />
                <button 
                  className="dropdown-item danger"
                  onClick={handleLogout}
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
