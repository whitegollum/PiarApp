"""Servicio de autenticación"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.invitacion import Invitacion
from app.utils.security import AuthUtils, generate_invitation_token
from app.schemas.auth import (
    LoginRequest, UsuarioCreate, UsuarioCreateDesdeInvitacion,
    TokenResponse, TokenData
)


class AuthService:
    """Servicio de autenticación"""
    
    @staticmethod
    def registrar_usuario(
        db: Session,
        usuario_create: UsuarioCreate
    ) -> Optional[Usuario]:
        """Registra un nuevo usuario con email y contraseña"""
        # Verificar que el email no exista
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == usuario_create.email
        ).first()
        
        if usuario_existente:
            return None  # Email ya existe
        
        # Crear nuevo usuario
        usuario = Usuario(
            email=usuario_create.email,
            nombre_completo=usuario_create.nombre_completo,
            contraseña_hash=AuthUtils.hash_password(usuario_create.password),
            email_verificado=True,  # Simplificado, en producción verificar email
            activo=True
        )
        
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        return usuario
    
    @staticmethod
    def registrar_desde_invitacion(
        db: Session,
        usuario_create: UsuarioCreateDesdeInvitacion
    ) -> Optional[Tuple[Usuario, str]]:
        """Registra usuario desde invitación y lo vincula al club"""
        # Validar token de invitación
        invitacion = db.query(Invitacion).filter(
            Invitacion.token == usuario_create.invitacion_token,
            Invitacion.estado == "pendiente",
            Invitacion.fecha_vencimiento > datetime.now(timezone.utc)
        ).first()
        
        if not invitacion:
            return None, "Invitación inválida o expirada"
        
        # Verificar que el email coincida
        if invitacion.email != usuario_create.email:
            return None, "El email no coincide con la invitación"
        
        # Verificar que el email no exista
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == usuario_create.email
        ).first()
        
        if usuario_existente:
            return None, "Usuario ya existe con este email"
        
        # Crear usuario
        usuario = Usuario(
            email=usuario_create.email,
            nombre_completo=usuario_create.nombre_completo,
            contraseña_hash=AuthUtils.hash_password(usuario_create.password),
            email_verificado=True,
            activo=True
        )
        
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        
        # Vincular el usuario a la invitación y club
        invitacion.usuario_id = usuario.id
        invitacion.estado = "aceptada"
        invitacion.fecha_aceptacion = datetime.now(timezone.utc)
        
        # Crear membresía del club
        miembro = MiembroClub(
            usuario_id=usuario.id,
            club_id=invitacion.club_id,
            rol=invitacion.rol,
            estado="activo",
            fecha_aprobacion=datetime.now(timezone.utc)
        )
        
        db.add(miembro)
        db.commit()
        
        return usuario, "Usuario registrado y vinculado al club correctamente"
    
    @staticmethod
    def login(
        db: Session,
        login_request: LoginRequest
    ) -> Optional[Usuario]:
        """Verifica credenciales y retorna usuario si son válidas"""
        usuario = db.query(Usuario).filter(
            Usuario.email == login_request.email,
            Usuario.activo == True
        ).first()
        
        if not usuario:
            return None
        
        # Si el usuario solo tiene OAuth, no puede hacer login con contraseña
        if not usuario.contraseña_hash:
            return None
        
        if not AuthUtils.verify_password(
            login_request.password,
            usuario.contraseña_hash
        ):
            return None
        
        # Actualizar último login
        usuario.ultimo_login = datetime.now(timezone.utc)
        db.commit()
        
        return usuario
    
    @staticmethod
    def validar_token(token: str) -> Optional[TokenData]:
        """Valida un token JWT y retorna sus datos"""
        payload = AuthUtils.decode_token(token)
        
        if not payload:
            return None
        
        # Verificar que es un access token (no refresh)
        if payload.get("type") == "refresh":
            return None
        
        user_id = payload.get("user_id")
        email = payload.get("email")
        
        if not user_id or not email:
            return None
        
        return TokenData(
            user_id=user_id,
            email=email,
            club_id=payload.get("club_id")
        )
    
    @staticmethod
    def crear_tokens(
        usuario: Usuario,
        club_id: Optional[int] = None
    ) -> TokenResponse:
        """Crea access y refresh tokens para un usuario"""
        datos_token = {
            "user_id": usuario.id,
            "email": usuario.email,
        }
        
        if club_id:
            datos_token["club_id"] = club_id
        
        access_token = AuthUtils.create_access_token(datos_token)
        refresh_token = AuthUtils.create_refresh_token(datos_token)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int(timedelta(minutes=15).total_seconds())
        )
    
    @staticmethod
    def refrescar_token(db: Session, refresh_token: str) -> Optional[TokenResponse]:
        """Refresca un access token usando un refresh token"""
        payload = AuthUtils.decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None
        
        user_id = payload.get("user_id")
        usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
        
        if not usuario:
            return None
        
        return AuthService.crear_tokens(usuario)
    
    @staticmethod
    def obtener_usuario_por_id(db: Session, user_id: int) -> Optional[Usuario]:
        """Obtiene usuario por ID"""
        return db.query(Usuario).filter(Usuario.id == user_id).first()
    
    @staticmethod
    def obtener_clubes_del_usuario(db: Session, user_id: int):
        """Obtiene los clubes a los que pertenece el usuario"""
        return db.query(MiembroClub).filter(
            MiembroClub.usuario_id == user_id,
            MiembroClub.estado == "activo"
        ).all()
