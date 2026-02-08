import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, isLoading, usuario } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  // Validar rol si es requerido
  if (requiredRole && usuario && !hasRole(usuario, requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Verifica si un usuario tiene un rol específico
 */
function hasRole(usuario: any, requiredRole: string): boolean {
  // Este es un ejemplo simple, ajustar según tu estructura de datos
  return usuario.rol === requiredRole
}

export default ProtectedRoute
