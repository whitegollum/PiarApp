"""Servicio de invitaciones a clubes"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio

from app.models.invitacion import Invitacion
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.utils.security import AuthUtils
from app.services.email_service import EmailService
from app.config import settings


class InvitacionService:
    """Servicio para gestionar invitaciones a clubes"""
    
    DURACION_INVITACION_DIAS = settings.invitation_token_expiry_days
    
    @staticmethod
    def crear_invitacion(
        db: Session,
        club_id: int,
        email: str,
        rol: str = "miembro",
        creado_por_id: Optional[int] = None,
        nombre_completo: Optional[str] = None
    ) -> Optional[Invitacion]:
        """Crea una nueva invitación a un club"""
        
        # Verificar que el club existe
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            return None
        
        # Generar token
        token = AuthUtils.generate_invitation_token()
        
        # Calcular fecha de vencimiento
        fecha_vencimiento = datetime.utcnow() + timedelta(
            days=InvitacionService.DURACION_INVITACION_DIAS
        )
        
        # Buscar si el usuario ya existe
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == email
        ).first()
        
        # Crear invitación
        invitacion = Invitacion(
            club_id=club_id,
            email=email,
            usuario_id=usuario_existente.id if usuario_existente else None,
            rol=rol,
            token=token,
            estado="pendiente",
            creado_por_id=creado_por_id,
            fecha_vencimiento=fecha_vencimiento,
            nombre_completo=nombre_completo
        )
        
        db.add(invitacion)
        db.commit()
        db.refresh(invitacion)
        
        # Enviar email de invitación asincronamente
        try:
            if usuario_existente:
                # Usuario ya existe, enviar invitación simple
                asyncio.create_task(
                    EmailService.enviar_invitacion_club(email, token, club.nombre)
                )
            else:
                # Usuario nuevo, enviar invitación con registro
                asyncio.create_task(
                    EmailService.enviar_bienvenida_nuevo_usuario(
                        email, 
                        nombre_completo or email, 
                        club.nombre, 
                        token
                    )
                )
        except Exception as e:
            # Log el error pero continúa (el usuario puede aceptar la invitación sin email)
            print(f"Error enviando email de invitación: {str(e)}")
        
        return invitacion
    
    @staticmethod
    def obtener_invitaciones_pendientes(
        db: Session,
        email: str
    ) -> List[Invitacion]:
        """Obtiene todas las invitaciones pendientes para un email"""
        
        invitaciones = db.query(Invitacion).filter(
            Invitacion.email == email,
            Invitacion.estado == "pendiente",
            Invitacion.fecha_vencimiento > datetime.utcnow()
        ).all()
        
        return invitaciones
    
    @staticmethod
    def aceptar_invitacion(
        db: Session,
        token: str,
        usuario_id: int
    ) -> bool:
        """Acepta una invitación y crea la membresía del club"""
        
        # Buscar la invitación
        invitacion = db.query(Invitacion).filter(
            Invitacion.token == token,
            Invitacion.estado == "pendiente",
            Invitacion.fecha_vencimiento > datetime.utcnow()
        ).first()
        
        if not invitacion:
            return False
        
        # Verificar que el usuario_id coincida con la invitación
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario or usuario.email != invitacion.email:
            return False
        
        # Actualizar invitación
        invitacion.usuario_id = usuario_id
        invitacion.estado = "aceptada"
        invitacion.fecha_aceptacion = datetime.utcnow()
        
        # Crear membresía en el club
        miembro_existente = db.query(MiembroClub).filter(
            MiembroClub.usuario_id == usuario_id,
            MiembroClub.club_id == invitacion.club_id
        ).first()
        
        if not miembro_existente:
            miembro = MiembroClub(
                usuario_id=usuario_id,
                club_id=invitacion.club_id,
                rol=invitacion.rol,
                estado="activo",
                fecha_aprobacion=datetime.utcnow()
            )
            db.add(miembro)
        else:
            # Si ya la membresía existe, actualizar estado
            miembro_existente.estado = "activo"
            miembro_existente.rol = invitacion.rol
        
        db.commit()
        return True
    
    @staticmethod
    def rechazar_invitacion(db: Session, token: str) -> bool:
        """Rechaza una invitación"""
        
        invitacion = db.query(Invitacion).filter(
            Invitacion.token == token,
            Invitacion.estado == "pendiente"
        ).first()
        
        if not invitacion:
            return False
        
        invitacion.estado = "rechazada"
        db.commit()
        return True
    
    @staticmethod
    def reenviar_invitacion(
        db: Session,
        invitacion_id: int,
        creado_por_id: int
    ) -> Optional[Invitacion]:
        """Reenvia una invitación que expiró o fue rechazada"""
        
        invitacion = db.query(Invitacion).filter(
            Invitacion.id == invitacion_id,
            Invitacion.creado_por_id == creado_por_id
        ).first()
        
        if not invitacion:
            return None
        
        # Solo se puede reenviar si está rechazada o expirada
        if invitacion.estado not in ["rechazada", "expirada"]:
            return None
        
        # Generar nuevo token
        invitacion.token = generate_invitation_token()
        invitacion.estado = "pendiente"
        invitacion.fecha_vencimiento = datetime.utcnow() + timedelta(
            days=InvitacionService.DURACION_INVITACION_DIAS
        )
        
        db.commit()
        db.refresh(invitacion)
        return invitacion
    
    @staticmethod
    def obtener_invitaciones_del_club(
        db: Session,
        club_id: int,
        estado: Optional[str] = None
    ) -> List[Invitacion]:
        """Obtiene todas las invitaciones de un club (para admins)"""
        
        query = db.query(Invitacion).filter(
            Invitacion.club_id == club_id
        )
        
        if estado:
            query = query.filter(Invitacion.estado == estado)
        
        return query.all()
