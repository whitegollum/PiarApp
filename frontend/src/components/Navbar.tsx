import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Menu, Home, Pencil, Users, Newspaper, Calendar, ShoppingCart,
  ClipboardList, Trophy, Radio, Gift, Lock, Plane,
  ChevronDown, Settings, Shield, LogOut, User, Search, Bell
} from 'lucide-react'
import '../styles/Navbar.css'

interface NavbarProps {
  clubName?: string
  clubLogo?: string
  clubId?: string
  canEdit?: boolean
  totalAlertas?: number
}

export default function Navbar({ clubName, clubLogo, clubId, canEdit, totalAlertas }: NavbarProps = {}) {
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
        {/* Left: Logo / Club name + hamburger (mobile-only in club context) */}
        <div className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Hamburger — visible on mobile only when inside a club */}
          {clubId ? (
            <div className="navbar-hamburger" style={{ position: 'relative' }}>
              <button
                onClick={() => setAccionesAbiertas(!accionesAbiertas)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Menú de acciones"
              >
                <Menu size={24} />
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
                    <Home size={16} /> Home
                  </button>
                  {canEdit && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/clubes/${clubId}/editar`)
                        setAccionesAbiertas(false)
                      }}
                    >
                      <Pencil size={16} /> Editar Club
                    </button>
                  )}
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/miembros`)
                      setAccionesAbiertas(false)
                    }}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Miembros</span>
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
                        {totalAlertas}
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
                    <Newspaper size={16} /> Añadir noticia
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/eventos/crear`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    <Calendar size={16} /> Añadir evento
                  </button>
                  {canEdit && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/clubes/${clubId}/productos/admin`)
                        setAccionesAbiertas(false)
                      }}
                    >
                      <ShoppingCart size={16} /> Administrar Productos
                    </button>
                  )}
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/tareas`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    <ClipboardList size={16} /> Tareas Comunitarias
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/ranking`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    <Trophy size={16} /> Ranking
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/clubes/${clubId}/canales`)
                      setAccionesAbiertas(false)
                    }}
                  >
                    <Radio size={16} /> Canales
                  </button>
                  {canEdit && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/clubes/${clubId}/premios`)
                        setAccionesAbiertas(false)
                      }}
                    >
                      <Gift size={16} /> Gestionar Premios
                    </button>
                  )}
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setAccionesAbiertas(false)
                      // TODO: Navegar a editar contraseña
                    }}
                  >
                    <Lock size={16} /> Editar contraseña de acceso
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/">
              <span className="logo-icon"><Plane size={24} /></span>
              <span className="logo-text">PiarAPP</span>
            </Link>
          )}
          
          {/* Nombre del club o logo PiarAPP */}
          {clubName ? (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'white',
              paddingLeft: clubId ? '0' : '1rem',
              borderLeft: clubId ? 'none' : '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              {clubLogo && (
                <img
                  src={clubLogo}
                  alt={clubName}
                  style={{
                    width: '36px',
                    height: '36px',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '2px'
                  }}
                />
              )}
              {clubName}
            </span>
          ) : !clubId && (
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="logo-text">PiarAPP</span>
            </Link>
          )}
        </div>

        {/* Centre: Search bar — desktop only, in club context */}
        {clubId && (
          <div className="navbar-search">
            <Search size={16} className="navbar-search-icon" />
            <input
              type="search"
              placeholder="Buscar..."
              className="navbar-search-input"
              aria-label="Buscar en el club"
            />
          </div>
        )}

        {/* Right: Bell + user avatar */}
        <div className="navbar-end">
          {/* Notification bell — desktop only */}
          {clubId && (
            <Link
              to={`/admin/alertas?club=${clubId}${usuario?.id ? `&usuario=${usuario.id}` : ''}`}
              className="navbar-bell"
              title="Ver alertas"
            >
              <Bell size={20} />
              {(totalAlertas ?? 0) > 0 && (
                <span className="navbar-bell-badge">{totalAlertas}</span>
              )}
            </Link>
          )}
          <div className="user-menu">
            <button 
              className="user-button"
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              <span className="user-avatar">
                {usuario?.nombre_completo?.charAt(0).toUpperCase() || <User size={16} />}
              </span>
              <span className="dropdown-arrow"><ChevronDown size={14} /></span>
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
                  <User size={16} /> Mi Perfil
                </Link>
                <Link 
                  to="/configuracion" 
                  className="dropdown-item"
                  onClick={() => setMenuAbierto(false)}
                >
                  <Settings size={16} /> Configuración
                </Link>
                {usuario?.es_superadmin && (
                  <Link 
                    to="/admin" 
                    className="dropdown-item"
                    onClick={() => setMenuAbierto(false)}
                  >
                    <Shield size={16} /> Admin (Super)
                  </Link>
                )}
                <hr />
                <button 
                  className="dropdown-item danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
