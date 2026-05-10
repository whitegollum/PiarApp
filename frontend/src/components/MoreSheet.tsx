import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ShoppingBag, ListTodo, Trophy, Radio } from 'lucide-react'
import '../styles/MoreSheet.css'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  clubId: string
}

export default function MoreSheet({ open, onClose, clubId }: MoreSheetProps) {
  const base = `/clubes/${clubId}`

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="more-sheet-overlay" onClick={onClose}>
      <div
        className="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones del club"
        onClick={e => e.stopPropagation()}
      >
        <div className="more-sheet-handle" />

        <nav className="more-sheet-items">
          <NavLink
            to={`${base}/productos`}
            className={({ isActive }) => `more-sheet-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <ShoppingBag size={20} />
            <span>Tienda</span>
          </NavLink>

          <NavLink
            to={`${base}/tareas`}
            className={({ isActive }) => `more-sheet-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <ListTodo size={20} />
            <span>Tareas</span>
          </NavLink>

          <NavLink
            to={`${base}/ranking`}
            className={({ isActive }) => `more-sheet-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Trophy size={20} />
            <span>Ranking</span>
          </NavLink>

          <NavLink
            to={`${base}/canales`}
            className={({ isActive }) => `more-sheet-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Radio size={20} />
            <span>Canales</span>
          </NavLink>
        </nav>
      </div>
    </div>
  )
}
