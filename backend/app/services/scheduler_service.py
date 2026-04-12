"""
Servicio de Tareas Programadas (Scheduler)

Maneja tareas periódicas como:
- Generación automática de alertas de documentación
- Backups automáticos de la base de datos
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from pathlib import Path
import shutil
import logging
from typing import Optional

from app.database.db import SessionLocal
from app.models.system_config import SystemConfig
from app.models.club import Club
from app.services.alerta_service import AlertaService
from app.config import settings

# Configurar logger
logger = logging.getLogger(__name__)


class SchedulerService:
    """Servicio de tareas programadas"""
    
    _scheduler: Optional[BackgroundScheduler] = None
    
    @classmethod
    def start(cls):
        """Iniciar el scheduler"""
        if cls._scheduler is not None:
            logger.warning("Scheduler ya está iniciado")
            return
        
        cls._scheduler = BackgroundScheduler(timezone='Europe/Madrid')
        
        # Tarea diaria: Generar alertas para todos los clubes (a las 2:00 AM)
        cls._scheduler.add_job(
            func=cls._job_generar_alertas,
            trigger=CronTrigger(hour=2, minute=0),
            id='generar_alertas_diario',
            name='Generación diaria de alertas de documentación',
            replace_existing=True
        )
        
        # Tarea diaria: Verificar y ejecutar backups automáticos (a las 3:00 AM)
        cls._scheduler.add_job(
            func=cls._job_backups_automaticos,
            trigger=CronTrigger(hour=3, minute=0),
            id='backups_automaticos',
            name='Backups automáticos de base de datos',
            replace_existing=True
        )
        
        cls._scheduler.start()
        logger.info("✅ Scheduler iniciado correctamente")
        logger.info("📅 Tareas programadas:")
        logger.info("  - Alertas: Diario a las 2:00 AM")
        logger.info("  - Backups: Diario a las 3:00 AM")
    
    @classmethod
    def shutdown(cls):
        """Detener el scheduler"""
        if cls._scheduler is not None:
            cls._scheduler.shutdown()
            cls._scheduler = None
            logger.info("🛑 Scheduler detenido")
    
    @classmethod
    def _job_generar_alertas(cls):
        """
        Job: Generar alertas de documentación para todos los clubes
        Se ejecuta diariamente a las 2:00 AM
        """
        logger.info("🔔 Iniciando generación automática de alertas...")
        
        db = SessionLocal()
        try:
            # Obtener todos los clubes con alertas habilitadas
            clubes = db.query(Club).filter(
                Club.alertas_documentacion_enabled == True
            ).all()
            
            if not clubes:
                logger.info("No hay clubes con alertas habilitadas")
                return
            
            total_creadas = 0
            total_actualizadas = 0
            total_resueltas = 0
            
            for club in clubes:
                try:
                    stats = AlertaService.generar_alertas_documentacion_club(db, club.id)
                    total_creadas += stats.get('creadas', 0)
                    total_actualizadas += stats.get('actualizadas', 0)
                    total_resueltas += stats.get('resueltas', 0)
                    logger.debug(f"  Club '{club.nombre}': {stats}")
                except Exception as e:
                    logger.error(f"Error al generar alertas para club {club.id}: {e}")
            
            logger.info(
                f"✅ Alertas generadas - "
                f"Creadas: {total_creadas}, "
                f"Actualizadas: {total_actualizadas}, "
                f"Resueltas: {total_resueltas}"
            )
            
        except Exception as e:
            logger.error(f"❌ Error en job de generación de alertas: {e}")
        finally:
            db.close()
    
    @classmethod
    def _job_backups_automaticos(cls):
        """
        Job: Crear backups automáticos según configuración
        Se ejecuta diariamente a las 3:00 AM
        """
        logger.info("💾 Iniciando verificación de backups automáticos...")
        
        db = SessionLocal()
        try:
            # Obtener configuración de backups
            config = db.query(SystemConfig).first()
            
            if not config or not config.backup_automatico_habilitado:
                logger.info("Backups automáticos deshabilitados")
                return
            
            # Verificar si es momento de hacer backup
            ahora = datetime.utcnow()
            
            if config.backup_ultimo_ejecutado:
                dias_desde_ultimo = (ahora - config.backup_ultimo_ejecutado).days
                
                if dias_desde_ultimo < config.backup_frecuencia_dias:
                    logger.info(
                        f"No es necesario hacer backup. "
                        f"Último: {config.backup_ultimo_ejecutado.strftime('%Y-%m-%d')}, "
                        f"Frecuencia: cada {config.backup_frecuencia_dias} días"
                    )
                    return
            
            # Crear backup
            logger.info("Creando backup automático...")
            db_path = cls._get_db_path()
            
            if not db_path.exists():
                logger.error(f"Base de datos no encontrada: {db_path}")
                return
            
            # Generar nombre de backup
            timestamp = ahora.strftime("%Y%m%d_%H%M%S")
            backup_name = f"{db_path.stem}_backup_{timestamp}{db_path.suffix}"
            backup_path = db_path.parent / backup_name
            
            # Copiar archivo
            shutil.copy2(db_path, backup_path)
            file_size_mb = backup_path.stat().st_size / (1024 * 1024)
            
            logger.info(f"✅ Backup creado: {backup_name} ({file_size_mb:.2f} MB)")
            
            # Actualizar fecha de último backup
            config.backup_ultimo_ejecutado = ahora
            db.commit()
            
            # Limpiar backups antiguos
            cls._cleanup_old_backups(config.backup_max_archivos)
            
        except Exception as e:
            logger.error(f"❌ Error en job de backups automáticos: {e}")
            db.rollback()
        finally:
            db.close()
    
    @staticmethod
    def _get_db_path() -> Path:
        """Obtener ruta del archivo de base de datos"""
        db_url = settings.database_url
        if not db_url.startswith("sqlite:///"):
            raise ValueError("Backups automáticos solo soportan SQLite")
        db_path = db_url.replace("sqlite:///", "")
        return Path(db_path)
    
    @staticmethod
    def _cleanup_old_backups(max_archivos: int):
        """Eliminar backups antiguos manteniendo solo los últimos N"""
        try:
            db_path = SchedulerService._get_db_path()
            backups_dir = db_path.parent
            backup_pattern = f"{db_path.stem}_backup_*{db_path.suffix}"
            
            # Listar todos los backups ordenados por fecha (más recientes primero)
            backups = sorted(
                backups_dir.glob(backup_pattern),
                key=lambda x: x.stat().st_mtime,
                reverse=True
            )
            
            if len(backups) > max_archivos:
                # Eliminar los más antiguos
                for old_backup in backups[max_archivos:]:
                    old_backup.unlink()
                    logger.info(f"🗑️  Backup antiguo eliminado: {old_backup.name}")
                
                logger.info(f"Limpieza completada. Conservados: {max_archivos} backups")
        
        except Exception as e:
            logger.error(f"Error al limpiar backups antiguos: {e}")
    
    @classmethod
    def get_status(cls) -> dict:
        """Obtener estado del scheduler"""
        if cls._scheduler is None:
            return {
                "running": False,
                "jobs": []
            }
        
        jobs = []
        for job in cls._scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "running": cls._scheduler.running,
            "jobs": jobs
        }
