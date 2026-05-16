"""Servicio de Alertas - Detección y gestión de alertas"""
from sqlalchemy.orm import Session
from app.models.alerta import Alerta, TipoAlerta, SubtipoAlerta, SeveridadAlerta, EstadoAlerta
from app.models.documentacion_reglamentaria import DocumentacionReglamentaria
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.usuario import Usuario
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy import and_, or_, func


class AlertaService:
    """Servicio para gestión de alertas"""
    
    @staticmethod
    def calcular_severidad(
        fecha_vencimiento: datetime,
        dias_aviso_previo: int = 30,
        dias_critico: int = 60
    ) -> str:
        """
        Calcular severidad según fecha de vencimiento
        
        Args:
            fecha_vencimiento: Fecha de vencimiento del documento
            dias_aviso_previo: Días antes para generar warning
            dias_critico: Días después del vencimiento para critical
        
        Returns:
            Severidad: 'warning', 'danger', 'critical'
        """
        ahora = datetime.now()
        dias_diferencia = (fecha_vencimiento.replace(tzinfo=None) - ahora).days
        
        if dias_diferencia > 0:
            # Todavía no ha vencido
            if dias_diferencia <= dias_aviso_previo:
                return SeveridadAlerta.WARNING.value
            else:
                return None  # No generar alerta aún
        else:
            # Ya venció
            dias_vencido = abs(dias_diferencia)
            if dias_vencido <= dias_critico:
                return SeveridadAlerta.DANGER.value
            else:
                return SeveridadAlerta.CRITICAL.value
    
    @staticmethod
    def generar_titulo_descripcion(
        tipo_doc: str,
        severidad: str,
        fecha_vencimiento: datetime,
        numero_documento: Optional[str] = None
    ) -> tuple[str, str]:
        """Generar título y descripción de la alerta"""
        
        dias_diff = (fecha_vencimiento.replace(tzinfo=None) - datetime.now()).days
        fecha_str = fecha_vencimiento.strftime("%d/%m/%Y")
        
        doc_nombres = {
            SubtipoAlerta.CARNET_PILOTO.value: "Carnet de Piloto",
            SubtipoAlerta.SEGURO_RC.value: "Seguro RC"
        }
        
        doc_nombre = doc_nombres.get(tipo_doc, "Documento")
        
        if severidad == SeveridadAlerta.WARNING.value:
            titulo = f"{doc_nombre} próximo a vencer"
            descripcion = f"Tu {doc_nombre.lower()} vence en {dias_diff} días (el {fecha_str}). Por favor, actualiza tu documentación antes de la fecha de vencimiento."
        
        elif severidad == SeveridadAlerta.DANGER.value:
            dias_vencido = abs(dias_diff)
            titulo = f"{doc_nombre} vencido"
            descripcion = f"Tu {doc_nombre.lower()} venció hace {dias_vencido} días (el {fecha_str}). Es necesario que actualices tu documentación lo antes posible."
        
        else:  # CRITICAL
            dias_vencido = abs(dias_diff)
            titulo = f"¡URGENTE! {doc_nombre} vencido desde hace más de 2 meses"
            descripcion = f"Tu {doc_nombre.lower()} venció hace {dias_vencido} días (el {fecha_str}). Tu acceso al club puede verse restringido hasta que actualices tu documentación."
        
        if numero_documento:
            descripcion += f" (Nº {numero_documento})"
        
        return titulo, descripcion
    
    @staticmethod
    def generar_alertas_documentacion_club(db: Session, club_id: int) -> Dict[str, int]:
        """
        Generar alertas de documentación para todos los socios del club
        
        Returns:
            Dict con contadores: creadas, actualizadas, resueltas
        """
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            return {"creadas": 0, "actualizadas": 0, "resueltas": 0, "mensaje": "Club no encontrado"}

        doc_vencimiento_enabled = bool(club.alertas_documentacion_enabled)
        doc_ausente_enabled = club.alertas_doc_ausente_enabled if club.alertas_doc_ausente_enabled is not None else True

        if not doc_vencimiento_enabled and not doc_ausente_enabled:
            return {"creadas": 0, "actualizadas": 0, "resueltas": 0, "mensaje": "Alertas deshabilitadas"}

        stats = {"creadas": 0, "actualizadas": 0, "resueltas": 0}

        # Obtener todos los socios activos del club
        socios = (
            db.query(MiembroClub, Usuario, DocumentacionReglamentaria)
            .join(Usuario, MiembroClub.usuario_id == Usuario.id)
            .outerjoin(
                DocumentacionReglamentaria,
                DocumentacionReglamentaria.usuario_id == Usuario.id
            )
            .filter(
                MiembroClub.club_id == club_id,
                MiembroClub.estado == "activo"
            )
            .all()
        )

        for miembro, usuario, documentacion in socios:
            for tipo_doc, ausente in [
                (
                    SubtipoAlerta.CARNET_PILOTO.value,
                    not documentacion
                    or (not documentacion.carnet_numero and not documentacion.carnet_fecha_vencimiento),
                ),
                (
                    SubtipoAlerta.SEGURO_RC.value,
                    not documentacion
                    or (not documentacion.rc_numero and not documentacion.rc_fecha_vencimiento),
                ),
            ]:
                if ausente:
                    if doc_ausente_enabled:
                        result = AlertaService._procesar_documento_ausente(
                            db=db, club_id=club_id, usuario_id=usuario.id,
                            tipo_doc=tipo_doc,
                        )
                        stats[result] += 1
                else:
                    # Siempre resolver la alerta de ausente si el doc ya fue subido
                    AlertaService._resolver_alerta_ausente(
                        db=db, club_id=club_id, usuario_id=usuario.id,
                        tipo_doc=tipo_doc,
                    )
                    if doc_vencimiento_enabled:
                        fecha_venc = (
                            documentacion.carnet_fecha_vencimiento
                            if tipo_doc == SubtipoAlerta.CARNET_PILOTO.value
                            else documentacion.rc_fecha_vencimiento
                        )
                        numero = (
                            documentacion.carnet_numero
                            if tipo_doc == SubtipoAlerta.CARNET_PILOTO.value
                            else documentacion.rc_numero
                        )
                        if fecha_venc:
                            result = AlertaService._procesar_documento(
                                db=db, club_id=club_id, usuario_id=usuario.id,
                                tipo_doc=tipo_doc,
                                fecha_vencimiento=fecha_venc,
                                numero_documento=numero,
                                dias_aviso_previo=club.alertas_dias_aviso_previo,
                                dias_critico=club.alertas_dias_critico,
                            )
                            stats[result] += 1

        db.commit()
        return stats
    
    @staticmethod
    def _procesar_documento(
        db: Session,
        club_id: int,
        usuario_id: int,
        tipo_doc: str,
        fecha_vencimiento: datetime,
        numero_documento: Optional[str],
        dias_aviso_previo: int,
        dias_critico: int
    ) -> str:
        """
        Procesar un documento individual y crear/actualizar/resolver alerta
        
        Returns:
            'creadas', 'actualizadas', o 'resueltas'
        """
        # Calcular severidad
        severidad = AlertaService.calcular_severidad(
            fecha_vencimiento,
            dias_aviso_previo,
            dias_critico
        )
        
        # Buscar alerta existente de vencimiento (excluye alertas de tipo ausente)
        alerta_existente = db.query(Alerta).filter(
            and_(
                Alerta.club_id == club_id,
                Alerta.usuario_id == usuario_id,
                Alerta.subtipo == tipo_doc,
                Alerta.tipo.in_([
                    TipoAlerta.DOCUMENTO_POR_VENCER.value,
                    TipoAlerta.DOCUMENTO_VENCIDO.value,
                ]),
                Alerta.estado == EstadoAlerta.ACTIVA.value,
            )
        ).first()
        
        # Si no hay severidad (documento vigente con margen), resolver alerta si existe
        if severidad is None:
            if alerta_existente:
                alerta_existente.estado = EstadoAlerta.RESUELTA.value
                alerta_existente.fecha_resolucion = datetime.now()
                return "resueltas"
            return "resueltas"  # No cuenta en stats
        
        # Generar título y descripción
        titulo, descripcion = AlertaService.generar_titulo_descripcion(
            tipo_doc,
            severidad,
            fecha_vencimiento,
            numero_documento
        )
        
        # Determinar tipo de alerta
        if severidad == SeveridadAlerta.WARNING.value:
            tipo_alerta = TipoAlerta.DOCUMENTO_POR_VENCER.value
        else:
            tipo_alerta = TipoAlerta.DOCUMENTO_VENCIDO.value
        
        if alerta_existente:
            # Actualizar si cambió la severidad
            if alerta_existente.severidad != severidad:
                alerta_existente.severidad = severidad
                alerta_existente.tipo = tipo_alerta
                alerta_existente.titulo = titulo
                alerta_existente.descripcion = descripcion
                alerta_existente.fecha_actualizacion = datetime.now()
                # Reset notificación para reenviar email con nueva severidad
                alerta_existente.notificado_usuario = False
                return "actualizadas"
            return "actualizadas"  # Ya existe pero sin cambios
        else:
            # Crear nueva alerta
            nueva_alerta = Alerta(
                club_id=club_id,
                usuario_id=usuario_id,
                tipo=tipo_alerta,
                subtipo=tipo_doc,
                severidad=severidad,
                titulo=titulo,
                descripcion=descripcion,
                fecha_referencia=fecha_vencimiento,
                estado=EstadoAlerta.ACTIVA.value,
                notificado_admin=False,
                notificado_usuario=False
            )
            db.add(nueva_alerta)
            return "creadas"
    
    @staticmethod
    def _procesar_documento_ausente(
        db: Session,
        club_id: int,
        usuario_id: int,
        tipo_doc: str,
    ) -> str:
        """
        Crear alerta de documento no registrado si no existe ya una activa.
        Retorna 'creadas' o 'actualizadas'.
        """
        doc_nombres = {
            SubtipoAlerta.CARNET_PILOTO.value: "Carnet de Piloto",
            SubtipoAlerta.SEGURO_RC.value: "Seguro RC",
        }
        doc_nombre = doc_nombres.get(tipo_doc, "Documento")

        alerta_existente = db.query(Alerta).filter(
            and_(
                Alerta.club_id == club_id,
                Alerta.usuario_id == usuario_id,
                Alerta.subtipo == tipo_doc,
                Alerta.tipo == TipoAlerta.DOCUMENTO_AUSENTE.value,
                Alerta.estado == EstadoAlerta.ACTIVA.value,
            )
        ).first()

        if alerta_existente:
            return "actualizadas"

        nueva_alerta = Alerta(
            club_id=club_id,
            usuario_id=usuario_id,
            tipo=TipoAlerta.DOCUMENTO_AUSENTE.value,
            subtipo=tipo_doc,
            severidad=SeveridadAlerta.DANGER.value,
            titulo=f"{doc_nombre} no registrado",
            descripcion=(
                f"No has registrado tu {doc_nombre.lower()}. "
                "Es obligatorio para acceder a las instalaciones del club. "
                "Por favor, sube tu documentación lo antes posible."
            ),
            fecha_referencia=None,
            estado=EstadoAlerta.ACTIVA.value,
            notificado_admin=False,
            notificado_usuario=False,
        )
        db.add(nueva_alerta)
        return "creadas"

    @staticmethod
    def _resolver_alerta_ausente(
        db: Session,
        club_id: int,
        usuario_id: int,
        tipo_doc: str,
    ) -> None:
        """Resolver alertas de documento ausente cuando el usuario ya registró el documento."""
        alerta = db.query(Alerta).filter(
            and_(
                Alerta.club_id == club_id,
                Alerta.usuario_id == usuario_id,
                Alerta.subtipo == tipo_doc,
                Alerta.tipo == TipoAlerta.DOCUMENTO_AUSENTE.value,
                Alerta.estado == EstadoAlerta.ACTIVA.value,
            )
        ).first()

        if alerta:
            alerta.estado = EstadoAlerta.RESUELTA.value
            alerta.fecha_resolucion = datetime.now()

    @staticmethod
    def obtener_alertas_club(
        db: Session,
        club_id: int,
        tipo: Optional[str] = None,
        subtipo: Optional[str] = None,
        severidad: Optional[str] = None,
        estado: str = "activa",
        usuario_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[Alerta], int]:
        """Obtener alertas del club con filtros"""
        
        from sqlalchemy.orm import joinedload
        
        query = db.query(Alerta).options(joinedload(Alerta.usuario)).filter(Alerta.club_id == club_id)
        
        if tipo:
            query = query.filter(Alerta.tipo == tipo)
        if subtipo:
            query = query.filter(Alerta.subtipo == subtipo)
        if severidad:
            query = query.filter(Alerta.severidad == severidad)
        if estado:
            query = query.filter(Alerta.estado == estado)
        if usuario_id:
            query = query.filter(Alerta.usuario_id == usuario_id)
        
        total = query.count()
        alertas = query.order_by(
            Alerta.severidad.desc(),  # Critical primero
            Alerta.fecha_creacion.desc()
        ).limit(limit).offset(offset).all()
        
        return alertas, total
    
    @staticmethod
    def obtener_contador_alertas(db: Session, club_id: int) -> Dict[str, int]:
        """Obtener contador de alertas por severidad"""
        
        alertas = db.query(Alerta).filter(
            and_(
                Alerta.club_id == club_id,
                Alerta.estado == EstadoAlerta.ACTIVA.value
            )
        ).all()
        
        contador = {
            "total": len(alertas),
            "warning": 0,
            "danger": 0,
            "critical": 0
        }
        
        for alerta in alertas:
            if alerta.severidad in contador:
                contador[alerta.severidad] += 1
        
        return contador
    
    @staticmethod
    def resolver_alerta(db: Session, alerta_id: int, resuelto_por_id: int) -> Optional[Alerta]:
        """Marcar alerta como resuelta"""
        
        alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
        if not alerta:
            return None
        
        alerta.estado = EstadoAlerta.RESUELTA.value
        alerta.fecha_resolucion = datetime.now()
        alerta.resuelto_por_id = resuelto_por_id
        
        db.commit()
        db.refresh(alerta)
        return alerta
    
    @staticmethod
    def ignorar_alerta(db: Session, alerta_id: int, ignorado_por_id: int) -> Optional[Alerta]:
        """Marcar alerta como ignorada"""
        
        alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
        if not alerta:
            return None
        
        alerta.estado = EstadoAlerta.IGNORADA.value
        alerta.fecha_resolucion = datetime.now()
        alerta.resuelto_por_id = ignorado_por_id
        
        db.commit()
        db.refresh(alerta)
        return alerta
    
    @staticmethod
    def obtener_alertas_usuario(
        db: Session,
        usuario_id: int,
        club_id: Optional[int] = None,
        solo_activas: bool = True
    ) -> List[Alerta]:
        """Obtener alertas de un usuario específico"""
        
        query = db.query(Alerta).filter(Alerta.usuario_id == usuario_id)
        
        if club_id:
            query = query.filter(Alerta.club_id == club_id)
        
        if solo_activas:
            query = query.filter(Alerta.estado == EstadoAlerta.ACTIVA.value)
        
        return query.order_by(Alerta.severidad.desc(), Alerta.fecha_creacion.desc()).all()
