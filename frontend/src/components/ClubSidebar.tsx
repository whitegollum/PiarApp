import { useState, useEffect } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import {
  Home, Users, FileText, Calendar, ShoppingBag,
  Trophy, Radio, Settings, HelpCircle, ChevronsLeft, ChevronsRight,
  ListTodo, Gift
} from 'lucide-react'
import '../styles/ClubSidebar.css'

const COLLAPSED_KEY = 'sidebar_collapsed'

export default function ClubSidebar() {
  const { clubId } = useParams<{ clubId: string }>()
  const { usuario } = useAuth()
  const { role } = useClubRole(clubId)

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  if (!clubId) return null

  const base = `/clubes/${clubId}`
  const canEdit = role === 'administrador' || role === 'propietario' || usuario?.es_superadmin

  const items = [
    { to: base, label: 'Inicio', icon: <Home size={20} />, end: true },
    { to: `${base}/miembros`, label: 'Socios', icon: <Users size={20} /> },
    { to: `${base}/documentacion`, label: 'Documentos', icon: <FileText size={20} /> },
    { to: `${base}/eventos`, label: 'Eventos', icon: <Calendar size={20} /> },
    { to: `${base}/noticias`, label: 'Noticias', icon: <FileText size={20} /> },
    { to: `${base}/productos`, label: 'Tienda', icon: <ShoppingBag size={20} /> },
    { to: `${base}/tareas`, label: 'Tareas', icon: <ListTodo size={20} /> },
    { to: `${base}/ranking`, label: 'Ranking', icon: <Trophy size={20} /> },
    { to: `${base}/canales`, label: 'Canales', icon: <Radio size={20} /> },
    ...(canEdit ? [{ to: `${base}/premios`, label: 'Premios', icon: <Gift size={20} /> }] : []),
    { to: `${base}/editar`, label: 'Configuración', icon: <Settings size={20} /> },
  ] as const

  return (
    <aside className={`club-sidebar${collapsed ? ' club-sidebar--collapsed' : ''}`}>
      <nav className="club-sidebar-nav" aria-label="Navegación del club">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
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
          <span className="club-sidebar-icon"><HelpCircle size={20} /></span>
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
