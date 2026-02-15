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
                                <button onClick={() => navigate(`/clubes/${club.id}`)} style={{ marginRight: '5px' }}>
                                    Ver
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  )
}
