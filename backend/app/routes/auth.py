"""Endpoints de autenticación"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db import get_db
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginRequest, UsuarioCreate, UsuarioCreateDesdeInvitacion,
    TokenResponse, UsuarioResponse, GoogleLoginRequest,
    InvitacionResponse, RefreshTokenRequest
)
from app.services.auth_service import AuthService
from app.services.google_oauth_service import GoogleOAuthService
from app.services.invitacion_service import InvitacionService
from app.utils.security import AuthUtils

router = APIRouter()

# Esquema de OAuth2 para Swagger
security = HTTPBearer()


# ==================== FUNCIONES AUXILIARES ====================

async def oauth2_scheme(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extrae el token del header Authorization"""
    return credentials.credentials


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtiene el usuario actual desde el token JWT"""
    
    token_data = AuthService.validar_token(token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    usuario = AuthService.obtener_usuario_por_id(db, token_data.user_id)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )
    
    return usuario


# ==================== REGISTRO ====================

@router.post("/registro", response_model=dict)
async def registro(
    usuario_create: UsuarioCreate,
    db: Session = Depends(get_db)
):
    """Registrar nuevo usuario con email y contraseña"""
    
    usuario = AuthService.registrar_usuario(db, usuario_create)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    return {
        "message": "Usuario registrado exitosamente",
        "email": usuario.email,
        "id": usuario.id
    }


@router.post("/registrarse-desde-invitacion", response_model=dict)
async def registrarse_desde_invitacion(
    usuario_create: UsuarioCreateDesdeInvitacion,
    db: Session = Depends(get_db)
):
    """Registrar usuario desde invitación a club"""
    
    usuario, mensaje = AuthService.registrar_desde_invitacion(db, usuario_create)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje
        )
    
    # Crear tokens
    tokens = AuthService.crear_tokens(usuario)
    
    return {
        "message": mensaje,
        "usuario": UsuarioResponse.from_orm(usuario),
        "tokens": tokens
    }


# ==================== LOGIN ====================

@router.post("/login", response_model=dict)
async def login(
    login_request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login con email y contraseña"""
    
    usuario = AuthService.login(db, login_request)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña inválidos"
        )
    
    # Crear tokens
    tokens = AuthService.crear_tokens(usuario)
    
    return {
        "usuario": UsuarioResponse.from_orm(usuario),
        "tokens": tokens
    }


@router.post("/google-login", response_model=dict)
async def google_login(
    google_login_request: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """Login con Google OAuth"""
    
    # Validar token de Google
    user_info = await GoogleOAuthService.validar_google_token(
        google_login_request.google_token
    )
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido"
        )
    
    # Obtener o crear usuario
    usuario = GoogleOAuthService.obtener_o_crear_usuario(db, user_info)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear usuario desde Google"
        )
    
    # Crear tokens
    tokens = AuthService.crear_tokens(usuario)
    
    return {
        "usuario": UsuarioResponse.from_orm(usuario),
        "tokens": tokens
    }


# ==================== TOKENS ====================

@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refrescar access token usando refresh token"""
    
    tokens = AuthService.refrescar_token(db, refresh_request.refresh_token)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado"
        )
    
    return tokens


@router.post("/logout")
async def logout():
    """Logout del usuario"""
    # El logout se maneja en el frontend eliminando los tokens
    return {"message": "Logout exitoso"}


# ==================== INVITACIONES ====================

@router.get("/invitaciones/pendientes", response_model=list)
async def ver_invitaciones_pendientes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ver invitaciones pendientes del usuario actual"""
    
    invitaciones = InvitacionService.obtener_invitaciones_pendientes(
        db, current_user.email
    )
    
    return [InvitacionResponse.from_orm(inv) for inv in invitaciones]


@router.post("/invitaciones/aceptar/{token}", response_model=dict)
async def aceptar_invitacion(
    token: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aceptar una invitación a un club"""
    
    success = InvitacionService.aceptar_invitacion(
        db, token, current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitación inválida o expirada"
        )
    
    return {"message": "Invitación aceptada exitosamente"}


@router.post("/invitaciones/rechazar/{token}", response_model=dict)
async def rechazar_invitacion(
    token: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rechazar una invitación"""
    
    success = InvitacionService.rechazar_invitacion(db, token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitación inválida"
        )
    
    return {"message": "Invitación rechazada"}


# ==================== USUARIOS ====================

@router.get("/usuarios/me", response_model=UsuarioResponse)
async def get_usuario_actual(
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener datos del usuario actual"""
    return UsuarioResponse.from_orm(current_user)


@router.put("/usuarios/me", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_update: dict,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar datos del usuario actual"""
    
    if "nombre_completo" in usuario_update:
        current_user.nombre_completo = usuario_update["nombre_completo"]
    
    db.commit()
    db.refresh(current_user)
    
    return UsuarioResponse.from_orm(current_user)


@router.post("/usuarios/cambiar-contraseña", response_model=dict)
async def cambiar_contraseña(
    contraseña_data: dict,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña del usuario actual"""
    
    contraseña_actual = contraseña_data.get("contraseña_actual")
    contraseña_nueva = contraseña_data.get("contraseña_nueva")
    
    # Verificar contraseña actual
    if not current_user.contraseña_hash or not AuthUtils.verify_password(
        contraseña_actual,
        current_user.contraseña_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual inválida"
        )
    
    # Actualizar contraseña
    current_user.contraseña_hash = AuthUtils.hash_password(contraseña_nueva)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}
