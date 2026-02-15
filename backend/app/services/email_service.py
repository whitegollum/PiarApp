"""Servicio de Email"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import asyncio


class EmailService:
    """Servicio para enviar emails"""
    
    @staticmethod
    async def enviar_invitacion_club(email: str, token: str, club_nombre: str):
        """Enviar email de invitación a club"""
        
        # URL para aceptar la invitación
        invitation_url = f"{settings.frontend_url}/auth/aceptar-invitacion?token={token}"
        
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
                        PiarAPP - Gestión de Clubs de Aeromodelismo
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    
    @staticmethod
    async def enviar_bienvenida_nuevo_usuario(email: str, nombre: str, club_nombre: str, token: str):
        """Enviar email de bienvenida a nuevo usuario con invitación"""
        
        # URL para registrarse desde la invitación
        registro_url = f"{settings.frontend_url}/auth/registrarse-desde-invitacion?token={token}"
        
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
                        {settings.frontend_url}
                    </p>
                </div>
            </body>
        </html>
        """
        
        await EmailService._enviar_email(email, asunto, cuerpo_html)
    
    
    @staticmethod
    async def enviar_verificacion_email(email: str, token: str):
        """Enviar email de verificación"""
        
        verification_url = f"{settings.frontend_url}/auth/verificar-email?token={token}"
        
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
        
        reset_url = f"{settings.frontend_url}/auth/reset-contrasena?token={token}"
        
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
    async def _enviar_email(destinatario: str, asunto: str, cuerpo_html: str):
        """Enviar email usando SMTP"""
        
        if not settings.smtp_server:
            # Si no hay configuración de SMTP, log y continúa (para desarrollo)
            print(f"[EMAIL] {asunto} -> {destinatario}")
            print(f"[EMAIL] Sin servidor SMTP configurado")
            return
        
        try:
            # Crear mensaje
            mensaje = MIMEMultipart("alternative")
            mensaje["Subject"] = asunto
            mensaje["From"] = settings.smtp_sender
            mensaje["To"] = destinatario
            
            # Adjuntar versión HTML
            parte_html = MIMEText(cuerpo_html, "html")
            mensaje.attach(parte_html)
            
            # Enviar en una tarea asíncrona
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                EmailService._enviar_smtp,
                mensaje
            )
            
        except Exception as e:
            print(f"[EMAIL ERROR] Error al enviar email a {destinatario}: {str(e)}")
    
    
    @staticmethod
    def _enviar_smtp(mensaje: MIMEMultipart):
        """Enviar email usando SMTP (función síncrona)"""
        
        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            
            server.send_message(mensaje)
