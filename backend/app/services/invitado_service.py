"""Servicio de Invitados - Sesiones por QR sin autenticación"""
import uuid
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.invitado import InvitadoSesion
from app.models.club import Club
from app.services.canal_service import CanalService, _es_sub_canal_valido
from app.services.nombre_generator import generar_nombre_cerdo

logger = logging.getLogger(__name__)


class InvitadoService:

    @staticmethod
    def obtener_club_por_token_qr(db: Session, token_qr: str) -> Club | None:
        return db.query(Club).filter(Club.token_qr == token_qr).first()

    @staticmethod
    def unirse(
        db: Session,
        token_qr: str,
        nombre: str | None,
        token_existente: str | None,
    ) -> InvitadoSesion:
        """Crea o recupera una sesión de invitado para el club identificado por token_qr."""
        club = InvitadoService.obtener_club_por_token_qr(db, token_qr)
        if not club:
            raise ValueError("QR inválido o club no encontrado")

        # Recuperar sesión existente si el dispositivo ya tiene una
        if token_existente:
            sesion = db.query(InvitadoSesion).filter(
                InvitadoSesion.token == token_existente,
                InvitadoSesion.club_id == club.id,
            ).first()
            if sesion:
                sesion.last_active = datetime.utcnow()
                db.commit()
                db.refresh(sesion)
                return sesion

        nombre_final = (
            f"Cerdo {nombre.strip().capitalize()}"
            if nombre and nombre.strip()
            else generar_nombre_cerdo()
        )

        sesion = InvitadoSesion(
            token=str(uuid.uuid4()),
            club_id=club.id,
            nombre=nombre_final,
            canal_numero=None,
            en_vuelo=False,
        )
        db.add(sesion)
        db.commit()
        db.refresh(sesion)
        return sesion

    @staticmethod
    def obtener_sesion(db: Session, token: str, club_id: int) -> InvitadoSesion | None:
        return db.query(InvitadoSesion).filter(
            InvitadoSesion.token == token,
            InvitadoSesion.club_id == club_id,
        ).first()

    @staticmethod
    def _ping(db: Session, sesion: InvitadoSesion):
        sesion.last_active = datetime.utcnow()
        db.commit()

    @staticmethod
    def ocupar_canal(
        db: Session,
        sesion: InvitadoSesion,
        canal_numero: int,
        sub_canal: str | None = None,
    ) -> InvitadoSesion:
        """Ocupa un canal (opcionalmente una subfrecuencia), liberando automáticamente el anterior si lo hubiera."""
        if not _es_sub_canal_valido(canal_numero, sub_canal):
            raise ValueError(f"Subfrecuencia '{sub_canal}' no válida para el Canal {canal_numero}")

        sesion.canal_numero = canal_numero
        sesion.sub_canal = sub_canal
        sesion.en_vuelo = False
        sesion.last_active = datetime.utcnow()
        db.commit()
        db.refresh(sesion)
        return sesion

    @staticmethod
    def liberar_canal(db: Session, sesion: InvitadoSesion) -> InvitadoSesion:
        sesion.canal_numero = None
        sesion.sub_canal = None
        sesion.en_vuelo = False
        sesion.last_active = datetime.utcnow()
        db.commit()
        db.refresh(sesion)
        return sesion

    @staticmethod
    def toggle_vuelo(db: Session, sesion: InvitadoSesion) -> InvitadoSesion:
        if sesion.canal_numero is None:
            raise ValueError("No estás en ningún canal")

        if sesion.en_vuelo:
            sesion.en_vuelo = False
        else:
            if CanalService.hay_otro_volando(
                db,
                sesion.club_id,
                sesion.canal_numero,
                excluir_usuario_id=None,
                mi_sub_canal=sesion.sub_canal,
                excluir_invitado_token=sesion.token,
            ):
                raise ValueError("Hay otro piloto volando en este canal")

            sesion.en_vuelo = True

        sesion.last_active = datetime.utcnow()
        db.commit()
        db.refresh(sesion)
        return sesion

    @staticmethod
    def limpiar_sesiones_inactivas(db: Session, horas: int = 24) -> int:
        """Elimina sesiones con last_active más antigua que `horas` horas."""
        cutoff = datetime.utcnow() - timedelta(hours=horas)
        count = db.query(InvitadoSesion).filter(
            InvitadoSesion.last_active < cutoff
        ).delete()
        db.commit()
        logger.info(f"Limpieza de invitados: {count} sesiones eliminadas (inactivas > {horas}h)")
        return count
