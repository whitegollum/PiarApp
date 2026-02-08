"""Servicio de Google OAuth 2.0"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import httpx

from app.config import settings
from app.models.usuario import Usuario
from app.models.token_google import TokenGoogle


class GoogleOAuthService:
    """Servicio para autenticación con Google OAuth 2.0"""
    
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    @staticmethod
    async def validar_google_token(google_token: str) -> Optional[Dict[str, Any]]:
        """Valida un token de Google y obtiene la información del usuario"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    GoogleOAuthService.GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {google_token}"},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                user_info = response.json()
                return user_info
        except Exception:
            return None
    
    @staticmethod
    def obtener_o_crear_usuario(
        db: Session,
        google_user_info: Dict[str, Any]
    ) -> Optional[Usuario]:
        """Obtiene usuario existente o crea uno nuevo desde datos de Google"""
        
        google_id = google_user_info.get("id")
        email = google_user_info.get("email")
        nombre = google_user_info.get("name")
        photo_url = google_user_info.get("picture")
        
        if not google_id or not email:
            return None
        
        # Buscar usuario existente por google_id
        usuario = db.query(Usuario).filter(
            Usuario.google_id == google_id
        ).first()
        
        if usuario:
            return usuario
        
        # Buscar usuario existente por email (para vincular)
        usuario = db.query(Usuario).filter(
            Usuario.email == email
        ).first()
        
        if usuario:
            # Vincular Google al usuario existente
            usuario.google_id = google_id
            usuario.google_email = email
            usuario.google_photo_url = photo_url
            db.commit()
            return usuario
        
        # Crear nuevo usuario desde Google
        usuario = Usuario(
            email=email,
            nombre_completo=nombre or email.split("@")[0],
            google_id=google_id,
            google_email=email,
            google_photo_url=photo_url,
            email_verificado=True,  # Google ya verifica email
            activo=True
        )
        
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        return usuario
    
    @staticmethod
    def guardar_tokens_google(
        db: Session,
        usuario_id: int,
        access_token: str,
        refresh_token: Optional[str],
        expires_in: int
    ) -> TokenGoogle:
        """Guarda tokens de Google para el usuario"""
        
        # Eliminar tokens anteriores si existen
        db.query(TokenGoogle).filter(
            TokenGoogle.usuario_id == usuario_id
        ).delete()
        
        # Calcular fecha de expiración
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Crear nuevo token
        token_google = TokenGoogle(
            usuario_id=usuario_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at
        )
        
        db.add(token_google)
        db.commit()
        db.refresh(token_google)
        return token_google
    
    @staticmethod
    def obtener_token_google(db: Session, usuario_id: int) -> Optional[TokenGoogle]:
        """Obtiene el token guardado de Google para un usuario"""
        return db.query(TokenGoogle).filter(
            TokenGoogle.usuario_id == usuario_id
        ).first()
    
    @staticmethod
    def vincular_google(
        db: Session,
        usuario_id: int,
        google_token: str
    ) -> bool:
        """Vincula una cuenta de Google a un usuario existente"""
        
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            return False
        
        # Aquí irían pasos adicionales de validación
        # Por ahora asumimos que el token ya fue validado
        return True
    
    @staticmethod
    def desvincular_google(db: Session, usuario_id: int) -> bool:
        """Desvincula Google de un usuario"""
        
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            return False
        
        usuario.google_id = None
        usuario.google_email = None
        usuario.google_photo_url = None
        
        # Eliminar tokens guardados
        db.query(TokenGoogle).filter(
            TokenGoogle.usuario_id == usuario_id
        ).delete()
        
        db.commit()
        return True
