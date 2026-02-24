import { APIService } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Socio {
  id: number;
  club_id: number;
  usuario_id: number;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string; // ISO string
  direccion?: string;
  especialidades?: string[];
  estado: string;
  tiene_foto: boolean;
  fecha_alta: string;
}

export interface SocioCreate {
  club_id: number;
  usuario_id: number;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  especialidades?: string[];
  estado?: string;
}

export interface SocioUpdate {
  nombre?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  especialidades?: string[];
  estado?: string;
}

const SocioService = {
  getSociosByClub: async (clubId: number): Promise<Socio[]> => {
    return APIService.get<Socio[]>(`/socios/?club_id=${clubId}`);
  },

  getSocioById: async (socioId: number): Promise<Socio> => {
    return APIService.get<Socio>(`/socios/${socioId}`);
  },

  createSocio: async (data: SocioCreate): Promise<Socio> => {
    return APIService.post<Socio>(`/socios/`, data);
  },

  updateSocio: async (socioId: number, data: SocioUpdate): Promise<Socio> => {
    return APIService.put<Socio>(`/socios/${socioId}`, data);
  },

  uploadFoto: async (socioId: number, file: File): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/socios/${socioId}/foto`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
  },
  
  fetchFotoBlob: async (socioId: number): Promise<string> => {
      const token = localStorage.getItem('access_token');
      try {
        const response = await fetch(`${API_BASE_URL}/socios/${socioId}/foto`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
          console.error("Error fetching photo", error);
          return '';
      }
  }
};

export default SocioService;
