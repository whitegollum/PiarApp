import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import APIService from '../../services/api'
import Navbar from '../../components/Navbar'

interface Club {
  id: number
  nombre: string
  slug: string
  descripcion: string
  created_at: string
}

export default function AdminClubs() {
  const { usuario, isLoading } = useAuth()
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [slug, setSlug] = useState('')

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!usuario || !usuario.es_superadmin)) {
      navigate('/dashboard')
      return; // Stop execution
    }
    
    if (usuario?.es_superadmin) {
        fetchClubs()
    }
  }, [usuario, isLoading, navigate])

  const fetchClubs = async () => {
    try {
      // Assuming you might add a specific admin endpoint list later,
      // but for now we might only have the public list or need a new endpoint.
      // The current GET /clubes might return all clubs.
      // If GET /clubes returns all active clubs, that's fine for now.
      const data = await APIService.get<Club[]>('/clubes')
      setClubs(data)
    } catch (err: any) {
      setError('Error al cargar clubes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await APIService.post('/clubes', {
        nombre,
        descripcion,
        slug
      })
      setShowForm(false)
      setNombre('')
      setDescripcion('')
      setSlug('')
      fetchClubs()
      alert('Club creado exitosamente')
    } catch (err: any) {
      alert('Error al crear club: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleDeleteClick = (club: Club) => {
    setClubToDelete(club)
    setShowDeleteModal(true)
    setConfirmDelete(false)
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setClubToDelete(null)
    setConfirmDelete(false)
  }

  const handleConfirmDelete = async () => {
    if (!clubToDelete || !confirmDelete) return

    setDeleting(true)
    try {
      await APIService.post(`/admin/clubes/${clubToDelete.id}/delete`, {})
      setShowDeleteModal(false)
      setClubToDelete(null)
      setConfirmDelete(false)
      fetchClubs()
      alert(`Club "${clubToDelete.nombre}" eliminado exitosamente`)
    } catch (err: any) {
      alert('Error al eliminar club: ' + (err.response?.data?.detail || err.message))
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <div>Cargando...</div>
  if (!usuario?.es_superadmin) return null // Should redirect in useEffect

  return (
    <div className="layout">
      <Navbar />
      <div className="container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1>Administración de Clubes</h1>
            <button 
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
                {showForm ? 'Cancelar' : '➕ Nuevo Club'}
            </button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        {showForm && (
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
                <h3>Crear Nuevo Club</h3>
                <form onSubmit={handleCreate}>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Nombre</label>
                        <input 
                            type="text" 
                            value={nombre} 
                            onChange={(e) => setNombre(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Slug (URL)</label>
                        <input 
                            type="text" 
                            value={slug} 
                            onChange={(e) => setSlug(e.target.value)} 
                            required 
                            placeholder="ej: club-madrid"
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Descripción</label>
                        <textarea 
                            value={descripcion} 
                            onChange={(e) => setDescripcion(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '8px', minHeight: '80px' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                        Guardar Club
                    </button>
                </form>
            </div>
        )}

        {loading ? (
            <p>Cargando lista...</p>
        ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#eee', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>ID</th>
                        <th style={{ padding: '10px' }}>Nombre</th>
                        <th style={{ padding: '10px' }}>Slug</th>
                        <th style={{ padding: '10px' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {clubs.map(club => (
                        <tr key={club.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '10px' }}>{club.id}</td>
                            <td style={{ padding: '10px' }}>{club.nombre}</td>
                            <td style={{ padding: '10px' }}>{club.slug}</td>
                            <td style={{ padding: '10px' }}>
                                <button 
                                  onClick={() => navigate(`/clubes/${club.id}`)} 
                                  className="btn btn-sm btn-primary"
                                  style={{ marginRight: '5px' }}
                                >
                                    👁️ Ver
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(club)}
                                  className="btn btn-sm btn-danger"
                                  style={{ padding: '4px 12px' }}
                                >
                                    🗑️ Borrar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}

        {/* Modal de confirmación de borrado */}
        {showDeleteModal && clubToDelete && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{ color: '#dc2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚠️ Confirmar Eliminación
              </h2>
              
              <div style={{ marginBottom: '25px' }}>
                <p style={{ marginBottom: '15px', fontSize: '16px', lineHeight: '1.5' }}>
                  ¿Estás seguro de que deseas eliminar el club?
                </p>
                <div style={{
                  backgroundColor: '#fee',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #fcc'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '18px' }}>
                    {clubToDelete.nombre}
                  </p>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                    Slug: {clubToDelete.slug}
                  </p>
                </div>
                <p style={{ marginTop: '15px', color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>
                  ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al club.
                </p>
              </div>

              {/* Toggle de confirmación */}
              <div style={{
                backgroundColor: '#f9f9f9',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '25px',
                border: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1
                }}>
                  Estoy seguro de lo que estoy haciendo
                </label>
                
                {/* Toggle Switch */}
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '60px',
                  height: '30px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: confirmDelete ? '#dc2626' : '#ccc',
                    transition: '0.4s',
                    borderRadius: '30px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '',
                      height: '22px',
                      width: '22px',
                      left: confirmDelete ? '34px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      transition: '0.4s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>

              {/* Botones */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  onClick={handleCancelDelete}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px' }}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="btn btn-danger"
                  style={{ 
                    padding: '10px 20px',
                    opacity: confirmDelete ? 1 : 0.5,
                    cursor: confirmDelete ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!confirmDelete || deleting}
                >
                  {deleting ? 'Eliminando...' : '🗑️ Eliminar Club'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
