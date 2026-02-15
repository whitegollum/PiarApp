import React from 'react'
import { Noticia } from '../types/models'
import { Link } from 'react-router-dom'
import '../styles/NewsList.css'

interface NewsListProps {
  noticias: Noticia[]
  clubId: number
  canEdit?: boolean
}

const NewsList: React.FC<NewsListProps> = ({ noticias, clubId, canEdit = false }) => {
  if (noticias.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay noticias publicadas.</p>
      </div>
    )
  }

  return (
    <div className="news-grid">
      {noticias.map((noticia) => (
        <article key={noticia.id} className="news-card">
          {noticia.imagen_url && (
            <div className="news-image">
              <img src={noticia.imagen_url} alt={noticia.titulo} />
            </div>
          )}
          <div className="news-content">
            <span className={`category-tag ${noticia.categoria}`}>{noticia.categoria || 'General'}</span>
            <h3 className="news-title">{noticia.titulo}</h3>
            <p className="news-excerpt">
              {noticia.contenido.length > 150
                ? `${noticia.contenido.substring(0, 150)}...`
                : noticia.contenido}
            </p>
            <div className="news-footer">
              <span className="news-author">
                {noticia.autor?.nombre_completo || 'Autor desconocido'}
              </span>
              <span className="news-date">
                {new Date(noticia.fecha_creacion).toLocaleDateString('es-ES')}
              </span>
            </div>
            
            {canEdit && (
              <Link to={`/clubes/${clubId}/noticias/${noticia.id}/editar`} className="btn-edit" style={{ marginTop: '10px', display: 'inline-block', fontSize: '0.9em', color: '#666' }}>
                ✏️ Editar
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

export default NewsList
