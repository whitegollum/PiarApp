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
        # Create default if not exists
        config = SystemConfig(
            smtp_server="smtp.gmail.com",
            smtp_port=587,
            smtp_username="",
            smtp_password="",
            smtp_from_email="noreply@piarapp.com",
            smtp_use_tls=True,
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
        await EmailService.enviar_email_test(test_request.to_email, db)
        return {"message": "Email de prueba enviado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando email: {str(e)}")
