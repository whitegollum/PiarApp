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
from app.config import settings
import subprocess
import sys
from pathlib import Path
from datetime import datetime
import shutil
import os

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
    Verificar el estado del esquema de la base de datos (dry-run)
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        # Ejecutar migrate_schema.py en modo dry-run
        script_path = Path(__file__).parent.parent.parent / "scripts" / "migrate_schema.py"
        
        result = subprocess.run(
            [sys.executable, str(script_path), "--dry-run"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent.parent,
            timeout=30
        )
        
        # Parsear el output para extraer información útil
        output = result.stdout
        
        # Buscar información clave en el output usando regex para evitar conflictos con timestamps
        import re
        
        tablas_faltantes = 0
        columnas_faltantes = 0
        tipo_incompatibilidades = 0
        
        for line in output.split('\n'):
            # Buscar patrón: "Tablas faltantes: N" o "[INFO] Tablas faltantes: N"
            match = re.search(r'Tablas faltantes:\s*(\d+)', line, re.IGNORECASE)
            if match:
                tablas_faltantes = int(match.group(1))
            
            match = re.search(r'Columnas faltantes:\s*(\d+)', line, re.IGNORECASE)
            if match:
                columnas_faltantes = int(match.group(1))
            
            match = re.search(r'Posibles incompatibilidades de tipo:\s*(\d+)', line, re.IGNORECASE)
            if match:
                tipo_incompatibilidades = int(match.group(1))
        
        total_cambios = tablas_faltantes + columnas_faltantes + tipo_incompatibilidades
        
        return {
            "success": True,
            "necesita_migracion": total_cambios > 0,
            "estadisticas": {
                "tablas_faltantes": tablas_faltantes,
                "columnas_faltantes": columnas_faltantes,
                "tipo_incompatibilidades": tipo_incompatibilidades,
                "total_cambios": total_cambios
            },
            "output": output,
            "mensaje": "Esquema actualizado" if total_cambios == 0 else f"Se requieren {total_cambios} cambios"
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="La verificación tardó demasiado tiempo"
        )
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
    Aplicar migraciones pendientes a la base de datos
    ¡PRECAUCIÓN! Esta operación modifica la base de datos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        # Ejecutar migrate_schema.py con --force
        script_path = Path(__file__).parent.parent.parent / "scripts" / "migrate_schema.py"
        
        result = subprocess.run(
            [sys.executable, str(script_path), "--force"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent.parent,
            timeout=60
        )
        
        # Parsear el output
        output = result.stdout
        
        # Buscar información de cambios aplicados
        cambios_aplicados = 0
        for line in output.split('\n'):
            if 'cambios aplicados' in line.lower():
                try:
                    # Extraer número de cambios
                    import re
                    match = re.search(r'(\d+)\s+cambios?\s+aplicados?', line, re.IGNORECASE)
                    if match:
                        cambios_aplicados = int(match.group(1))
                except:
                    pass
        
        if result.returncode == 0:
            return {
                "success": True,
                "mensaje": "Migraciones aplicadas correctamente",
                "cambios_aplicados": cambios_aplicados,
                "output": output
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "mensaje": "Error al aplicar migraciones",
                    "output": output,
                    "error": result.stderr
                }
            )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="La migración tardó demasiado tiempo. Verifica el estado de la base de datos manualmente."
        )
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
        
        # Obtener migraciones aplicadas
        try:
            result = db.execute(text("SELECT migration_name, applied_at, description FROM schema_migrations ORDER BY applied_at DESC LIMIT 10"))
            migraciones = []
            for row in result:
                migraciones.append({
                    "nombre": row[0],
                    "fecha": str(row[1]) if row[1] else None,
                    "descripcion": row[2] if row[2] else ""
                })
            info["migraciones_recientes"] = migraciones
        except:
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

def _get_db_path() -> Path:
    """Obtener ruta del archivo de base de datos SQLite"""
    db_url = settings.database_url
    if not db_url.startswith("sqlite:///"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los backups solo están disponibles para bases de datos SQLite"
        )
    db_path = db_url.replace("sqlite:///", "")
    return Path(db_path)


