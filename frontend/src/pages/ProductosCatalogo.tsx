import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ProductoService } from '../services/productoService'
import { ProductoAfiliacion } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import Navbar from '../components/Navbar'
import '../styles/Productos.css'

export default function ProductosCatalogo() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [productos, setProductos] = useState<ProductoAfiliacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')

  const canEdit = role === 'administrador' || usuario?.es_superadmin

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    const cargarProductos = async () => {
      try {
        setLoading(true)
        const data = await ProductoService.getAll(
          parseInt(clubId),
          categoriaFiltro || undefined,
          true, // solo activos
          false // todos
        )
        setProductos(data.productos)
      } catch (err) {
        setError('Error al cargar productos')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    cargarProductos()
  }, [clubId, usuario, navigate, categoriaFiltro])

  const handleClickProducto = async (producto: ProductoAfiliacion) => {
    try {
      // Registrar click para estadísticas
      await ProductoService.registrarClick(parseInt(clubId!), producto.id)
      // Abrir enlace en nueva pestaña
      window.open(producto.url_afiliacion, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Error al registrar click:', err)
      // Abrir enlace aunque falle el registro
      window.open(producto.url_afiliacion, '_blank', 'noopener,noreferrer')
    }
  }

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]

  if (!usuario) return null

  return (
    <>
      <Navbar />
      <main className="productos-main">
        <div className="productos-container">
          <div className="header-actions">
            <button className="btn btn-back" onClick={() => navigate(`/clubes/${clubId}`)}>
              ← Volver al Club
            </button>
          </div>

          <div className="productos-header">
            <h1>🛒 Tienda de Afiliación</h1>
            <p className="subtitle">Productos recomendados por el club. Al comprar a través de estos enlaces, apoyas al club.</p>
          </div>

          {categorias.length > 0 && (
            <div className="categorias-filter">
              <button 
                className={`filter-btn ${categoriaFiltro === '' ? 'active' : ''}`}
                onClick={() => setCategoriaFiltro('')}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button 
                  key={cat}
                  className={`filter-btn ${categoriaFiltro === cat ? 'active' : ''}`}
                  onClick={() => setCategoriaFiltro(cat!)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : productos.length === 0 ? (
            <div className="empty-state">
              <p>📦 No hay productos disponibles en este momento</p>
              {canEdit && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/clubes/${clubId}/productos/admin`)}
                >
                  Añadir Primer Producto
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Productos Destacados */}
              {productos.some(p => p.destacado) && (
                <section className="productos-section">
                  <h2>⭐ Productos Destacados</h2>
                  <div className="productos-grid">
                    {productos.filter(p => p.destacado).map(producto => (
                      <div key={producto.id} className="producto-card destacado">
                        {producto.imagen_url && (
                          <div className="producto-imagen">
                            <img src={producto.imagen_url} alt={producto.nombre} />
                            {producto.destacado && <span className="badge-destacado">⭐ Destacado</span>}
                          </div>
                        )}
                        <div className="producto-content">
                          <h3>{producto.nombre}</h3>
                          {producto.proveedor && (
                            <span className="producto-proveedor">🏪 {producto.proveedor}</span>
                          )}
                          {producto.precio_referencia && (
                            <div className="producto-precio">{producto.precio_referencia}</div>
                          )}
                          {producto.descripcion && (
                            <p className="producto-descripcion">{producto.descripcion}</p>
                          )}
                          <div className="producto-footer">
                            {producto.categoria && (
                              <span className="producto-categoria">{producto.categoria}</span>
                            )}
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleClickProducto(producto)}
                            >
                              🔗 Ver Producto
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Todos los Productos */}
              <section className="productos-section">
                <h2>📦 Todos los Productos</h2>
                <div className="productos-grid">
                  {productos.filter(p => !p.destacado).map(producto => (
                    <div key={producto.id} className="producto-card">
                      {producto.imagen_url && (
                        <div className="producto-imagen">
                          <img src={producto.imagen_url} alt={producto.nombre} />
                        </div>
                      )}
                      <div className="producto-content">
                        <h3>{producto.nombre}</h3>
                        {producto.proveedor && (
                          <span className="producto-proveedor">🏪 {producto.proveedor}</span>
                        )}
                        {producto.precio_referencia && (
                          <div className="producto-precio">{producto.precio_referencia}</div>
                        )}
                        {producto.descripcion && (
                          <p className="producto-descripcion">{producto.descripcion}</p>
                        )}
                        <div className="producto-footer">
                          {producto.categoria && (
                            <span className="producto-categoria">{producto.categoria}</span>
                          )}
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleClickProducto(producto)}
                          >
                            🔗 Ver Producto
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}
