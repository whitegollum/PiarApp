import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ClubLayout from './components/ClubLayout'
import UserLayout from './components/UserLayout'
import './App.css'
import APIService from './services/api'
import { useEffect } from 'react'
import BottomTabBar from './components/BottomTabBar'

import Login from './pages/Login'
import FirstAccess from './pages/FirstAccess'
import Register from './pages/Register'
import AcceptInvitation from './pages/AcceptInvitation'
import GoogleOAuthCallback from './pages/GoogleOAuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import Dashboard from './pages/Dashboard'
import ClubDetail from './pages/ClubDetail'
import ClubEdit from './pages/ClubEdit'
import CreateClub from './pages/CreateClub'
import ClubMembers from './pages/ClubMembers'
import SocioForm from './pages/SocioForm'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

import ClubEvents from './pages/ClubEvents'
import ClubNews from './pages/ClubNews'
import CreateNews from './pages/CreateNews'
import EditNews from './pages/EditNews'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'
import EventDetail from './pages/EventDetail'
import AdminClubs from './pages/admin/AdminClubs'
import AdminEmailConfig from './pages/admin/AdminEmailConfig'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAlertas from './pages/admin/AdminAlertas'
import AdminDatabase from './pages/admin/AdminDatabase'
import AdminAgentConfig from './pages/admin/AdminAgentConfig'
import AdminAfiliacion from './pages/admin/AdminAfiliacion'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import ClubDocumentacion from './pages/ClubDocumentacion'
import ProductosCatalogo from './pages/ProductosCatalogo'
import ProductosAdmin from './pages/ProductosAdmin'
import ClubTareas from './pages/ClubTareas'
import TareaDetail from './pages/TareaDetail'
import CreateTarea from './pages/CreateTarea'
import EditTarea from './pages/EditTarea'
import ClubRanking from './pages/ClubRanking'
import AdminPremios from './pages/AdminPremios'
import ClubCanales from './pages/ClubCanales'
import ClubCanalesInvitado from './pages/ClubCanalesInvitado'

const SetupCheck = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkSetup = async () => {
      if (location.pathname === '/auth/setup-inicial') return
      try {
        const response = await APIService.get<{ setup_required: boolean }>('/auth/setup-required', { skipAuth: true })
        if (response && response.setup_required) {
          navigate('/auth/setup-inicial')
        }
      } catch (error) {
        console.error('Error verificando estado de configuracion:', error)
      }
    }
    checkSetup()
  }, [navigate, location.pathname])

  return null
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <SetupCheck />
        <Routes>
          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/clubes" element={<ProtectedRoute><AdminClubs /></ProtectedRoute>} />
          <Route path="/admin/email" element={<ProtectedRoute><AdminEmailConfig /></ProtectedRoute>} />
          <Route path="/admin/alertas" element={<ProtectedRoute><AdminAlertas /></ProtectedRoute>} />
          <Route path="/admin/database" element={<ProtectedRoute><AdminDatabase /></ProtectedRoute>} />
          <Route path="/admin/agent" element={<ProtectedRoute><AdminAgentConfig /></ProtectedRoute>} />
          <Route path="/admin/afiliacion" element={<ProtectedRoute><AdminAfiliacion /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuarios /></ProtectedRoute>} />

          {/* Ruta pública de invitados por QR (sin autenticación) */}
          <Route path="/invitado/:tokenQr" element={<ClubCanalesInvitado />} />

          {/* Public routes */}
          <Route path="/auth/setup-inicial" element={<FirstAccess />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/registro" element={<Register />} />
          <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
          <Route path="/auth/aceptar-invitacion" element={<AcceptInvitation />} />
          <Route path="/auth/recuperar-contrasena" element={<ForgotPassword />} />
          <Route path="/auth/reset-contrasena" element={<ResetPassword />} />

          {/* Protected non-club routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clubes/crear" element={<ProtectedRoute><CreateClub /></ProtectedRoute>} />
          {/* User routes wrapped in UserLayout (Navbar + Sidebar + Outlet) */}
          <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
            <Route path="/perfil" element={<Profile />} />
            <Route path="/configuracion" element={<Settings />} />
          </Route>
          <Route path="/perfil/socio" element={<Navigate to="/perfil" />} />
          <Route path="/perfil/documentacion" element={<ProtectedRoute><ClubDocumentacion /></ProtectedRoute>} />

          {/* Club routes wrapped in ClubLayout (Navbar + Sidebar + Outlet) */}
          <Route path="/clubes/:clubId" element={<ProtectedRoute><ClubLayout /></ProtectedRoute>}>
            <Route index element={<ClubDetail />} />
            <Route path="editar" element={<ClubEdit />} />
            <Route path="miembros" element={<ClubMembers />} />
            <Route path="socios/crear" element={<SocioForm />} />
            <Route path="socios/:socioId/editar" element={<SocioForm />} />
            <Route path="noticias" element={<ClubNews />} />
            <Route path="noticias/crear" element={<CreateNews />} />
            <Route path="noticias/:noticiaId/editar" element={<EditNews />} />
            <Route path="eventos" element={<ClubEvents />} />
            <Route path="eventos/crear" element={<CreateEvent />} />
            <Route path="eventos/:eventoId" element={<EventDetail />} />
            <Route path="eventos/:eventoId/editar" element={<EditEvent />} />
            <Route path="productos" element={<ProductosCatalogo />} />
            <Route path="productos/admin" element={<ProductosAdmin />} />
            <Route path="tareas" element={<ClubTareas />} />
            <Route path="tareas/crear" element={<CreateTarea />} />
            <Route path="tareas/:tareaId" element={<TareaDetail />} />
            <Route path="tareas/:tareaId/editar" element={<EditTarea />} />
            <Route path="ranking" element={<ClubRanking />} />
            <Route path="canales" element={<ClubCanales />} />
            <Route path="premios" element={<AdminPremios />} />
            <Route path="documentacion" element={<ClubDocumentacion />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <BottomTabBar />
      </Router>
    </AuthProvider>
  )
}

export default App
