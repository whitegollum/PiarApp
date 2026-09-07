"""Servicio de Canales - Coordinación de frecuencias entre pilotos"""
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.models.canal import CanalOcupacion
from app.models.invitado import InvitadoSesion
from app.models.usuario import Usuario
from app.schemas.canal import CanalEstado, CanalUsuario, CanalesPanel

logger = logging.getLogger(__name__)

TOTAL_CANALES = 8

# Subfrecuencias válidas por canal canónico: dos frecuencias físicas del mismo
# sistema (DJI O4 FCC) que caen dentro del mismo canal canónico pero no
# interfieren entre sí, por lo que pueden ocuparse/volar simultáneamente.
SUB_CANALES_VALIDOS = {
    5: {"O4-5", "O4-6"},
}


def _es_sub_canal_valido(canal_numero: int, sub_canal: Optional[str]) -> bool:
    if sub_canal is None:
        return True
    return sub_canal in SUB_CANALES_VALIDOS.get(canal_numero, set())


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
                        sub_canal=ocup.sub_canal,
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
                        sub_canal=inv.sub_canal,
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
    def ocupar_canal(
        db: Session,
        club_id: int,
        canal_numero: int,
        usuario_id: int,
        sub_canal: Optional[str] = None,
    ) -> CanalOcupacion:
        """Un usuario ocupa un canal (opcionalmente una subfrecuencia del canal)"""
        if not _es_sub_canal_valido(canal_numero, sub_canal):
            raise ValueError(f"Subfrecuencia '{sub_canal}' no válida para el Canal {canal_numero}")

        # Verificar que no esté ya en este canal/subfrecuencia
        existente = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.canal_numero == canal_numero,
            CanalOcupacion.sub_canal == sub_canal,
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
            sub_canal=sub_canal,
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
            if CanalService.hay_otro_volando(db, club_id, canal_numero, usuario_id, ocupacion.sub_canal):
                return None  # No puede volar, hay otro volando en una frecuencia que interfiere

            ocupacion.en_vuelo = True
            db.commit()
            db.refresh(ocupacion)
            return ocupacion

    @staticmethod
    def hay_otro_volando(
        db: Session,
        club_id: int,
        canal_numero: int,
        excluir_usuario_id: Optional[int],
        mi_sub_canal: Optional[str],
        excluir_invitado_token: Optional[str] = None,
    ) -> bool:
        """
        Comprueba si hay otro piloto (socio o invitado) volando en el mismo canal
        que interfiera con `mi_sub_canal`. Dos subfrecuencias distintas del mismo
        canal (p.ej. O4-5 y O4-6) no interfieren entre sí; cualquier otra
        combinación (misma subfrecuencia, o alguna de las dos sin subfrecuencia)
        sí interfiere.
        """
        def interfiere(otro_sub_canal: Optional[str]) -> bool:
            return mi_sub_canal is None or otro_sub_canal is None or otro_sub_canal == mi_sub_canal

        query_socios = db.query(CanalOcupacion).filter(
            CanalOcupacion.club_id == club_id,
            CanalOcupacion.canal_numero == canal_numero,
            CanalOcupacion.en_vuelo == True,
        )
        if excluir_usuario_id is not None:
            query_socios = query_socios.filter(CanalOcupacion.usuario_id != excluir_usuario_id)
        for otro in query_socios.all():
            if interfiere(otro.sub_canal):
                return True

        query_invitados = db.query(InvitadoSesion).filter(
            InvitadoSesion.club_id == club_id,
            InvitadoSesion.canal_numero == canal_numero,
            InvitadoSesion.en_vuelo == True,
        )
        if excluir_invitado_token is not None:
            query_invitados = query_invitados.filter(InvitadoSesion.token != excluir_invitado_token)
        for otro in query_invitados.all():
            if interfiere(otro.sub_canal):
                return True

        return False

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
