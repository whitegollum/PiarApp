from sqlalchemy import Column, Integer, String, Boolean
from app.database.db import Base

class SystemConfig(Base):
    """Configuración del sistema (SMTP, etc.)"""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    
    # Configuración SMTP
    smtp_server = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True) # En texto plano para MVP, idealmente encriptado
    smtp_from_email = Column(String(255), nullable=True)
    smtp_use_tls = Column(Boolean, default=True)
    smtp_use_ssl = Column(Boolean, default=False)

    # URL del frontend para links en emails
    frontend_url = Column(String(255), nullable=True)
