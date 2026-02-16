import { APIService } from './api';
import { Noticia, NoticiaCreate, NoticiaUpdate, Evento, EventoCreate, EventoUpdate, Asistencia, Comentario } from '../types/models';

export const NewsService = {
  getAll: async (clubId: number, skip: number = 0, limit: number = 10): Promise<Noticia[]> => {
    return APIService.get<Noticia[]>(`/clubes/${clubId}/noticias?skip=${skip}&limit=${limit}`);
  },

  getById: async (clubId: number, noticiaId: number): Promise<Noticia> => {
    return APIService.get<Noticia>(`/clubes/${clubId}/noticias/${noticiaId}`);
  },

  create: async (clubId: number, data: NoticiaCreate): Promise<Noticia> => {
    return APIService.post<Noticia>(`/clubes/${clubId}/noticias`, data);
  },

  update: async (clubId: number, noticiaId: number, data: NoticiaUpdate): Promise<Noticia> => {
    return APIService.put<Noticia>(`/clubes/${clubId}/noticias/${noticiaId}`, data);
  },

  delete: async (clubId: number, noticiaId: number): Promise<void> => {
    return APIService.delete(`/clubes/${clubId}/noticias/${noticiaId}`);
  },

  getComments: async (clubId: number, noticiaId: number): Promise<Comentario[]> => {
    return APIService.get<Comentario[]>(`/clubes/${clubId}/noticias/${noticiaId}/comentarios`);
  },

  postComment: async (clubId: number, noticiaId: number, contenido: string): Promise<Comentario> => {
    return APIService.post<Comentario>(`/clubes/${clubId}/noticias/${noticiaId}/comentarios`, { contenido });
  },

  deleteComment: async (clubId: number, noticiaId: number, comentarioId: number): Promise<void> => {
    return APIService.delete(`/clubes/${clubId}/noticias/${noticiaId}/comentarios/${comentarioId}`);
  }
};

export const EventService = {
  getAll: async (clubId: number, skip: number = 0, limit: number = 20): Promise<Evento[]> => {
    return APIService.get<Evento[]>(`/clubes/${clubId}/eventos?skip=${skip}&limit=${limit}`);
  },

  getById: async (clubId: number, eventoId: number): Promise<Evento> => {
    return APIService.get<Evento>(`/clubes/${clubId}/eventos/${eventoId}`);
  },

  create: async (clubId: number, data: EventoCreate): Promise<Evento> => {
    return APIService.post<Evento>(`/clubes/${clubId}/eventos`, data);
  },

  update: async (clubId: number, eventoId: number, data: EventoUpdate): Promise<Evento> => {
    return APIService.put<Evento>(`/clubes/${clubId}/eventos/${eventoId}`, data);
  },

  delete: async (clubId: number, eventoId: number): Promise<void> => {
    return APIService.delete(`/clubes/${clubId}/eventos/${eventoId}`);
  },

  registerAttendance: async (clubId: number, eventoId: number, estado: 'inscrito' | 'cancelado'): Promise<Asistencia> => {
     return APIService.post<Asistencia>(`/clubes/${clubId}/eventos/${eventoId}/asistencia`, { estado });
  },

  getMyAttendance: async (clubId: number, eventoId: number): Promise<Asistencia> => {
    return APIService.get<Asistencia>(`/clubes/${clubId}/eventos/${eventoId}/mi-asistencia`);
  },

  getAttendees: async (clubId: number, eventoId: number): Promise<Asistencia[]> => {
    return APIService.get<Asistencia[]>(`/clubes/${clubId}/eventos/${eventoId}/asistencia`);
  }
};
