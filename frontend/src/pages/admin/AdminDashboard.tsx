import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/Navbar'
import '../../styles/Forms.css'
import '../../styles/Admin.css'

const AdminDashboard = () => {
    const { usuario, isLoading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return
        if (!usuario?.es_superadmin) {
            navigate('/')
        }
    }, [usuario, isLoading, navigate])

    return (
        <div className="form-layout">
            <Navbar />
            <main className="form-main">
                <div className="admin-container">
                    <div className="admin-header">
                        <h1>Panel de Superadministrador</h1>
                        <p className="subtitle">Gestion central del sistema y configuraciones globales.</p>
                    </div>

                    <div className="admin-grid">
                        <Link to="/admin/clubes" className="admin-card">
                            <div className="admin-card-icon">🏢</div>
                            <h3 className="admin-card-title">Gestionar clubes</h3>
                            <p className="admin-card-text">Crear, editar y eliminar clubes del sistema.</p>
                        </Link>

                        <Link to="/admin/email" className="admin-card">
                            <div className="admin-card-icon">📧</div>
                            <h3 className="admin-card-title">Configuracion email</h3>
                            <p className="admin-card-text">Configurar servidor SMTP para envio de correos.</p>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default AdminDashboard
