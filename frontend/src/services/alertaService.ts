import { Alerta, AlertaListResponse, AlertaCountResponse, AlertasConfig } from '../types/alerta';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Servicio para gestión de alertas
 */
export const alertaService = {
  /**
   * Obtener alertas del club (solo admins)
   */
  async obtenerAlertasClub(
    clubId: number,
    filtros?: {
      tipo?: string;
      subtipo?: string;
      severidad?: string;
      estado?: string;
      usuario_id?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<AlertaListResponse> {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        // Solo agregar si tiene valor (no undefined, null, o string vacío)
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await fetch(
      `${API_URL}/clubs/${clubId}/alertas?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Obtener contador de alertas (para badge)
   */
  async obtenerContadorAlertas(clubId: number): Promise<AlertaCountResponse> {
    const response = await fetch(`${API_URL}/clubs/${clubId}/alertas/count`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener contador de alertas');
    }

    return response.json();
  },

  /**
   * Generar/actualizar alertas del club (solo admins)
   */
  async generarAlertasClub(clubId: number): Promise<any> {
    const response = await fetch(`${API_URL}/clubs/${clubId}/alertas/generar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Resolver o ignorar alerta
   */
  async accionarAlerta(
    alertaId: number,
    accion: 'resolver' | 'ignorar'
  ): Promise<any> {
    const response = await fetch(`${API_URL}/alertas/${alertaId}/resolver`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accion }),
    });

    if (!response.ok) {
      throw new Error(`Error al ${accion} alerta`);
    }

    return response.json();
  },

  /**
   * Obtener alertas del usuario autenticado
   */
  async obtenerMisAlertas(clubId?: number): Promise<Alerta[]> {
    const params = clubId ? `?club_id=${clubId}` : '';
    const response = await fetch(`${API_URL}/alertas/mis-alertas${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener mis alertas');
    }

    return response.json();
  },

  /**
   * Obtener mapa de alertas activas por usuario para un club
   * Útil para mostrar indicadores en lista de miembros
   */
  async obtenerAlertasPorUsuario(clubId: number): Promise<Record<number, number>> {
    const response = await fetch(`${API_URL}/clubs/${clubId}/alertas?estado=activa&limit=1000`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener alertas');
    }

    const data: AlertaListResponse = await response.json();
    
    // Crear mapa de usuario_id -> cantidad de alertas
    const mapaAlertas: Record<number, number> = {};
    data.alertas.forEach((alerta) => {
      mapaAlertas[alerta.usuario_id] = (mapaAlertas[alerta.usuario_id] || 0) + 1;
    });

    return mapaAlertas;
  },

  /**
   * Obtener configuración de alertas del club
   */
  async obtenerConfigAlertas(clubId: number): Promise<AlertasConfig> {
    const response = await fetch(`${API_URL}/clubs/${clubId}/alertas/config`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener configuración de alertas');
    }

    return response.json();
  },

  /**
   * Actualizar configuración de alertas del club
   */
  async actualizarConfigAlertas(
    clubId: number,
    config: AlertasConfig
  ): Promise<any> {
    const response = await fetch(`${API_URL}/clubs/${clubId}/alertas/config`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar configuración de alertas');
    }

    return response.json();
  },
};
