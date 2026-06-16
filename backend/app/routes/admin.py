from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.system_config import SystemConfig
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.noticia import Noticia
from app.models.evento import Evento
from app.models.producto import ProductoAfiliacion
from app.models.alerta import Alerta
from app.models.documentacion_reglamentaria import DocumentacionReglamentaria
from app.models.invitacion import Invitacion
from app.models.instalacion import ContrasenaInstalacion
from app.models.socio import Socio
from app.models.votacion import Votacion
from app.models.comentario import Comentario
from app.schemas.system_config import EmailConfigUpdate, EmailConfigResponse, TestEmailRequest
from app.schemas.backup import BackupConfigSchema, BackupInfo, BackupListResponse, BackupCreateResponse, BackupRestoreResponse
from app.routes.auth import get_current_user
from app.services.email_service import EmailService
from app.services import data_transfer
from app.config import settings
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


def ensure_frontend_url_column(db: Session) -> None:
    if db.bind and db.bind.dialect.name == "sqlite":
        columns = db.execute(text("PRAGMA table_info(system_config)"))
        column_names = {row[1] for row in columns}
        if "frontend_url" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN frontend_url VARCHAR(255)"))
            db.commit()

def ensure_backup_columns(db: Session) -> None:
    """Asegurar que existen las columnas de configuración de backup"""
    if db.bind and db.bind.dialect.name == "sqlite":
        columns = db.execute(text("PRAGMA table_info(system_config)"))
        column_names = {row[1] for row in columns}
        
        if "backup_automatico_habilitado" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN backup_automatico_habilitado BOOLEAN DEFAULT 0"))
        if "backup_frecuencia_dias" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN backup_frecuencia_dias INTEGER DEFAULT 7"))
        if "backup_max_archivos" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN backup_max_archivos INTEGER DEFAULT 10"))
        if "backup_ultimo_ejecutado" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN backup_ultimo_ejecutado DATETIME"))
        
        db.commit()

