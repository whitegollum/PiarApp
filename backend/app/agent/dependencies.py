from fastapi import Depends, HTTPException, status
from app.routes.auth import get_current_user
from app.models.usuario import Usuario


async def get_current_superadmin(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """Dependency que verifica que el usuario sea superadmin."""
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los superadministradores pueden acceder a esta función",
        )
    return current_user
