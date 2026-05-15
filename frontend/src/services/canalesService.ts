/**
 * Servicio de Canales - Coordinación de frecuencias de vuelo
 */
import { APIService } from './api'

export interface CanalUsuario {
  usuario_id: number
  nombre: string
  en_vuelo: boolean
  es_invitado: boolean
}

export interface CanalEstado {
  canal_numero: number
  usuarios: CanalUsuario[]
  en_vuelo: boolean
  piloto_volando: string | null
}

export interface CanalesPanel {
  canales: CanalEstado[]
}

export const CanalesService = {
  obtenerPanel: (clubId: number): Promise<CanalesPanel> =>
    APIService.get<CanalesPanel>(`/clubes/${clubId}/canales`),

  ocuparCanal: (clubId: number, canalNumero: number): Promise<CanalesPanel> =>
    APIService.post<CanalesPanel>(`/clubes/${clubId}/canales/${canalNumero}/ocupar`),

  liberarCanal: (clubId: number, canalNumero: number): Promise<CanalesPanel> =>
    APIService.post<CanalesPanel>(`/clubes/${clubId}/canales/${canalNumero}/liberar`),

  toggleVuelo: (clubId: number, canalNumero: number): Promise<CanalesPanel> =>
    APIService.post<CanalesPanel>(`/clubes/${clubId}/canales/${canalNumero}/vuelo`),
}
