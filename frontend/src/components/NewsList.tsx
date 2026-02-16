import React, { useState } from 'react'
import { Noticia } from '../types/models'
import { Link } from 'react-router-dom'
import CommentsSection from './CommentsSection'
import '../styles/NewsList.css'

interface NewsListProps {
  noticias: Noticia[]
  clubId: number
  canEdit?: boolean
}

const NewsList: React.FC<NewsListProps> = ({ noticias, clubId, canEdit = false }) => {
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  const toggleComments = (id: number) => {
    setExpandedComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
              {noticia.contenido}
            </p>
            <div className="news-footer" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
              <span className="news-author">
                {noticia.autor?.nombre_completo || 'Autor desconocido'}
              </span>
              <span className="news-date">
                {new Date(noticia.fecha_creacion).toLocaleDateString('es-ES')}
              </span>
            </div>
            
            <div className="news-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => toggleComments(noticia.id)}
                  style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em' }}
                >
                  💬 {expandedComments[noticia.id] ? 'Ocultar comentarios' : 'Comentarios'}
                </button>

                {canEdit && (
                  <Link to={`/clubes/${clubId}/noticias/${noticia.id}/editar`} className="btn-edit" style={{ fontSize: '0.9em', color: '#666', textDecoration: 'none' }}>
                    ✏️ Editar
                  </Link>
                )}
            </div>

            {expandedComments[noticia.id] && (
              <CommentsSection clubId={clubId} noticiaId={noticia.id} />
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

export default NewsList
