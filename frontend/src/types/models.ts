export interface UsuarioBasico {
  id: number;
  nombre_completo: string;
  email: string;
}

export interface Noticia {
  id: number;
  club_id: number;
  titulo: string;
  contenido: string;
  categoria?: string;
  imagen_url?: string;
  autor_id: number;
  autor?: UsuarioBasico; // Assuming response structure includes author details if nested
  estado: string;
  visible_para: string;
  permite_comentarios: boolean;
  fecha_creacion: string; // ISO date string
  fecha_actualizacion?: string;
}

export interface NoticiaCreate {
  titulo: string;
  contenido: string;
  categoria?: string;
  imagen_url?: string;
  visible_para?: string;
  permite_comentarios?: boolean;  inscritos_count?: number}

export interface NoticiaUpdate extends Partial(NoticiaCreate) {
  estado?: string;
}

export interface Evento {
  id: number;
  club_id: number;
  nombre: string;
  descripcion: string;
  tipo?: string;
  fecha_inicio: string; // ISO date string
  fecha_fin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  ubicacion?: string;
  contacto_responsable_id?: number;
  estado: string;
  aforo_maximo?: number;
  requisitos?: Record<string, any>; // Dict in python
  imagen_url?: string;
  permite_comentarios: boolean;
  fecha_creacion: string;
  fecha_actualizacion?: string;
}

export interface EventoCreate {
  nombre: string;
  descripcion: string;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  ubicacion?: string;
  aforo_maximo?: number;
  requisitos?: Record<string, any>;
  imagen_url?: string;
  permite_comentarios?: boolean;
}

export interface EventoUpdate extends Partial(EventoCreate) {
  estado?: string;
}

export interface Asistencia {
  id: number;
  evento_id: number;
  usuario_id: number;
  estado: 'inscrito' | 'lista_espera' | 'cancelado';
  fecha_registro: string;
  usuario?: UsuarioBasico;
}

export interface AsistenciaCreate {
  estado: 'inscrito' | 'lista_espera' | 'cancelado';
}
