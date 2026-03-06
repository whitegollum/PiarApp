import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ProductoService } from '../services/productoService'
import { ProductoAfiliacion, ProductoAfiliacionCreate } from '../types/models'
import { useClubRole } from '../hooks/useClubRole'
import Navbar from '../components/Navbar'
import '../styles/Productos.css'

export default function ProductosAdmin() {
  const { usuario } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const { role } = useClubRole(clubId)

  const [productos, setProductos] = useState<ProductoAfiliacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProducto, setEditingProducto] = useState<ProductoAfiliacion | null>(null)

  // Formulario
  const [formData, setFormData] = useState<ProductoAfiliacionCreate>({
    nombre: '',
    descripcion: '',
    categoria: '',
    url_afiliacion: '',
    codigo_afiliacion: '',
    proveedor: '',
    imagen_url: '',
    precio_referencia: '',
    activo: true,
    orden: 0,
    destacado: false
  })

  const canEdit = role === 'administrador' || usuario?.es_superadmin

  useEffect(() => {
    if (!usuario || !clubId) {
      if (!usuario) navigate('/auth/login')
      return
    }

    if (!canEdit) {
      navigate(`/clubes/${clubId}`)
      return
    }

    cargarProductos()
  }, [clubId, usuario, navigate, canEdit])

  const cargarProductos = async () => {
    try {
      setLoading(true)
      const data = await ProductoService.getAll(
        parseInt(clubId!),
        undefined,
        false, // incluir inactivos
        false
      )
      setProductos(data.productos)
    } catch (err) {
      setError('Error al cargar productos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingProducto) {
        await ProductoService.update(parseInt(clubId!), editingProducto.id, formData)
      } else {
        await ProductoService.create(parseInt(clubId!), formData)
      }
      
      setShowForm(false)
      setEditingProducto(null)
      resetForm()
      await cargarProductos()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar el producto')
    }
  }

  const handleEdit = (producto: ProductoAfiliacion) => {
    setEditingProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria: producto.categoria || '',
      url_afiliacion: producto.url_afiliacion,
      codigo_afiliacion: producto.codigo_afiliacion || '',
      proveedor: producto.proveedor || '',
      imagen_url: producto.imagen_url || '',
      precio_referencia: producto.precio_referencia || '',
      activo: producto.activo,
      orden: producto.orden,
      destacado: producto.destacado
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      await ProductoService.delete(parseInt(clubId!), id)
      await cargarProductos()
    } catch (err) {
      setError('Error al eliminar el producto')
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      url_afiliacion: '',
      codigo_afiliacion: '',
      proveedor: '',
      imagen_url: '',
      precio_referencia: '',
      activo: true,
      orden: 0,
      destacado: false
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProducto(null)
    resetForm()
    setError('')
  }

  if (!usuario || !canEdit) return null

  return (
    <>
      <Navbar />
      <main className="productos-main">
        <div className="productos-container">
          <div className="header-actions">
            <button className="btn btn-back" onClick={() => navigate(`/clubes/${clubId}/productos`)}>
              ← Ver Catálogo
            </button>
            {!showForm && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                + Nuevo Producto
              </button>
            )}
          </div>

          <div className="productos-header">
            <h1>⚙️ Administrar Productos</h1>
            <p className="subtitle">Gestiona los enlaces de afiliación de tu club</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {showForm && (
            <div className="producto-form-card">
              <h2>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <form onSubmit={handleSubmit} className="producto-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      placeholder="ej: Motor Brushless 2300KV"
                    />
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text"
                      value={formData.proveedor}
                      onChange={e => setFormData({...formData, proveedor: e.target.value})}
                      placeholder="ej: Amazon, AliExpress"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>URL de Afiliación *</label>
                  <input
                    type="url"
                    required
                    value={formData.url_afiliacion}
                    onChange={e => setFormData({...formData, url_afiliacion: e.target.value})}
                    placeholder="https://www.amazon.es/producto?tag=tu-codigo"
                  />
                  <small>URL completa del producto con tu código de afiliación incluido</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Código de Afiliación</label>
                    <input
                      type="text"
                      value={formData.codigo_afiliacion}
                      onChange={e => setFormData({...formData, codigo_afiliacion: e.target.value})}
                      placeholder="tu-codigo-afiliado"
                    />
                    <small>Opcional - para referencia interna</small>
                  </div>

                  <div className="form-group">
                    <label>Categoría</label>
                    <input
                      type="text"
                      value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                      placeholder="ej: Motores, Baterías, Electrónica"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    rows={3}
                    placeholder="Descripción del producto y por qué lo recomiendas"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>URL de Imagen</label>
                    <input
                      type="url"
                      value={formData.imagen_url}
                      onChange={e => setFormData({...formData, imagen_url: e.target.value})}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>

                  <div className="form-group">
                    <label>Precio de Referencia</label>
                    <input
                      type="text"
                      value={formData.precio_referencia}
                      onChange={e => setFormData({...formData, precio_referencia: e.target.value})}
                      placeholder="ej: 29.99€, $45.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Orden de Visualización</label>
                    <input
                      type="number"
                      value={formData.orden}
                      onChange={e => setFormData({...formData, orden: parseInt(e.target.value) || 0})}
                    />
                    <small>Mayor número = aparece primero</small>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.destacado}
                        onChange={e => setFormData({...formData, destacado: e.target.checked})}
                      />
                      Producto destacado
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                      />
                      Activo (visible en catálogo)
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingProducto ? 'Actualizar' : 'Crear'} Producto
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : (
            <div className="productos-admin-list">
              <h3>Productos ({productos.length})</h3>
              {productos.length === 0 ? (
                <div className="empty-state">
                  <p>No hay productos creados aún</p>
                </div>
              ) : (
                <div className="admin-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Proveedor</th>
                        <th>Estado</th>
                        <th>Clicks</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(producto => (
                        <tr key={producto.id} className={!producto.activo ? 'inactivo' : ''}>
                          <td>
                            <div className="producto-info">
                              {producto.destacado && <span className="badge-destacado">⭐</span>}
                              <strong>{producto.nombre}</strong>
                              {producto.precio_referencia && (
                                <span className="precio-small">{producto.precio_referencia}</span>
                              )}
                            </div>
                          </td>
                          <td>{producto.categoria || '-'}</td>
                          <td>{producto.proveedor || '-'}</td>
                          <td>
                            <span className={`badge ${producto.activo ? 'badge-success' : 'badge-warning'}`}>
                              {producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>{producto.clicks}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEdit(producto)}
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(producto.id)}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
