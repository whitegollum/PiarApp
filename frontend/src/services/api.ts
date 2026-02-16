/**
 * Servicio de API para comunicación con el backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export class APIService {
  /**
   * Realiza una petición HTTP autenticada
   */
  private static async request(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const { skipAuth = false, ...fetchOptions } = options

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>)
    }

    // Agregar token de autenticación si está disponible
    if (!skipAuth) {
      const token = localStorage.getItem('access_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const url = `${API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      ...fetchOptions,
      headers
    })

    // Si el token expiró (401), intentar refrescar
    if (response.status === 401 && !skipAuth) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        return this.request(endpoint, { ...options, skipAuth })
      }
    }

    return response
  }

  /**
   * Realiza un GET request
   */
  static async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Realiza un POST request
   */
  static async post<T>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Realiza un PUT request
   */
  static async put<T>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Realiza un DELETE request
   */
  static async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Usa el refresh token para obtener un nuevo access token
   */
  private static async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      return false
    }

    try {
      const response = await this.request(
        '/auth/refresh-token',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
          skipAuth: true
        }
      )

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('access_token', data.access_token)
        return true
      }

      // Si el refresh falla, limpiar tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
      return false
    } catch (error) {
      console.error('Error refreshing token:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
      return false
    }
  }
}

export default APIService
