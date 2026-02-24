"""Servicio de Email"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import asyncio
from sqlalchemy import text
from app.database.db import SessionLocal
from app.models.system_config import SystemConfig


class EmailService:
    """Servicio para enviar emails"""

    @staticmethod
    def _get_frontend_url() -> str:
        db = SessionLocal()
        try:
            if db.bind and db.bind.dialect.name == "sqlite":
                columns = db.execute(text("PRAGMA table_info(system_config)"))
                column_names = {row[1] for row in columns}
                if "frontend_url" not in column_names:
                    db.execute(text("ALTER TABLE system_config ADD COLUMN frontend_url VARCHAR(255)"))
                    db.commit()
            config = db.query(SystemConfig).first()
            if config and config.frontend_url:
                return config.frontend_url.rstrip("/")
        except Exception:
            return settings.frontend_url.rstrip("/")
        finally:
            db.close()

        return settings.frontend_url.rstrip("/")
    
    @staticmethod
    async def enviar_invitacion_club(email: str, token: str, club_nombre: str):
        """Enviar email de invitación a club"""
        base_url = EmailService._get_frontend_url()

        # URL para aceptar la invitación
        invitation_url = f"{base_url}/auth/aceptar-invitacion?token={token}"
        
        asunto = f"Invitación a {club_nombre} - PiarAPP"
        
        # Cuerpo del email en HTML
        cuerpo_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>¡Bienvenido a {club_nombre}!</h2>
                    <p>Has sido invitado a unirte a <strong>{club_nombre}</strong> en PiarAPP.</p>
                    
                    <p>Haz clic en el siguiente botón para aceptar la invitación:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{invitation_url}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Aceptar Invitación
                        </a>
                    </div>
                    
                    <p>O copia este enlace en tu navegador:</p>
                    <p style="word-break: break-all; color: #666;">
                        {invitation_url}
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        Esta invitación expira en 30 días.
                    </p>
                    
                    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        PiarAPP - Gestión de Clubs de Aeromodelismo<br>
                        {base_url}
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    
    @staticmethod
    async def enviar_bienvenida_nuevo_usuario(email: str, nombre: str, club_nombre: str, token: str):
        """Enviar email de bienvenida a nuevo usuario con invitación"""
        base_url = EmailService._get_frontend_url()

        # URL para registrarse desde la invitación
        registro_url = f"{base_url}/auth/registrarse-desde-invitacion?token={token}"
        
        asunto = f"Bienvenido a PiarAPP - Invitación a {club_nombre}"
        
        cuerpo_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>¡Bienvenido a PiarAPP, {nombre}!</h2>
                    <p>Has sido invitado a unirte a <strong>{club_nombre}</strong>.</p>
                    
                    <p>PiarAPP es una plataforma de gestión integral para clubs de aeromodelismo, 
                    con herramientas para:
                    </p>
                    <ul>
                        <li>Gestionar eventos y juntas</li>
                        <li>Compartir noticias y documentación</li>
                        <li>Administrar socios y votaciones</li>
                        <li>Publicar avisos y noticias del club</li>
                    </ul>
                    
                    <p>Haz clic en el siguiente botón para crear tu cuenta y aceptar la invitación:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{registro_url}" 
                           style="background-color: #28a745; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Crear Cuenta y Unirme
                        </a>
                    </div>
                    
                    <p>O copia este enlace:</p>
                    <p style="word-break: break-all; color: #666;">
                        {registro_url}
                    </p>
                    
                     <p style="color: #999; font-size: 12px;">
                        Esta invitación expira en 30 días.
                    </p>
                    
                    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        PiarAPP - Gestión de Clubs de Aeromodelismo<br>
                        {base_url}
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    @staticmethod
    async def enviar_verificacion_email(email: str, token: str):
        """Enviar email de verificación"""
        base_url = EmailService._get_frontend_url()

        verification_url = f"{base_url}/auth/verificar-email?token={token}"
        
        asunto = "Verifica tu email en PiarAPP"
        
        cuerpo_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Verifica tu email</h2>
                    <p>Haz clic en el siguiente botón para verificar tu email:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{verification_url}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verificar Email
                        </a>
                    </div>
                    
                    <p>O copia este enlace:</p>
                    <p style="word-break: break-all; color: #666;">
                        {verification_url}
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        Este enlace expira en 24 horas.
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    
    @staticmethod
    async def enviar_reset_contrasena(email: str, token: str):
        """Enviar email para resetear contraseña"""
        base_url = EmailService._get_frontend_url()

        reset_url = f"{base_url}/auth/reset-contrasena?token={token}"
        
        asunto = "Restablecer contraseña en PiarAPP"
        
        cuerpo_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Restablecer contraseña</h2>
                    <p>Recibimos una solicitud para restablecer tu contraseña en PiarAPP.</p>
                    
                    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{reset_url}" 
                           style="background-color: #dc3545; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Restablecer Contraseña
                        </a>
                    </div>
                    
                    <p>O copia este enlace:</p>
                    <p style="word-break: break-all; color: #666;">
                        {reset_url}
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)

    @staticmethod
    async def enviar_email_test(email: str, db: SessionLocal):
        """Enviar email de prueba usando configuración manual"""
        asunto = "Email de prueba - PiarAPP"
        cuerpo_html = """
        <html>
            <body>
                <h2>¡Funciona!</h2>
                <p>Este es un email de prueba desde la configuración de PiarAPP.</p>
            </body>
        </html>
        """
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    @staticmethod
    async def _enviar_email(destinatario: str, asunto: str, cuerpo_html: str):
        """Enviar email usando SMTP desde BD"""
        
        # Obtener configuración de DB
        db = SessionLocal()
        try:
            if db.bind and db.bind.dialect.name == "sqlite":
                columns = db.execute(text("PRAGMA table_info(system_config)"))
                column_names = {row[1] for row in columns}
                if "frontend_url" not in column_names:
                    db.execute(text("ALTER TABLE system_config ADD COLUMN frontend_url VARCHAR(255)"))
                    db.commit()

            config = db.query(SystemConfig).first()
            
            if not config or not config.smtp_server:
                # Si no hay configuración de SMTP, log y continúa (para desarrollo)
                print(f"[EMAIL MOCK] To: {destinatario} | Subject: {asunto}")
                print(f"[EMAIL MOCK] Sin servidor SMTP configurado en BD")
                return

            # Preparar datos para evitar problemas de thread-safety con objeto SQLAlchemy
            smtp_config = {
                "server": config.smtp_server,
                "port": config.smtp_port,
                "user": config.smtp_username,
                "password": config.smtp_password,
                "from_email": config.smtp_from_email or "noreply@piarapp.com",
                "use_tls": config.smtp_use_tls,
                "use_ssl": config.smtp_use_ssl
            }
            
            # Crear mensaje
            mensaje = MIMEMultipart("alternative")
            mensaje["Subject"] = asunto
            mensaje["From"] = smtp_config["from_email"]
            mensaje["To"] = destinatario
            
            # Adjuntar versión HTML
            parte_html = MIMEText(cuerpo_html, "html")
            mensaje.attach(parte_html)
            
            # Enviar en una tarea asíncrona
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                EmailService._enviar_smtp,
                mensaje,
                smtp_config
            )
            
        except Exception as e:
            print(f"[EMAIL ERROR] Error al enviar email a {destinatario}: {str(e)}")
        finally:
            db.close()
    
    
    @staticmethod
    def _enviar_smtp(mensaje: MIMEMultipart, config: dict):
        """Enviar email usando SMTP (función síncrona)"""
        
        try:
            if config["use_ssl"]:
                with smtplib.SMTP_SSL(config["server"], config["port"]) as server:
                    if config["user"] and config["password"]:
                        server.login(config["user"], config["password"])
                    server.send_message(mensaje)
            else:
                with smtplib.SMTP(config["server"], config["port"]) as server:
                    if config["use_tls"]:
                        server.starttls()
                    
                    if config["user"] and config["password"]:
                        server.login(config["user"], config["password"])
                    
                    server.send_message(mensaje)
            print(f"[EMAIL SUCCESS] Enviado a {mensaje['To']}")
        except Exception as e:
            print(f"[EMAIL SMTP ERROR] {str(e)}")
            raise e