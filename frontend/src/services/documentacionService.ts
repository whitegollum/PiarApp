import APIService from './api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface DocumentacionResponse {
  id: number
  usuario_id: number
  rc_numero?: string | null
  rc_fecha_emision?: string | null
  rc_fecha_vencimiento?: string | null
  rc_archivo_nombre?: string | null
  rc_archivo_mime?: string | null
  rc_tiene_archivo: boolean
  carnet_numero?: string | null
  carnet_fecha_emision?: string | null
  carnet_fecha_vencimiento?: string | null
  carnet_archivo_nombre?: string | null
  carnet_archivo_mime?: string | null
  carnet_tiene_archivo: boolean
  fecha_creacion?: string | null
  fecha_actualizacion?: string | null
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const requestOrThrow = async (response: Response): Promise<DocumentacionResponse> => {
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const payload = await response.json()
      message = payload.detail || message
    } catch (err) {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }
  return response.json() as Promise<DocumentacionResponse>
}

export const DocumentacionService = {
  getMe: async (): Promise<DocumentacionResponse> => {
    return APIService.get<DocumentacionResponse>(`/documentacion/me`)
  },

  upsertMe: async (formData: FormData): Promise<DocumentacionResponse> => {
    const response = await fetch(`${API_BASE_URL}/documentacion/me`, {
      method: 'POST',
      headers: {
        ...authHeaders()
      },
      body: formData
    })

    return requestOrThrow(response)
  },

  downloadRc: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_BASE_URL}/documentacion/me/rc`, {
      headers: {
        ...authHeaders()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const header = response.headers.get('content-disposition') || ''
    const filenameMatch = header.match(/filename="(.+)"/)
    const filename = filenameMatch ? filenameMatch[1] : 'seguro_rc'
    return { blob, filename }
  },

  downloadCarnet: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_BASE_URL}/documentacion/me/carnet`, {
      headers: {
        ...authHeaders()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const header = response.headers.get('content-disposition') || ''
    const filenameMatch = header.match(/filename="(.+)"/)
    const filename = filenameMatch ? filenameMatch[1] : 'carnet_piloto'
    return { blob, filename }
  }
}
