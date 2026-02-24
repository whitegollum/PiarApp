from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Configuración de la aplicación desde variables de entorno"""
    
    # Aplicación
    app_name: str = "PiarAPP"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Base de datos
    database_url: str = "sqlite:///./data/piar.db"
    
    # Seguridad
    secret_key: str = "tu-clave-secreta-aqui"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"
    
    # Email
    smtp_server: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_sender: str = "noreply@piarapp.com"
    smtp_sender_name: str = "PiarAPP"
    smtp_use_tls: bool = True
    
    # Frontend
    frontend_url: str = "http://localhost:5173"
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://192.168.1.125:5173",
        "http://192.168.1.116:5173",
        "http://192.168.1.116:5174",
        "http://192.168.1.116:5175",
    ]
    
    # Rutas
    upload_folder: str = "./uploads"
    max_upload_size: int = 5242880  # 5MB
    
    # Autenticación
    two_factor_enabled: bool = False
    
    # Invitaciones
    invitation_token_expiry_days: int = 30
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )


# Instancia global de configuración
settings = Settings()

