"""Servicio de Tareas Comunitarias - Lógica de negocio"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime
from typing import List, Optional, Dict

from app.models.tareas_comunitarias import (
    TareaComunitaria, ParticipanteTarea, PuntuacionUsuario,
    PeriodoPremios, Premio, EstadoTarea, EstadoPeriodo
)
from app.models.alerta import Alerta
from app.models.usuario import Usuario
from app.schemas.tareas_comunitarias import (
    TareaComunitariaCreate, TareaComunitariaUpdate,
    PeriodoPremiosCreate, PremioCreate, RankingEntry
)


class TareasComunitariasService:
    """Servicio para gestión de tareas comunitarias"""

    @staticmethod
    def crear_tarea(db: Session, club_id: int, data: TareaComunitariaCreate, creador_id: int) -> TareaComunitaria:
        tarea = TareaComunitaria(
            club_id=club_id,
            titulo=data.titulo,
            descripcion=data.descripcion,
            puntos=data.puntos,
            categoria=data.categoria,
            prioridad=data.prioridad,
            fecha_limite=data.fecha_limite,
            max_participantes=data.max_participantes,
            estado=EstadoTarea.ABIERTA.value,
            creador_id=creador_id
        )
        db.add(tarea)
        db.commit()
        db.refresh(tarea)
        return tarea

    @staticmethod
    def listar_tareas(
        db: Session, club_id: int,
        estado: Optional[str] = None,
        categoria: Optional[str] = None,
        prioridad: Optional[str] = None
    ) -> List[TareaComunitaria]:
        query = db.query(TareaComunitaria).filter(TareaComunitaria.club_id == club_id)
        if estado:
            query = query.filter(TareaComunitaria.estado == estado)
        if categoria:
            query = query.filter(TareaComunitaria.categoria == categoria)
        if prioridad:
            query = query.filter(TareaComunitaria.prioridad == prioridad)
        return query.order_by(TareaComunitaria.created_at.desc()).all()

    @staticmethod
    def obtener_tarea(db: Session, tarea_id: int) -> Optional[TareaComunitaria]:
        return db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()

    @staticmethod
    def actualizar_tarea(db: Session, tarea_id: int, data: TareaComunitariaUpdate) -> Optional[TareaComunitaria]:
        tarea = db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()
        if not tarea:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tarea, key, value)
        db.commit()
        db.refresh(tarea)
        return tarea

    @staticmethod
    def eliminar_tarea(db: Session, tarea_id: int) -> bool:
        tarea = db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()
        if not tarea:
            return False
        db.delete(tarea)
        db.commit()
        return True

    @staticmethod
    def inscribir_usuario(db: Session, tarea_id: int, usuario_id: int) -> Dict:
        tarea = db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()
        if not tarea:
            return {"error": "Tarea no encontrada"}
        if tarea.estado != EstadoTarea.ABIERTA.value:
            return {"error": "La tarea no está abierta para inscripciones"}
        if tarea.fecha_limite and tarea.fecha_limite < datetime.now():
            return {"error": "La fecha límite de inscripción ha pasado"}

        # Verificar si ya está inscrito
        existente = db.query(ParticipanteTarea).filter(
            and_(ParticipanteTarea.tarea_id == tarea_id, ParticipanteTarea.usuario_id == usuario_id)
        ).first()
        if existente:
            return {"error": "Ya estás inscrito en esta tarea"}

        # Verificar plazas
        if tarea.max_participantes:
            num_inscritos = db.query(ParticipanteTarea).filter(ParticipanteTarea.tarea_id == tarea_id).count()
            if num_inscritos >= tarea.max_participantes:
                return {"error": "No hay plazas disponibles"}

        participante = ParticipanteTarea(tarea_id=tarea_id, usuario_id=usuario_id)
        db.add(participante)
        db.commit()
        return {"ok": True}

    @staticmethod
    def desinscribir_usuario(db: Session, tarea_id: int, usuario_id: int) -> Dict:
        participante = db.query(ParticipanteTarea).filter(
            and_(ParticipanteTarea.tarea_id == tarea_id, ParticipanteTarea.usuario_id == usuario_id)
        ).first()
        if not participante:
            return {"error": "No estás inscrito en esta tarea"}
        db.delete(participante)
        db.commit()
        return {"ok": True}

    @staticmethod
    def aprobar_tarea(db: Session, tarea_id: int) -> Dict:
        tarea = db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()
        if not tarea:
            return {"error": "Tarea no encontrada"}

        tarea.estado = EstadoTarea.COMPLETADA.value
        
        # Asignar puntos a todos los participantes
        participantes = db.query(ParticipanteTarea).filter(ParticipanteTarea.tarea_id == tarea_id).all()
        for p in participantes:
            if not p.puntos_otorgados:
                puntuacion = PuntuacionUsuario(
                    club_id=tarea.club_id,
                    usuario_id=p.usuario_id,
                    tarea_id=tarea_id,
                    puntos=tarea.puntos
                )
                db.add(puntuacion)
                p.puntos_otorgados = True

                # Crear alerta in-app para el participante
                alerta = Alerta(
                    club_id=tarea.club_id,
                    usuario_id=p.usuario_id,
                    tipo="puntos_otorgados",
                    severidad="warning",
                    titulo=f"Has recibido {tarea.puntos} puntos",
                    descripcion=f"Has recibido {tarea.puntos} puntos por la tarea: {tarea.titulo}",
                    estado="activa"
                )
                db.add(alerta)

        db.commit()
        return {"ok": True, "participantes_premiados": len(participantes)}

    @staticmethod
    def rechazar_tarea(db: Session, tarea_id: int, motivo: str) -> Dict:
        tarea = db.query(TareaComunitaria).filter(TareaComunitaria.id == tarea_id).first()
        if not tarea:
            return {"error": "Tarea no encontrada"}
        tarea.estado = EstadoTarea.RECHAZADA.value
        tarea.motivo_rechazo = motivo
        db.commit()
        return {"ok": True}

    @staticmethod
    def obtener_ranking(db: Session, club_id: int, periodo_id: Optional[int] = None) -> List[RankingEntry]:
        query = db.query(
            PuntuacionUsuario.usuario_id,
            func.sum(PuntuacionUsuario.puntos).label("puntos_totales")
        ).filter(PuntuacionUsuario.club_id == club_id)

        if periodo_id:
            periodo = db.query(PeriodoPremios).filter(PeriodoPremios.id == periodo_id).first()
            if periodo:
                query = query.filter(
                    and_(
                        PuntuacionUsuario.fecha >= periodo.fecha_inicio,
                        PuntuacionUsuario.fecha <= periodo.fecha_fin
                    )
                )

        resultados = query.group_by(PuntuacionUsuario.usuario_id)\
            .order_by(func.sum(PuntuacionUsuario.puntos).desc()).all()

        ranking = []
        for i, (usuario_id, puntos_totales) in enumerate(resultados, 1):
            usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
            nombre = usuario.nombre_completo if usuario else "Usuario desconocido"
            ranking.append(RankingEntry(
                usuario_id=usuario_id,
                nombre=nombre,
                puntos_totales=puntos_totales or 0,
                posicion=i
            ))
        return ranking

    @staticmethod
    def crear_periodo(db: Session, club_id: int, data: PeriodoPremiosCreate) -> PeriodoPremios:
        periodo = PeriodoPremios(
            club_id=club_id,
            nombre=data.nombre,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            tipo=data.tipo,
            estado=EstadoPeriodo.ACTIVO.value
        )
        db.add(periodo)
        db.commit()
        db.refresh(periodo)
        return periodo

    @staticmethod
    def listar_periodos(db: Session, club_id: int) -> List[PeriodoPremios]:
        return db.query(PeriodoPremios).filter(PeriodoPremios.club_id == club_id)\
            .order_by(PeriodoPremios.created_at.desc()).all()

    @staticmethod
    def obtener_periodo(db: Session, periodo_id: int) -> Optional[PeriodoPremios]:
        return db.query(PeriodoPremios).filter(PeriodoPremios.id == periodo_id).first()

    @staticmethod
    def cerrar_periodo(db: Session, periodo_id: int) -> Dict:
        periodo = db.query(PeriodoPremios).filter(PeriodoPremios.id == periodo_id).first()
        if not periodo:
            return {"error": "Periodo no encontrado"}
        
        periodo.estado = EstadoPeriodo.CERRADO.value

        # Calcular ranking del periodo y asignar premios automáticamente
        ranking = TareasComunitariasService.obtener_ranking(db, periodo.club_id, periodo_id)
        premios = db.query(Premio).filter(Premio.periodo_id == periodo_id).order_by(Premio.posicion).all()

        for premio in premios:
            if premio.posicion <= len(ranking):
                premio.usuario_id = ranking[premio.posicion - 1].usuario_id

        db.commit()
        return {"ok": True, "ranking_calculado": len(ranking)}

    @staticmethod
    def confirmar_premios(db: Session, periodo_id: int) -> Dict:
        periodo = db.query(PeriodoPremios).filter(PeriodoPremios.id == periodo_id).first()
        if not periodo:
            return {"error": "Periodo no encontrado"}
        if periodo.estado != EstadoPeriodo.CERRADO.value:
            return {"error": "El periodo debe estar cerrado antes de confirmar"}

        periodo.estado = EstadoPeriodo.CONFIRMADO.value
        premios = db.query(Premio).filter(Premio.periodo_id == periodo_id).all()
        for premio in premios:
            premio.confirmado = True
        db.commit()
        return {"ok": True}

    @staticmethod
    def crear_premio(db: Session, periodo_id: int, club_id: int, data: PremioCreate) -> Premio:
        premio = Premio(
            periodo_id=periodo_id,
            club_id=club_id,
            nombre=data.nombre,
            descripcion=data.descripcion,
            posicion=data.posicion
        )
        db.add(premio)
        db.commit()
        db.refresh(premio)
        return premio

    @staticmethod
    def obtener_premios_periodo(db: Session, periodo_id: int) -> List[Premio]:
        return db.query(Premio).filter(Premio.periodo_id == periodo_id).order_by(Premio.posicion).all()
