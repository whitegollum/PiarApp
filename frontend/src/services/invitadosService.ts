/**
 * Servicio de Invitados - Acceso por QR sin autenticación
 */
import { CanalesPanel } from './canalesService'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de red' }))
    throw new Error(err.detail ?? 'Error desconocido')
  }
  return res.json()
}

export interface InvitadoSesion {
  token: string
  club_id: number
  nombre: string
  canal_numero: number | null
  en_vuelo: boolean
}

export interface CanalesPanelInvitado extends CanalesPanel {
  mi_canal: number | null
  en_vuelo: boolean
  mi_nombre: string
}

export interface QRInvitadoResponse {
  token_qr: string
  url: string
}

const LS_KEY = (clubId: number) => `invitado_token_club_${clubId}`

export const InvitadosService = {
  /** Llamada por el socio para obtener la URL del QR (requiere JWT en cabecera) */
  obtenerQR: (clubId: number, jwtToken: string): Promise<QRInvitadoResponse> =>
    fetch(`${API_BASE}/clubes/${clubId}/qr-invitado`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
    }).then(async (r) => {
      if (!r.ok) throw new Error('Error al obtener QR')
      return r.json()
    }),

  /** Unirse como invitado usando el token_qr del club */
  unirse: (tokenQr: string, nombre: string | null): Promise<InvitadoSesion> => {
    const lsToken = localStorage.getItem(`invitado_token_qr_${tokenQr}`)
    return apiFetch<InvitadoSesion>('/invitados/unirse', {
      method: 'POST',
      body: JSON.stringify({
        token_qr: tokenQr,
        nombre: nombre || null,
        token_existente: lsToken ?? null,
      }),
    }).then((sesion) => {
      // Persist token in localStorage keyed by token_qr and by club_id
      localStorage.setItem(`invitado_token_qr_${tokenQr}`, sesion.token)
      localStorage.setItem(LS_KEY(sesion.club_id), sesion.token)
      return sesion
    })
  },

  /** Panel de canales enriquecido con estado personal del invitado */
  obtenerPanel: (token: string, clubId: number): Promise<CanalesPanelInvitado> =>
    apiFetch<CanalesPanelInvitado>(`/invitados/${token}/clubes/${clubId}/canales`),

  ocuparCanal: (token: string, clubId: number, canalNumero: number): Promise<CanalesPanelInvitado> =>
    apiFetch<CanalesPanelInvitado>(
      `/invitados/${token}/clubes/${clubId}/canales/${canalNumero}/ocupar`,
      { method: 'POST' },
    ),

  liberarCanal: (token: string, clubId: number): Promise<CanalesPanelInvitado> =>
    apiFetch<CanalesPanelInvitado>(`/invitados/${token}/clubes/${clubId}/liberar`, {
      method: 'POST',
    }),

  toggleVuelo: (token: string, clubId: number): Promise<CanalesPanelInvitado> =>
    apiFetch<CanalesPanelInvitado>(`/invitados/${token}/clubes/${clubId}/vuelo`, {
      method: 'POST',
    }),

  cambiarNombre: (token: string, clubId: number, nombre: string | null): Promise<InvitadoSesion> =>
    apiFetch<InvitadoSesion>(`/invitados/${token}/clubes/${clubId}/nombre`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre: nombre || null }),
    }),

  /** Recupera el token almacenado para un club */
  tokenGuardado: (clubId: number): string | null =>
    localStorage.getItem(LS_KEY(clubId)),
}
