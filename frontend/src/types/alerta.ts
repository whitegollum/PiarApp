export type SeveridadAlerta = 'warning' | 'danger' | 'critical';
export type EstadoAlerta = 'activa' | 'resuelta' | 'ignorada';
export type TipoAlerta = 'documento_ausente' | 'documento_por_vencer' | 'documento_vencido' | 'cuota_pendiente' | 'evento_proximo';
export type SubtipoAlerta = 'carnet_piloto' | 'seguro_rc' | 'cuota_mensual' | 'cuota_anual';

export interface UsuarioAlertaInfo {
  id: number;
  nombre: string;
  email: string;
}

export interface Alerta {
  id: number;
  club_id: number;
  usuario_id: number;
  tipo: TipoAlerta;
  subtipo?: SubtipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  descripcion?: string;
  fecha_referencia?: string;
  estado: EstadoAlerta;
  notificado_usuario: boolean;
  fecha_creacion: string;
  fecha_actualizacion?: string;
  usuario?: UsuarioAlertaInfo;
}

export interface AlertaListResponse {
  alertas: Alerta[];
  total: number;
}

export interface AlertaCountResponse {
  total: number;
  warning: number;
  danger: number;
  critical: number;
}

export interface AlertasConfig {
  alertas_documentacion_enabled: boolean;
  alertas_doc_ausente_enabled: boolean;
  dias_aviso_previo: number;
  dias_critico: number;
}
