from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.system_config import SystemConfig
from app.schemas.system_config import EmailConfigUpdate, EmailConfigResponse, TestEmailRequest
from app.routes.auth import get_current_user
from app.services.email_service import EmailService
from app.config import settings

router = APIRouter()


def ensure_frontend_url_column(db: Session) -> None:
    if db.bind and db.bind.dialect.name == "sqlite":
        columns = db.execute(text("PRAGMA table_info(system_config)"))
        column_names = {row[1] for row in columns}
        if "frontend_url" not in column_names:
            db.execute(text("ALTER TABLE system_config ADD COLUMN frontend_url VARCHAR(255)"))
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
