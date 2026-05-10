import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import APIService from '../../services/api'
import Navbar from '../../components/Navbar'
import { Plus, Eye, Trash2, AlertTriangle, Building2 } from 'lucide-react'
import '../../styles/Forms.css'
import '../../styles/AdminClubs.css'

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

  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [slug, setSlug] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!usuario || !usuario.es_superadmin)) {
      navigate('/dashboard')
      return
    }
    if (usuario?.es_superadmin) fetchClubs()
  }, [usuario, isLoading, navigate])

  const fetchClubs = async () => {
    try {
      const data = await APIService.get<Club[]>('/clubes')
      setClubs(data)
    } catch {
      setError('Error al cargar clubes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await APIService.post('/clubes', { nombre, descripcion, slug })
      setShowForm(false)
      setNombre('')
      setDescripcion('')
      setSlug('')
      fetchClubs()
    } catch (err: any) {
      setError('Error al crear club: ' + (err.response?.data?.detail || err.message))
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
    } catch (err: any) {
      setError('Error al eliminar club: ' + (err.response?.data?.detail || err.message))
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return null
  if (!usuario?.es_superadmin) return null

  return (
    <>
      <Navbar />
      <main className="form-main">
        <div className="admin-clubs-page">

          <div className="header-actions">
            <h1>Clubes</h1>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setShowForm(prev => !prev); setError('') }}
            >
              {showForm ? 'Cancelar' : <><Plus size={15} /> Nuevo Club</>}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {showForm && (
            <div className="admin-clubs-form-panel">
              <h3>Crear nuevo club</h3>
              <form className="form" onSubmit={handleCreate}>
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Nombre del club"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="slug">Slug (URL) *</label>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="ej: club-madrid"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="descripcion">Descripción *</label>
                  <textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                    placeholder="Breve descripción del club"
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar Club
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="admin-clubs-skeleton">
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
            </div>
          ) : clubs.length === 0 ? (
            <div className="admin-clubs-empty">
              <Building2 size={48} strokeWidth={1.2} />
              <h3>No hay clubes</h3>
              <p>Crea el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="admin-clubs-list">
              {clubs.map(club => (
                <div key={club.id} className="admin-club-card">
                  <div className="admin-club-id">#{club.id}</div>
                  <div className="admin-club-info">
                    <p className="admin-club-name">{club.nombre}</p>
                    <span className="admin-club-slug">{club.slug}</span>
                  </div>
                  <div className="admin-club-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/clubes/${club.id}`)}
                    >
                      <Eye size={13} /> Ver
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteClick(club)}
                    >
                      <Trash2 size={13} /> Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {showDeleteModal && clubToDelete && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelDelete() }}
        >
          <div className="admin-modal">
            <h2 className="admin-modal-title">
              <AlertTriangle size={20} /> Confirmar eliminación
            </h2>
            <p className="admin-modal-body">
              ¿Estás seguro de que deseas eliminar este club?
            </p>
            <div className="admin-modal-club-info">
              <strong>{clubToDelete.nombre}</strong>
              <span>Slug: {clubToDelete.slug}</span>
            </div>
            <p className="admin-modal-warning">
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al club.
            </p>
            <div className="admin-modal-confirm-row">
              <label htmlFor="confirm-toggle">
                Estoy seguro de lo que estoy haciendo
              </label>
              <label className="modal-toggle">
                <input
                  id="confirm-toggle"
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                />
                <span className="modal-toggle-track" />
              </label>
            </div>
            <div className="admin-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={!confirmDelete || deleting}
              >
                <Trash2 size={14} />
                {deleting ? 'Eliminando...' : 'Eliminar Club'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
