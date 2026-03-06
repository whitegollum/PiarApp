import { APIService } from './api';
import { ProductoAfiliacion, ProductoAfiliacionCreate, ProductoAfiliacionUpdate, ProductoAfiliacionListResponse } from '../types/models';

export const ProductoService = {
  getAll: async (
    clubId: number,
    categoria?: string,
    soloActivos: boolean = true,
    soloDestacados: boolean = false
  ): Promise<ProductoAfiliacionListResponse> => {
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    params.append('solo_activos', String(soloActivos));
    params.append('solo_destacados', String(soloDestacados));
    
    return APIService.get<ProductoAfiliacionListResponse>(
      `/clubes/${clubId}/productos?${params.toString()}`
    );
  },

  getById: async (clubId: number, productoId: number): Promise<ProductoAfiliacion> => {
    return APIService.get<ProductoAfiliacion>(`/clubes/${clubId}/productos/${productoId}`);
  },

  create: async (clubId: number, data: ProductoAfiliacionCreate): Promise<ProductoAfiliacion> => {
    return APIService.post<ProductoAfiliacion>(`/clubes/${clubId}/productos`, data);
  },

  update: async (
    clubId: number,
    productoId: number,
    data: ProductoAfiliacionUpdate
  ): Promise<ProductoAfiliacion> => {
    return APIService.put<ProductoAfiliacion>(`/clubes/${clubId}/productos/${productoId}`, data);
  },

  delete: async (clubId: number, productoId: number): Promise<void> => {
    return APIService.delete(`/clubes/${clubId}/productos/${productoId}`);
  },

  registrarClick: async (clubId: number, productoId: number): Promise<{ clicks: number }> => {
    return APIService.post<{ clicks: number }>(`/clubes/${clubId}/productos/${productoId}/click`, {});
  }
};
