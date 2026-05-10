import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, Newspaper, Calendar, MoreHorizontal } from 'lucide-react'
import MoreSheet from './MoreSheet'
import '../styles/BottomTabBar.css'

const MORE_PATHS = ['/productos', '/tareas', '/ranking', '/canales']

export default function BottomTabBar() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  // Extract clubId from current path
  const match = location.pathname.match(/\/clubes\/(\d+)/)
  const clubId = match?.[1]

  // Don't render outside club context
  if (!clubId) return null

  const base = `/clubes/${clubId}`
  const isMoreActive = MORE_PATHS.some(p => location.pathname.startsWith(`${base}${p}`))

  return (
    <>
      <nav className="bottom-tab-bar" aria-label="Navegación principal del club">
        <NavLink
          to={base}
          end
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <Home size={22} />
          <span className="bottom-tab-label">Resumen</span>
        </NavLink>

        <NavLink
          to={`${base}/miembros`}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <Users size={22} />
          <span className="bottom-tab-label">Miembros</span>
        </NavLink>

        <NavLink
          to={`${base}/noticias`}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <Newspaper size={22} />
          <span className="bottom-tab-label">Noticias</span>
        </NavLink>

        <NavLink
          to={`${base}/eventos`}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <Calendar size={22} />
          <span className="bottom-tab-label">Eventos</span>
        </NavLink>

        <button
          type="button"
          className={`bottom-tab bottom-tab-more ${isMoreActive ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={22} />
          <span className="bottom-tab-label">Más</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} clubId={clubId} />
    </>
  )
}
