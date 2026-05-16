import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { User, Settings, Home, ChevronsLeft, ChevronsRight } from 'lucide-react'
import '../styles/ClubSidebar.css'

const COLLAPSED_KEY = 'user_sidebar_collapsed'

const items = [
  { to: '/perfil',        label: 'Mi Perfil',     icon: <User size={20} />,     end: true },
  { to: '/configuracion', label: 'Configuración',  icon: <Settings size={20} />, end: true },
]

export default function UserSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  return (
    <aside className={`club-sidebar${collapsed ? ' club-sidebar--collapsed' : ''}`}>
      <nav className="club-sidebar-nav" aria-label="Menú de usuario">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `club-sidebar-item${isActive ? ' club-sidebar-item--active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="club-sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="club-sidebar-label">{item.label}</span>}
          </NavLink>
        ))}

        <div className="club-sidebar-divider" />

        <NavLink
          to="/"
          className="club-sidebar-item"
          title={collapsed ? 'Mis Clubs' : undefined}
        >
          <span className="club-sidebar-icon"><Home size={20} /></span>
          {!collapsed && <span className="club-sidebar-label">Mis Clubs</span>}
        </NavLink>
      </nav>

      <button
        className="club-sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        <span className="club-sidebar-icon">
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </span>
        {!collapsed && <span className="club-sidebar-label">Contraer</span>}
      </button>
    </aside>
  )
}
