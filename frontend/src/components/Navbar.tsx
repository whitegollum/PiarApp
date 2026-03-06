import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Navbar.css'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = React.useState(false)
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <Link to="/">
            <span className="logo-icon">🛩️</span>
            <span className="logo-text">PiarAPP</span>
          </Link>
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
