"""Servicio de Canales - Coordinación de frecuencias entre pilotos"""
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.models.canal import CanalOcupacion
from app.models.invitado import InvitadoSesion
from app.models.usuario import Usuario
from app.schemas.canal import CanalEstado, CanalUsuario, CanalesPanel

logger = logging.getLogger(__name__)

TOTAL_CANALES = 8


class CanalService:
    """Servicio para gestión de canales de vuelo"""

    @staticmethod
    def obtener_panel(db: Session, club_id: int) -> CanalesPanel:
        """Obtener el estado completo del panel de canales (socios + invitados)"""
        ocupaciones = db.query(CanalOcupacion, Usuario.nombre_completo).join(
            Usuario, CanalOcupacion.usuario_id == Usuario.id
        ).filter(
            CanalOcupacion.club_id == club_id
        ).all()

        invitados = db.query(InvitadoSesion).filter(
            InvitadoSesion.club_id == club_id,
            InvitadoSesion.canal_numero.isnot(None),
        ).all()

        # Construir estado por canal
        canales = []
        for num in range(1, TOTAL_CANALES + 1):
            usuarios_canal = []
            en_vuelo = False
            piloto_volando = None

            for ocup, nombre_usuario in ocupaciones:
                if ocup.canal_numero == num:
                    usuarios_canal.append(CanalUsuario(
                        usuario_id=ocup.usuario_id,
                        nombre=nombre_usuario,
                        en_vuelo=ocup.en_vuelo,
                        es_invitado=False,
                    ))
                    if ocup.en_vuelo:
                        en_vuelo = True
                        piloto_volando = nombre_usuario

            for inv in invitados:
                if inv.canal_numero == num:
                    usuarios_canal.append(CanalUsuario(
                        usuario_id=0,
                        nombre=inv.nombre,
                        en_vuelo=inv.en_vuelo,
                        es_invitado=True,
                    ))
                    if inv.en_vuelo:
                        en_vuelo = True
                        piloto_volando = inv.nombre

            canales.append(CanalEstado(
                canal_numero=num,
                usuarios=usuarios_canal,
                en_vuelo=en_vuelo,
                piloto_volando=piloto_volando,
            ))

        return CanalesPanel(canales=canales)

    @staticmethod
    def ocupar_canal(db: Session, club_id: int, canal_numero: int, usuario_id: int) -> CanalOcupacion:
        """Un usuario ocupa un canal"""
        # Verificar que no esté ya en este canal
        existente = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.canal_numero == canal_numero,
            CanalOcupacion.usuario_id == usuario_id
        ).first()

        if existente:
            return existente

        # Verificar que no esté en otro canal del mismo club
        en_otro_canal = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.usuario_id == usuario_id
        ).first()

        if en_otro_canal:
            raise ValueError(f"Ya estás en el Canal {en_otro_canal.canal_numero}. Sal de él antes de entrar en otro.")

        ocupacion = CanalOcupacion(
            club_id=club_id,
            canal_numero=canal_numero,
            usuario_id=usuario_id,
            en_vuelo=False
        )
        db.add(ocupacion)
        db.commit()
        db.refresh(ocupacion)
        return ocupacion

    @staticmethod
    def liberar_canal(db: Session, club_id: int, canal_numero: int, usuario_id: int) -> bool:
        """Un usuario libera un canal (deja de ocuparlo)"""
        ocupacion = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.canal_numero == canal_numero,
            CanalOcupacion.usuario_id == usuario_id
        ).first()

        if not ocupacion:
            return False

        db.delete(ocupacion)
        db.commit()
        return True

    @staticmethod
    def toggle_vuelo(db: Session, club_id: int, canal_numero: int, usuario_id: int) -> Optional[CanalOcupacion]:
        """Toggle del estado de vuelo en un canal"""
        ocupacion = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.canal_numero == canal_numero,
            CanalOcupacion.usuario_id == usuario_id
        ).first()

        if not ocupacion:
            return None

        if ocupacion.en_vuelo:
            # El piloto que está volando libera el canal
            ocupacion.en_vuelo = False
            db.commit()
            db.refresh(ocupacion)
            return ocupacion
        else:
            # Verificar que no haya otro piloto volando en este canal
            otro_volando = db.query(CanalOcupacion).filter(
                CanalOcupacion.club_id == club_id,
                CanalOcupacion.canal_numero == canal_numero,
                CanalOcupacion.en_vuelo == True,
                CanalOcupacion.usuario_id != usuario_id
            ).first()

            if otro_volando:
                return None  # No puede volar, hay otro volando

            ocupacion.en_vuelo = True
            db.commit()
            db.refresh(ocupacion)
            return ocupacion

    @staticmethod
    def reset_canales(db: Session, club_id: int) -> int:
        """Resetear todos los canales de un club (eliminar todas las ocupaciones)"""
        count = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id
        ).delete()
        db.commit()
        return count

    @staticmethod
    def reset_todos_los_clubes(db: Session) -> int:
        """Resetear canales de todos los clubes (para el job diario)"""
        count = db.query(CanalOcupacion).delete()
        db.commit()
        logger.info(f"Reset diario de canales: {count} ocupaciones eliminadas")
        return count
