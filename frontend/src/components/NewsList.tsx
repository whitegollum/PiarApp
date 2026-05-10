import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Noticia } from '../types/models'
import { Link } from 'react-router-dom'
import { MessageCircle, MoreVertical, Pencil, Calendar } from 'lucide-react'
import CommentsSection from './CommentsSection'
import '../styles/NewsList.css'

interface NewsListProps {
  noticias: Noticia[]
  clubId: number
  canEdit?: boolean
  groupByTime?: boolean
}

interface NewsGroup {
  label: string
  noticias: Noticia[]
}

const HIDDEN_CATEGORIES = ['general', '']

function groupNewsByTime(noticias: Noticia[]): NewsGroup[] {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const thisWeek: Noticia[] = []
  const thisMonth: Noticia[] = []
  const older: Noticia[] = []

  for (const n of noticias) {
    const date = new Date(n.fecha_creacion)
    if (date >= startOfWeek && date < endOfWeek) {
      thisWeek.push(n)
    } else if (date >= startOfWeek || date <= endOfMonth) {
      thisMonth.push(n)
    } else {
      older.push(n)
    }
  }

  const groups: NewsGroup[] = []
  if (thisWeek.length > 0) groups.push({ label: 'ESTA SEMANA', noticias: thisWeek })
  if (thisMonth.length > 0) groups.push({ label: 'ESTE MES', noticias: thisMonth })
  if (older.length > 0) groups.push({ label: 'ANTERIORES', noticias: older })
  return groups
}

const NewsCard: React.FC<{ noticia: Noticia; clubId: number; canEdit: boolean }> = ({ noticia, clubId, canEdit }) => {
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const showCategory = noticia.categoria && !HIDDEN_CATEGORIES.includes(noticia.categoria.toLowerCase())

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const dateStr = (() => {
    const date = new Date(noticia.fecha_creacion)
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 30) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  })()

  return (
    <article className="news-card-v2">
      {noticia.imagen_url && (
        <div className="news-card-image">
          <img src={noticia.imagen_url} alt={noticia.titulo} />
        </div>
      )}
      <div className="news-card-body">
        <div className="news-card-title-row">
          <h3 className="news-card-title">{noticia.titulo}</h3>
          {canEdit && (
            <div className="news-kebab" ref={menuRef}>
              <button className="news-kebab-btn" onClick={() => setShowMenu(!showMenu)}>
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div className="news-kebab-menu">
                  <Link
                    to={`/clubes/${clubId}/noticias/${noticia.id}/editar`}
                    className="news-kebab-item"
                    onClick={() => setShowMenu(false)}
                  >
                    <Pencil size={14} /> Editar noticia
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="news-card-meta">
          <span className="news-card-date">
            <Calendar size={14} /> {dateStr}
          </span>
          {noticia.autor?.nombre_completo && (
            <span className="news-card-author">
              {noticia.autor.nombre_completo}
            </span>
          )}
          {showCategory && (
            <span className="news-card-category">{noticia.categoria}</span>
          )}
        </div>

        <p className={`news-card-excerpt ${expanded ? '' : 'clamped'}`}>
          {noticia.contenido}
        </p>
        {!expanded && noticia.contenido.length > 120 && (
          <button className="news-read-more" onClick={() => setExpanded(true)}>
            Leer más
          </button>
        )}

        <button
          className="news-comments-toggle"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={14} />
          {showComments
            ? 'Ocultar comentarios'
            : `${noticia.comentarios_count ?? 0} Comentarios`}
        </button>

        {showComments && (
          <div className="news-comments-section">
            <CommentsSection clubId={clubId} noticiaId={noticia.id} />
          </div>
        )}
      </div>
    </article>
  )
}

const NewsList: React.FC<NewsListProps> = ({ noticias, clubId, canEdit = false, groupByTime = false }) => {
  const groups = useMemo(() => {
    if (groupByTime) return groupNewsByTime(noticias)
    return [{ label: '', noticias }]
  }, [noticias, groupByTime])

  if (noticias.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay noticias publicadas.</p>
      </div>
    )
  }

  return (
    <div className="news-list-v2">
      {groups.map((group) => (
        <div key={group.label || 'all'} className="content-group">
          {group.label && <h3 className="content-group-label">{group.label}</h3>}
          {group.noticias.map((noticia) => (
            <NewsCard key={noticia.id} noticia={noticia} clubId={clubId} canEdit={canEdit} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default NewsList
