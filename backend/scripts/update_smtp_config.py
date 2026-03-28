"""
Script para actualizar la configuración SMTP desde variables de entorno
Útil cuando ya existe una BD con configuración vacía
"""
import sys
from pathlib import Path

# Agregar el directorio padre al path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.db import SessionLocal
from app.models.system_config import SystemConfig
from app.config import settings


def update_smtp_config():
    """Actualiza la configuración SMTP en la BD usando las variables de entorno"""
    db = SessionLocal()
    
    try:
        config = db.query(SystemConfig).first()
        
        if not config:
            print("❌ No se encontró configuración en la BD")
            print("Creando configuración desde variables de entorno...")
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
            print("✓ Configuración creada exitosamente")
        else:
            print("📝 Configuración existente encontrada")
            print("\nConfiguracion actual:")
            print(f"  Servidor: {config.smtp_server}")
            print(f"  Puerto: {config.smtp_port}")
            print(f"  Usuario: {config.smtp_username}")
            print(f"  Password: {'*' * len(config.smtp_password) if config.smtp_password else '(vacío)'}")
            print(f"  From: {config.smtp_from_email}")
            print(f"  TLS: {config.smtp_use_tls}")
            
            # Solo actualizar si hay valores en las variables de entorno
            if settings.smtp_password:
                print("\n🔄 Actualizando desde variables de entorno...")
                config.smtp_server = settings.smtp_server or config.smtp_server
                config.smtp_port = settings.smtp_port or config.smtp_port
                config.smtp_username = settings.smtp_user or config.smtp_username
                config.smtp_password = settings.smtp_password
                config.smtp_from_email = settings.smtp_sender or config.smtp_from_email
                config.smtp_use_tls = settings.smtp_use_tls
                config.frontend_url = settings.frontend_url or config.frontend_url
                
                db.commit()
                print("✓ Configuración actualizada exitosamente")
                
                print("\nNueva configuración:")
                print(f"  Servidor: {config.smtp_server}")
                print(f"  Puerto: {config.smtp_port}")
                print(f"  Usuario: {config.smtp_username}")
                print(f"  Password: {'*' * len(config.smtp_password)}")
                print(f"  From: {config.smtp_from_email}")
                print(f"  TLS: {config.smtp_use_tls}")
            else:
                print("\n⚠️  No hay contraseña SMTP en las variables de entorno")
                print("   La configuración no se actualizará")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=== Actualizar configuración SMTP ===\n")
    update_smtp_config()