def get_email_config(db: Session) -> SystemConfig:
    ensure_frontend_url_column(db)
    config = db.query(SystemConfig).first()
    if not config:
        # Create default using environment variables if available
        config = SystemConfig(
            smtp_server=settings.smtp_server or "smtp.gmail.com",
            smtp_port=settings.smtp_port or 587,
            smtp_username=settings.smtp_user or "",
            smtp_password=settings.smtp_password or "",
            smtp_from_email=settings.smtp_sender or "noreply@piarapp.com",
            smtp_use_tls=settings.smtp_use_tls,
            smtp_use_ssl=False,
            frontend_url=settings.frontend_url
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    elif not config.frontend_url:
        config.frontend_url = settings.frontend_url
        db.commit()
        db.refresh(config)
    return config

@router.post("/clubes/{club_id}/delete")
async def delete_club_endpoint(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")
    
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    
    club_nombre = club.nombre
    
    try:
        # Eliminar todas las dependencias del club en orden
        # 1. Comentarios de noticias del club
        noticias_ids = [n.id for n in db.query(Noticia).filter(Noticia.club_id == club_id).all()]
        if noticias_ids:
            db.query(Comentario).filter(Comentario.noticia_id.in_(noticias_ids)).delete(synchronize_session=False)
        
        # 2. Eliminar entidades principales
        db.query(Alerta).filter(Alerta.club_id == club_id).delete(synchronize_session=False)
        db.query(Noticia).filter(Noticia.club_id == club_id).delete(synchronize_session=False)
        db.query(Evento).filter(Evento.club_id == club_id).delete(synchronize_session=False)
        db.query(ProductoAfiliacion).filter(ProductoAfiliacion.club_id == club_id).delete(synchronize_session=False)
        db.query(Socio).filter(Socio.club_id == club_id).delete(synchronize_session=False)
        db.query(ContrasenaInstalacion).filter(ContrasenaInstalacion.club_id == club_id).delete(synchronize_session=False)
        db.query(Invitacion).filter(Invitacion.club_id == club_id).delete(synchronize_session=False)
        db.query(Votacion).filter(Votacion.club_id == club_id).delete(synchronize_session=False)
        db.query(MiembroClub).filter(MiembroClub.club_id == club_id).delete(synchronize_session=False)
        
        # 3. Eliminar el club
        db.delete(club)
        db.commit()
        
        return {
            "success": True,
            "message": f"Club '{club_nombre}' eliminado correctamente",
            "club_id": club_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config/email", response_model=EmailConfigResponse)
def get_email_configuration(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")
    
    config = get_email_config(db)
    # Mask password for security
    response_data = EmailConfigResponse.model_validate(config)
    response_data.smtp_password = "********" if config.smtp_password else ""
    return response_data

@router.put("/config/email", response_model=EmailConfigResponse)
def update_email_configuration(
    config_update: EmailConfigUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")
    
    db_config = get_email_config(db)
    
    # Update fields
    db_config.smtp_server = config_update.smtp_server
    db_config.smtp_port = config_update.smtp_port
    db_config.smtp_username = config_update.smtp_username
    db_config.smtp_from_email = config_update.smtp_from_email
    db_config.smtp_use_tls = config_update.smtp_use_tls
    db_config.smtp_use_ssl = config_update.smtp_use_ssl
    db_config.frontend_url = config_update.frontend_url
    
    # Only update password if provided
    if config_update.smtp_password and config_update.smtp_password != "********":
        db_config.smtp_password = config_update.smtp_password
        
    db.commit()
    db.refresh(db_config)
    
    response_data = EmailConfigResponse.model_validate(db_config)
    response_data.smtp_password = "********"
    return response_data

@router.post("/config/test-email")
async def send_test_email(
    test_request: TestEmailRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")
    
    try:
        debug_info = await EmailService.enviar_email_test_con_debug(test_request.to_email, db)
        return {
            "success": True,
            "message": "Email de prueba enviado correctamente",
            "debug": debug_info
        }
    except Exception as e:
        # Obtener configuración para depuración (sin contraseña completa)
        config = db.query(SystemConfig).first()
        config_debug = {}
        if config:
            config_debug = {
                "smtp_server": config.smtp_server or "(no configurado)",
                "smtp_port": config.smtp_port,
                "smtp_username": config.smtp_username or "(no configurado)",
                "smtp_from_email": config.smtp_from_email or "(no configurado)",
                "smtp_use_tls": config.smtp_use_tls,
                "smtp_use_ssl": config.smtp_use_ssl,
                "password_configured": bool(config.smtp_password)
            }
        
        error_type = type(e).__name__
        error_msg = str(e)
        
        # Analizar el tipo de error para dar contexto
        if "authentication" in error_msg.lower():
            context = "Error de autenticación. Verifica el usuario y contraseña SMTP."
        elif "connection" in error_msg.lower() or "refused" in error_msg.lower():
            context = "Error de conexión. Verifica el servidor y puerto SMTP."
        elif "tls" in error_msg.lower() or "ssl" in error_msg.lower():
            context = "Error de seguridad. Verifica la configuración de TLS/SSL."
        elif "timeout" in error_msg.lower():
            context = "Timeout de conexión. El servidor SMTP no responde."
        else:
            context = "Error general al enviar email."
        
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": context,
                "error": {
                    "type": error_type,
                    "details": error_msg
                },
                "config": config_debug
            }
        )


# ==================== GESTIÓN DE BASE DE DATOS ====================

@router.post("/database/check")
async def check_database_schema(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verificar si hay migraciones de Alembic pendientes (dry-run)
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        from app.database.migrations import get_migration_state
        state = get_migration_state()

        necesita = not state["up_to_date"]
        output = (
            f"Revisión actual: {state['current']}\n"
            f"Revisión objetivo (head): {state['head']}\n"
            f"{'Hay migraciones pendientes.' if necesita else 'La base de datos está al día.'}"
        )

        return {
            "success": True,
            "necesita_migracion": necesita,
            "estadisticas": {
                "tablas_faltantes": 0,
                "columnas_faltantes": 0,
                "tipo_incompatibilidades": 0,
                "total_cambios": 1 if necesita else 0,
            },
            "revision_actual": state["current"],
            "revision_objetivo": state["head"],
            "output": output,
            "mensaje": "Esquema actualizado" if not necesita else "Hay migraciones pendientes",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar esquema: {str(e)}"
        )


@router.post("/database/migrate")
async def migrate_database_schema(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Aplicar migraciones de Alembic pendientes (alembic upgrade head)
    ¡PRECAUCIÓN! Esta operación modifica el esquema de la base de datos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        from app.database.migrations import get_migration_state, run_migrations
        antes = get_migration_state()
        run_migrations()
        despues = get_migration_state()

        return {
            "success": True,
            "mensaje": "Migraciones aplicadas correctamente",
            "cambios_aplicados": 0 if antes["up_to_date"] else 1,
            "output": (
                f"Revisión antes: {antes['current']}\n"
                f"Revisión después: {despues['current']} (head: {despues['head']})"
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al ejecutar migración: {str(e)}"
        )


@router.get("/database/status")
async def get_database_status(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener estado general de la base de datos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        # Obtener información básica de la BD
        from app.models import Usuario, Club, Noticia, Evento
        from app.models.tareas_comunitarias import TareaComunitaria
        
        # Manejar estadísticas
        estadisticas = {
            "usuarios": db.query(Usuario).count(),
            "clubes": db.query(Club).count(),
            "noticias": db.query(Noticia).count(),
            "eventos": db.query(Evento).count(),
        }
        
        # Intentar contar alertas (puede no existir la tabla)
        try:
            from app.models import Alerta
            estadisticas["alertas"] = db.query(Alerta).count()
        except:
            estadisticas["alertas"] = 0
        
        # Intentar contar tareas comunitarias
        try:
            estadisticas["tareas_comunitarias"] = db.query(TareaComunitaria).count()
        except:
            estadisticas["tareas_comunitarias"] = 0
        
        info = {
            "motor": db.bind.dialect.name if db.bind else "unknown",
            "url": str(db.bind.url).replace(str(db.bind.url.password) if db.bind.url.password else '', '***') if db.bind else "unknown",
            "estadisticas": estadisticas
        }
        
        # Obtener estado de migraciones (Alembic)
        try:
            from app.database.migrations import get_migration_state
            state = get_migration_state()
            info["revision_actual"] = state["current"]
            info["revision_objetivo"] = state["head"]
            info["esquema_al_dia"] = state["up_to_date"]
            info["migraciones_recientes"] = [{
                "nombre": state["current"] or "(sin revisión)",
                "fecha": None,
                "descripcion": "Revisión Alembic aplicada" + (" (al día)" if state["up_to_date"] else " (pendiente de actualizar)"),
            }] if state["current"] else []
        except Exception:
            info["migraciones_recientes"] = []
        
        return {
            "success": True,
            "info": info
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado de la base de datos: {str(e)}"
        )


# ==================== GESTIÓN DE BACKUPS ====================

def _resolve_backup_path(filename: str) -> Path:
    """Resolver de forma segura la ruta de un backup dentro del directorio de backups."""
    backups_dir = data_transfer.get_backups_dir()
    backup_path = (backups_dir / filename).resolve()
    if not str(backup_path).startswith(str(backups_dir.resolve())):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado"
        )
    return backup_path


@router.post("/database/backup", response_model=BackupCreateResponse)
async def create_database_backup(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crear un backup manual (export lógico JSON, agnóstico al motor)
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        backup_path = data_transfer.create_backup_file(db)
        file_size_mb = backup_path.stat().st_size / (1024 * 1024)

        return BackupCreateResponse(
            success=True,
            filename=backup_path.name,
            size_mb=round(file_size_mb, 2),
            message=f"Backup creado exitosamente: {backup_path.name}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear backup: {str(e)}"
        )


@router.get("/database/backups", response_model=BackupListResponse)
async def list_database_backups(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar todos los backups disponibles
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        backup_files = data_transfer.list_backup_files()

        backups = []
        total_size_bytes = 0

        for backup in backup_files:
            stat = backup.stat()
            size_bytes = stat.st_size
            total_size_bytes += size_bytes

            backups.append(BackupInfo(
                filename=backup.name,
                size_bytes=size_bytes,
                size_mb=round(size_bytes / (1024 * 1024), 2),
                created_at=datetime.fromtimestamp(stat.st_mtime),
                full_path=str(backup)
            ))

        return BackupListResponse(
            backups=backups,
            total=len(backups),
            total_size_mb=round(total_size_bytes / (1024 * 1024), 2)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar backups: {str(e)}"
        )


@router.get("/database/backups/{filename}")
async def download_backup(
    filename: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Descargar un archivo de backup específico
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        backup_path = _resolve_backup_path(filename)

        if not backup_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup no encontrado: {filename}"
            )

        return FileResponse(
            path=str(backup_path),
            filename=filename,
            media_type="application/json"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al descargar backup: {str(e)}"
        )


@router.delete("/database/backups/{filename}")
async def delete_backup(
    filename: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Eliminar un archivo de backup
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    try:
        backup_path = _resolve_backup_path(filename)

        if not backup_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup no encontrado: {filename}"
            )

        backup_path.unlink()

        return {
            "success": True,
            "message": f"Backup eliminado: {filename}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar backup: {str(e)}"
        )


@router.post("/database/restore", response_model=BackupRestoreResponse)
async def restore_database_backup(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Restaurar la base de datos desde un backup JSON (export lógico)
    PRECAUCIÓN: vacía las tablas y recarga los datos del backup.
    Se crea automáticamente un backup de seguridad previo. No requiere reiniciar.
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )

    import json

    try:
        # Leer y validar el archivo subido
        content = await file.read()
        try:
            payload = json.loads(content.decode("utf-8"))
            data_transfer.validate_payload(payload)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El archivo subido no es un backup JSON válido: {str(e)}"
            )

        # Backup de seguridad antes de restaurar
        safety_path = data_transfer.create_backup_file(db, prefix=data_transfer.SAFETY_PREFIX)

        # Importar (vacía y recarga)
        counts = data_transfer.import_from_dict(db, payload, wipe=True)
        tablas_con_datos = sum(1 for n in counts.values() if n > 0)

        return BackupRestoreResponse(
            success=True,
            message="Base de datos restaurada exitosamente.",
            backup_created=safety_path.name,
            tables_restored=tablas_con_datos
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al restaurar backup: {str(e)}"
        )


@router.get("/database/backup-config", response_model=BackupConfigSchema)
async def get_backup_config(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener configuración de backups automáticos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    # Asegurar que existen las columnas de backup ANTES de hacer queries
    ensure_backup_columns(db)
    
    # Ahora sí podemos hacer el query completo
    config = db.query(SystemConfig).first()
    
    if not config:
        # Crear configuración por defecto
        config = SystemConfig(
            backup_automatico_habilitado=False,
            backup_frecuencia_dias=7,
            backup_max_archivos=10
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return BackupConfigSchema(
        backup_automatico_habilitado=config.backup_automatico_habilitado or False,
        backup_frecuencia_dias=config.backup_frecuencia_dias or 7,
        backup_max_archivos=config.backup_max_archivos or 10,
        backup_ultimo_ejecutado=config.backup_ultimo_ejecutado
    )


@router.put("/database/backup-config", response_model=BackupConfigSchema)
async def update_backup_config(
    backup_config: BackupConfigSchema,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualizar configuración de backups automáticos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        # Asegurar que existen las columnas de backup ANTES de hacer queries
        ensure_backup_columns(db)
        
        config = db.query(SystemConfig).first()
        
        if not config:
            # Crear configuración si no existe
            config = SystemConfig()
            db.add(config)
        
        config.backup_automatico_habilitado = backup_config.backup_automatico_habilitado
        config.backup_frecuencia_dias = backup_config.backup_frecuencia_dias
        config.backup_max_archivos = backup_config.backup_max_archivos
        
        db.commit()
        db.refresh(config)
        
        # Limpiar backups antiguos si es necesario
        if backup_config.backup_automatico_habilitado:
            _cleanup_old_backups(backup_config.backup_max_archivos)
        
        return BackupConfigSchema(
            backup_automatico_habilitado=config.backup_automatico_habilitado,
            backup_frecuencia_dias=config.backup_frecuencia_dias,
            backup_max_archivos=config.backup_max_archivos,
            backup_ultimo_ejecutado=config.backup_ultimo_ejecutado
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar configuración: {str(e)}"
        )


def _cleanup_old_backups(max_archivos: int):
    """Eliminar backups antiguos manteniendo solo los últimos N"""
    try:
        data_transfer.cleanup_old_backups(max_archivos)
    except Exception as e:
        print(f"Error al limpiar backups antiguos: {e}")


# ==================== ESTADO DEL SCHEDULER ====================

@router.get("/scheduler/status")
async def get_scheduler_status(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener estado del scheduler de tareas programadas
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        from app.services.scheduler_service import SchedulerService
        
        status_info = SchedulerService.get_status()
        
        return {
            "success": True,
            "scheduler": status_info
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado del scheduler: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Configuración de Afiliación
# ─────────────────────────────────────────────────────────────────────────────

def ensure_afiliacion_columns(db: Session) -> None:
    """Asegurar que existen las columnas de configuración de afiliación"""
    if db.bind and db.bind.dialect.name == "sqlite":
        columns = db.execute(text("PRAGMA table_info(system_config)"))
        column_names = {row[1] for row in columns}
        if "aliexpress_banner_url" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN aliexpress_banner_url VARCHAR(500)"))
        if "aliexpress_redirect_enabled" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN aliexpress_redirect_enabled BOOLEAN DEFAULT 1"))
        db.commit()


@router.get("/config/afiliacion")
async def get_afiliacion_config(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener configuración de afiliación — solo superadmin"""
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")

    ensure_afiliacion_columns(db)
    config = db.query(SystemConfig).first()

    banner_url = settings.aliexpress_banner_url
    redirect_enabled = settings.aliexpress_redirect_enabled

    if config:
        if config.aliexpress_banner_url:
            banner_url = config.aliexpress_banner_url
        if config.aliexpress_redirect_enabled is not None:
            redirect_enabled = config.aliexpress_redirect_enabled

    return {
        "aliexpress_banner_url": banner_url,
        "aliexpress_redirect_enabled": redirect_enabled,
    }


@router.put("/config/afiliacion")
async def update_afiliacion_config(
    data: dict,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar configuración de afiliación — solo superadmin"""
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")

    ensure_afiliacion_columns(db)
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)

    if "aliexpress_banner_url" in data:
        config.aliexpress_banner_url = data["aliexpress_banner_url"]
        # Actualizar también en runtime
        settings.aliexpress_banner_url = data["aliexpress_banner_url"]

    if "aliexpress_redirect_enabled" in data:
        config.aliexpress_redirect_enabled = bool(data["aliexpress_redirect_enabled"])
        settings.aliexpress_redirect_enabled = bool(data["aliexpress_redirect_enabled"])

    db.commit()
    db.refresh(config)

    return {
        "aliexpress_banner_url": config.aliexpress_banner_url or settings.aliexpress_banner_url,
        "aliexpress_redirect_enabled": config.aliexpress_redirect_enabled if config.aliexpress_redirect_enabled is not None else settings.aliexpress_redirect_enabled,
    }


@router.get("/config/afiliacion/stats")
async def get_afiliacion_stats(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas de productos de afiliación — solo superadmin"""
    if not current_user.es_superadmin:
        raise HTTPException(status_code=403, detail="Requiere privilegios de superadministrador")

    from sqlalchemy import func

    # Total clicks y productos
    total_productos = db.query(func.count(ProductoAfiliacion.id)).scalar() or 0
    total_clicks = db.query(func.sum(ProductoAfiliacion.clicks)).scalar() or 0
    productos_activos = db.query(func.count(ProductoAfiliacion.id)).filter(
        ProductoAfiliacion.activo == True
    ).scalar() or 0

    # Top productos por clicks
    top_productos = db.query(
        ProductoAfiliacion.id,
        ProductoAfiliacion.nombre,
        ProductoAfiliacion.proveedor,
        ProductoAfiliacion.url_afiliacion,
        ProductoAfiliacion.clicks,
        ProductoAfiliacion.club_id,
        Club.nombre.label("club_nombre")
    ).join(Club, Club.id == ProductoAfiliacion.club_id).filter(
        ProductoAfiliacion.clicks > 0
    ).order_by(
        ProductoAfiliacion.clicks.desc()
    ).limit(20).all()

    # Stats por club
    stats_por_club = db.query(
        Club.id,
        Club.nombre,
        func.count(ProductoAfiliacion.id).label("total_productos"),
        func.sum(ProductoAfiliacion.clicks).label("total_clicks")
    ).join(ProductoAfiliacion, ProductoAfiliacion.club_id == Club.id).group_by(
        Club.id, Club.nombre
    ).order_by(func.sum(ProductoAfiliacion.clicks).desc()).all()

    # Stats por proveedor
    stats_por_proveedor = db.query(
        ProductoAfiliacion.proveedor,
        func.count(ProductoAfiliacion.id).label("total_productos"),
        func.sum(ProductoAfiliacion.clicks).label("total_clicks")
    ).filter(
        ProductoAfiliacion.proveedor != None
    ).group_by(ProductoAfiliacion.proveedor).order_by(
        func.sum(ProductoAfiliacion.clicks).desc()
    ).all()

    return {
        "resumen": {
            "total_productos": total_productos,
            "productos_activos": productos_activos,
            "total_clicks": total_clicks,
        },
        "top_productos": [
            {
                "id": p.id,
                "nombre": p.nombre,
                "proveedor": p.proveedor,
                "url_afiliacion": p.url_afiliacion,
                "clicks": p.clicks,
                "club_id": p.club_id,
                "club_nombre": p.club_nombre,
            }
            for p in top_productos
        ],
        "stats_por_club": [
            {
                "club_id": s.id,
                "club_nombre": s.nombre,
                "total_productos": s.total_productos,
                "total_clicks": s.total_clicks or 0,
            }
            for s in stats_por_club
        ],
        "stats_por_proveedor": [
            {
                "proveedor": s.proveedor or "Sin proveedor",
                "total_productos": s.total_productos,
                "total_clicks": s.total_clicks or 0,
            }
            for s in stats_por_proveedor
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Gestión de Usuarios (Superadmin)
# ─────────────────────────────────────────────────────────────────────────────

class UsuarioClubInfo(BaseModel):
    club_id: int
    club_nombre: str
    rol: str
    estado: str


class UsuarioAdminResponse(BaseModel):
    id: int
    email: str
    nombre_completo: str
    activo: bool
    es_superadmin: bool
    email_verificado: bool
    fecha_creacion: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None
    clubes: List[UsuarioClubInfo] = []


class UsuarioAdminUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    activo: Optional[bool] = None
    es_superadmin: Optional[bool] = None


class AsociarClubRequest(BaseModel):
    club_id: int
    rol: str = "socio"


def _require_superadmin(current_user: Usuario) -> None:
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )


def _serializar_usuario(usuario: Usuario, db: Session) -> UsuarioAdminResponse:
    miembros = (
        db.query(MiembroClub, Club)
        .join(Club, Club.id == MiembroClub.club_id)
        .filter(MiembroClub.usuario_id == usuario.id)
        .all()
    )
    clubes = [
        UsuarioClubInfo(
            club_id=club.id,
            club_nombre=club.nombre,
            rol=miembro.rol,
            estado=miembro.estado,
        )
        for miembro, club in miembros
    ]
    return UsuarioAdminResponse(
        id=usuario.id,
        email=usuario.email,
        nombre_completo=usuario.nombre_completo,
        activo=usuario.activo,
        es_superadmin=usuario.es_superadmin,
        email_verificado=usuario.email_verificado,
        fecha_creacion=usuario.fecha_creacion,
        ultimo_login=usuario.ultimo_login,
        clubes=clubes,
    )


@router.get("/usuarios", response_model=List[UsuarioAdminResponse])
async def listar_usuarios(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Listar todos los usuarios con los clubes a los que pertenecen — solo superadmin"""
    _require_superadmin(current_user)

    usuarios = db.query(Usuario).order_by(Usuario.nombre_completo).all()
    return [_serializar_usuario(u, db) for u in usuarios]


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioAdminResponse)
async def actualizar_usuario(
    usuario_id: int,
    datos: UsuarioAdminUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualizar características básicas de un usuario (activar/desactivar, etc.) — solo superadmin"""
    _require_superadmin(current_user)

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    # Evitar que el superadmin se desactive o se quite el rol a sí mismo
    if usuario.id == current_user.id:
        if datos.activo is False:
            raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
        if datos.es_superadmin is False:
            raise HTTPException(status_code=400, detail="No puedes quitarte el rol de superadministrador")

    update_data = datos.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(usuario, field, value)

    db.commit()
    db.refresh(usuario)
    return _serializar_usuario(usuario, db)


@router.post("/usuarios/{usuario_id}/clubes", response_model=UsuarioAdminResponse)
async def asociar_usuario_club(
    usuario_id: int,
    datos: AsociarClubRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Asociar un usuario a un club — solo superadmin"""
    _require_superadmin(current_user)

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    club = db.query(Club).filter(Club.id == datos.club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")

    existente = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == datos.club_id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El usuario ya pertenece a este club")

    miembro = MiembroClub(
        usuario_id=usuario_id,
        club_id=datos.club_id,
        rol=datos.rol or "socio",
        estado="activo",
        fecha_aprobacion=datetime.utcnow(),
        aprobado_por_id=current_user.id,
    )
    db.add(miembro)
    db.commit()
    db.refresh(usuario)
    return _serializar_usuario(usuario, db)


@router.delete("/usuarios/{usuario_id}/clubes/{club_id}", response_model=UsuarioAdminResponse)
async def retirar_usuario_club(
    usuario_id: int,
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retirar un usuario de un club — solo superadmin"""
    _require_superadmin(current_user)

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id,
    ).first()
    if not miembro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El usuario no pertenece a este club")

    db.delete(miembro)
    db.commit()
    db.refresh(usuario)
    return _serializar_usuario(usuario, db)



