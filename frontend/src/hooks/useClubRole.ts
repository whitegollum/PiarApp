import { useState, useEffect } from 'react';
import APIService from '../services/api';

export function useClubRole(clubId: string | number | undefined) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchRole = async () => {
      try {
        const id = typeof clubId === 'string' ? parseInt(clubId) : clubId;
        // Fetch role from backend endpoint we just created
        const data = await APIService.get<{ rol: string }>(`/clubes/mi-rol/${id}`);
        if (isMounted) setRole(data.rol);
      } catch (err) {
        console.error("Error fetching role:", err);
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRole();

    return () => { isMounted = false; };
  }, [clubId]);

  return { role, loading, isAdmin: role === 'administrador' };
}
