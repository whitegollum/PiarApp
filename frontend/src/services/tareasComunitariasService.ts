/**
 * Servicio de Tareas Comunitarias - API frontend
 */
import { APIService } from './api'

// Types
export interface TareaComunitaria {
  id: number
  club_id: number
  titulo: string
  descripcion?: string
  puntos: number
  categoria?: string
  prioridad: string
  fecha_limite?: string
  max_participantes?: number
  estado: string
  motivo_rechazo?: string
  creador_id: number
  created_at?: string
  updated_at?: string
  participantes: ParticipanteTarea[]
  num_participantes: number
}

export interface ParticipanteTarea {
  id: number
  tarea_id: number
  usuario_id: number
  fecha_inscripcion?: string
  puntos_otorgados: boolean
  nombre_usuario?: string
}

export interface TareaCreate {
  titulo: string
  descripcion?: string
  puntos: number
  categoria?: string
  prioridad?: string
  fecha_limite?: string
  max_participantes?: number
}

export interface TareaUpdate {
  titulo?: string
  descripcion?: string
  puntos?: number
  categoria?: string
  prioridad?: string
  fecha_limite?: string
  max_participantes?: number
  estado?: string
}

export interface RankingEntry {
  usuario_id: number
  nombre: string
  puntos_totales: number
  posicion: number
}

export interface PeriodoPremios {
  id: number
  club_id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tipo: string
  estado: string
  created_at?: string
  premios: Premio[]
}

export interface PeriodoPremiosCreate {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tipo: string
}

export interface Premio {
  id: number
  periodo_id: number
  club_id: number
  nombre: string
  descripcion?: string
  posicion: number
  usuario_id?: number
  nombre_usuario?: string
  confirmado: boolean
  created_at?: string
}

export interface PremioCreate {
  nombre: string
  descripcion?: string
  posicion: number
}

// ==================== TAREAS ====================

export class TareasService {
  static async listar(clubId: number, filtros?: { estado?: string; categoria?: string; prioridad?: string }): Promise<TareaComunitaria[]> {
    const params = new URLSearchParams()
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.categoria) params.append('categoria', filtros.categoria)
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad)
    const query = params.toString() ? `?${params.toString()}` : ''
    return APIService.get<TareaComunitaria[]>(`/clubes/${clubId}/tareas-comunitarias${query}`)
  }

  static async obtener(clubId: number, tareaId: number): Promise<TareaComunitaria> {
    return APIService.get<TareaComunitaria>(`/clubes/${clubId}/tareas-comunitarias/${tareaId}`)
  }

  static async crear(clubId: number, data: TareaCreate): Promise<TareaComunitaria> {
    return APIService.post<TareaComunitaria>(`/clubes/${clubId}/tareas-comunitarias`, data)
  }

  static async actualizar(clubId: number, tareaId: number, data: TareaUpdate): Promise<TareaComunitaria> {
    return APIService.put<TareaComunitaria>(`/clubes/${clubId}/tareas-comunitarias/${tareaId}`, data)
  }

  static async eliminar(clubId: number, tareaId: number): Promise<void> {
    return APIService.delete(`/clubes/${clubId}/tareas-comunitarias/${tareaId}`)
  }

  static async inscribirse(clubId: number, tareaId: number): Promise<any> {
    return APIService.post(`/clubes/${clubId}/tareas-comunitarias/${tareaId}/inscribirse`)
  }

  static async desinscribirse(clubId: number, tareaId: number): Promise<any> {
    return APIService.delete(`/clubes/${clubId}/tareas-comunitarias/${tareaId}/inscribirse`)
  }

  static async aprobar(clubId: number, tareaId: number): Promise<any> {
    return APIService.post(`/clubes/${clubId}/tareas-comunitarias/${tareaId}/aprobar`)
  }

  static async rechazar(clubId: number, tareaId: number, motivo: string): Promise<any> {
    return APIService.post(`/clubes/${clubId}/tareas-comunitarias/${tareaId}/rechazar`, { motivo })
  }
}

// ==================== RANKING ====================

export class RankingService {
  static async obtener(clubId: number): Promise<RankingEntry[]> {
    return APIService.get<RankingEntry[]>(`/clubes/${clubId}/ranking`)
  }

  static async obtenerPorPeriodo(clubId: number, periodoId: number): Promise<RankingEntry[]> {
    return APIService.get<RankingEntry[]>(`/clubes/${clubId}/ranking/periodo/${periodoId}`)
  }
}

// ==================== PERIODOS Y PREMIOS ====================

export class PremiosService {
  static async listarPeriodos(clubId: number): Promise<PeriodoPremios[]> {
    return APIService.get<PeriodoPremios[]>(`/clubes/${clubId}/periodos-premios`)
  }

  static async obtenerPeriodo(clubId: number, periodoId: number): Promise<PeriodoPremios> {
    return APIService.get<PeriodoPremios>(`/clubes/${clubId}/periodos-premios/${periodoId}`)
  }

  static async crearPeriodo(clubId: number, data: PeriodoPremiosCreate): Promise<PeriodoPremios> {
    return APIService.post<PeriodoPremios>(`/clubes/${clubId}/periodos-premios`, data)
  }

  static async cerrarPeriodo(clubId: number, periodoId: number): Promise<any> {
    return APIService.post(`/clubes/${clubId}/periodos-premios/${periodoId}/cerrar`)
  }

  static async confirmarPremios(clubId: number, periodoId: number): Promise<any> {
    return APIService.post(`/clubes/${clubId}/periodos-premios/${periodoId}/confirmar`)
  }

  static async crearPremio(clubId: number, periodoId: number, data: PremioCreate): Promise<Premio> {
    return APIService.post<Premio>(`/clubes/${clubId}/periodos-premios/${periodoId}/premios`, data)
  }
}
