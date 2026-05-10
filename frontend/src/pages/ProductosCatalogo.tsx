import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Package, Store, ExternalLink, Heart, MoreVertical } from 'lucide-react'
import { ProductoService } from '../services/productoService'
import { ProductoAfiliacion } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import { affiliateUrl } from '../utils/affiliate'
import APIService from '../services/api'
import '../styles/Productos.css'
import '../styles/ClubDetail.css'

interface Club {
  id: number
  nombre: string
  slug: string
}

export default function ProductosCatalogo() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [, setClub] = useState<Club | null>(null)
  const [productos, setProductos] = useState<ProductoAfiliacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const canEdit = role === 'administrador' || usuario?.es_superadmin

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const id = parseInt(clubId)
    APIService.get<Club>(`/clubes/${id}`).then(setClub).catch(() => {})

    const cargarProductos = async () => {
      try {
        setLoading(true)
        const data = await ProductoService.getAll(id, undefined, true, false)
        setProductos(data.productos)
      } catch (err) {
        setError('Error al cargar productos')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    cargarProductos()
  }, [clubId, usuario, navigate])

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleClickProducto = async (producto: ProductoAfiliacion) => {
    try {
      await ProductoService.registrarClick(parseInt(clubId!), producto.id)
      window.open(affiliateUrl(producto.url_afiliacion), '_blank', 'noopener,noreferrer')
    } catch {
      window.open(affiliateUrl(producto.url_afiliacion), '_blank', 'noopener,noreferrer')
    }
  }

  const categorias = useMemo(() =>
    [...new Set(productos.map(p => p.categoria).filter(Boolean))] as string[],
    [productos]
  )

  const filtered = useMemo(() =>
    categoriaFiltro ? productos.filter(p => p.categoria === categoriaFiltro) : productos,
    [productos, categoriaFiltro]
  )

  // Count per category
  const countFor = (cat: string) => productos.filter(p => p.categoria === cat).length

  if (!usuario) return null

  return (
    <>
      <main className="club-detail-main">
        <div className="club-detail-container">

          {/* Header */}
          <div className="page-header-row">
            <h1 className="page-title">Tienda</h1>
            {canEdit && (
              <div className="news-kebab" ref={menuRef}>
                <button
                  className="news-kebab-btn"
                  onClick={() => setShowMenu(v => !v)}
                >
                  <MoreVertical size={20} />
                </button>
                {showMenu && (
                  <div className="news-kebab-menu">
                    <button
                      className="news-kebab-item"
                      onClick={() => { setShowMenu(false); navigate(`/clubes/${clubId}/productos/admin`) }}
                    >
                      Gestionar catálogo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtitle banner */}
          <p className="tienda-subtitle">
            <Heart size={13} fill="currentColor" />
            Cada compra apoya al club sin coste extra para ti
          </p>

          {/* Category tabs */}
          {categorias.length > 0 && (
            <div className="content-tabs">
              <button
                className={`content-tab ${categoriaFiltro === '' ? 'active' : ''}`}
                onClick={() => setCategoriaFiltro('')}
              >
                Todos · {productos.length}
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  className={`content-tab ${categoriaFiltro === cat ? 'active' : ''}`}
                  onClick={() => setCategoriaFiltro(cat)}
                >
                  {cat} · {countFor(cat)}
                </button>
              ))}
            </div>
          )}

          {/* States */}
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No hay productos disponibles</p>
              {canEdit && (
                <button className="btn btn-primary" onClick={() => navigate(`/clubes/${clubId}/productos/admin`)}>
                  Añadir producto
                </button>
              )}
            </div>
          ) : (
            <div className="productos-list">
              {filtered.map(producto => (
                <article key={producto.id} className={`producto-card-v2 ${producto.destacado ? 'destacado' : ''}`}>
                  <div className="producto-card-image">
                    {producto.imagen_url ? (
                      <img src={producto.imagen_url} alt={producto.nombre} />
                    ) : (
                      <div className="producto-card-placeholder">
                        <Package size={36} strokeWidth={1.2} />
                      </div>
                    )}
                  </div>
                  <div className="producto-card-body">
                    <div className="producto-card-title-row">
                      <h3 className="producto-card-name">{producto.nombre}</h3>
                      {producto.precio_referencia && (
                        <span className="producto-card-price">{producto.precio_referencia}</span>
                      )}
                    </div>
                    {producto.proveedor && (
                      <p className="producto-card-provider">
                        <Store size={12} /> {producto.proveedor}
                      </p>
                    )}
                    {producto.descripcion && (
                      <p className="producto-card-desc">{producto.descripcion}</p>
                    )}
                    <div className="producto-card-footer">
                      {producto.categoria && (
                        <span className="producto-category-pill">{producto.categoria}</span>
                      )}
                      <button
                        className="btn btn-outline btn-sm producto-card-cta"
                        onClick={() => handleClickProducto(producto)}
                      >
                        <ExternalLink size={13} /> Ver producto
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