def _get_backups_dir() -> Path:
    """Obtener directorio donde se almacenan los backups"""
    db_path = _get_db_path()
    return db_path.parent


def _list_backup_files() -> list[Path]:
    """Listar archivos de backup disponibles"""
    db_path = _get_db_path()
    backups_dir = _get_backups_dir()
    backup_pattern = f"{db_path.stem}_backup_*{db_path.suffix}"
    return sorted(backups_dir.glob(backup_pattern), key=lambda x: x.stat().st_mtime, reverse=True)


@router.post("/database/backup", response_model=BackupCreateResponse)
async def create_database_backup(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crear un backup manual de la base de datos
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    try:
        db_path = _get_db_path()
        
        if not db_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encuentra la base de datos en {db_path}"
            )
        
        # Generar nombre de backup con timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{db_path.stem}_backup_{timestamp}{db_path.suffix}"
        backup_path = db_path.parent / backup_name
        
        # Crear backup
        shutil.copy2(db_path, backup_path)
        file_size_bytes = backup_path.stat().st_size
        file_size_mb = file_size_bytes / (1024 * 1024)
        
        return BackupCreateResponse(
            success=True,
            filename=backup_name,
            size_mb=round(file_size_mb, 2),
            message=f"Backup creado exitosamente: {backup_name}"
        )
    
    except HTTPException:
        raise
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
        backup_files = _list_backup_files()
        
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
        backups_dir = _get_backups_dir()
        backup_path = backups_dir / filename
        
        # Validar que el archivo existe y es un backup válido
        if not backup_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup no encontrado: {filename}"
            )
        
        # Validar que el archivo está en el directorio correcto (seguridad)
        if not str(backup_path.resolve()).startswith(str(backups_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado"
            )
        
        return FileResponse(
            path=str(backup_path),
            filename=filename,
            media_type="application/octet-stream"
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
        backups_dir = _get_backups_dir()
        backup_path = backups_dir / filename
        
        if not backup_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup no encontrado: {filename}"
            )
        
        # Validar seguridad
        if not str(backup_path.resolve()).startswith(str(backups_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado"
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
    Restaurar la base de datos desde un archivo de backup
    PRECAUCIÓN: Esta operación sobrescribirá la base de datos actual
    IMPORTANTE: Requiere reiniciar el servidor después de restaurar
    Solo superadmin
    """
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de superadministrador"
        )
    
    import sqlite3
    
    try:
        db_path = _get_db_path()
        
        # Crear backup de seguridad antes de restaurar
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safety_backup_name = f"{db_path.stem}_before_restore_{timestamp}{db_path.suffix}"
        safety_backup_path = db_path.parent / safety_backup_name
        
        shutil.copy2(db_path, safety_backup_path)
        
        # Guardar el archivo subido temporalmente
        temp_path = db_path.parent / f"temp_restore_{timestamp}.db"
        
        try:
            # Escribir archivo subido
            content = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content)
            
            # Validar que es un archivo SQLite válido
            try:
                conn = sqlite3.connect(str(temp_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                num_tables = len(tables)
                conn.close()
            except sqlite3.DatabaseError as e:
                if temp_path.exists():
                    temp_path.unlink()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El archivo subido no es una base de datos SQLite válida: {str(e)}"
                )
            
            # Cerrar conexión actual
            db.close()
            
            # Reemplazar base de datos actual
            if db_path.exists():
                db_path.unlink()
            shutil.move(str(temp_path), str(db_path))
            
            return BackupRestoreResponse(
                success=True,
                message="Base de datos restaurada exitosamente. IMPORTANTE: Debes reiniciar el servidor.",
                backup_created=safety_backup_name,
                tables_restored=num_tables
            )
        
        except HTTPException:
            raise
        except Exception as e:
            # Si algo falla, restaurar el backup de seguridad
            if temp_path.exists():
                temp_path.unlink()
            
            if safety_backup_path.exists() and not db_path.exists():
                shutil.copy2(safety_backup_path, db_path)
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error durante la restauración: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
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
        backup_files = _list_backup_files()
        
        if len(backup_files) > max_archivos:
            # Eliminar los más antiguos
            for old_backup in backup_files[max_archivos:]:
                old_backup.unlink()
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



