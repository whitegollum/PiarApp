import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.club import Club
from app.models.noticia import Noticia
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from datetime import datetime, timedelta

def seed_noticias():
    db = SessionLocal()
    try:
        # 1. Verificar Club Cerditos (ID 2)
        club_id = 2
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            print(f"Club con ID {club_id} no encontrado. Buscando por nombre 'Cerditos'...")
            club = db.query(Club).filter(Club.nombre.ilike("%Cerditos%")).first()
            if not club:
                print("No se encontró el club 'Cerditos'. Abortando.")
                return
            print(f"Encontrado club '{club.nombre}' con ID {club.id}")
            club_id = club.id
        else:
            print(f"Usando Club ID {club_id}: {club.nombre}")

        # 2. Obtener un autor (Admin del club o el creador)
        miembro_admin = db.query(MiembroClub).filter(
            MiembroClub.club_id == club_id,
            MiembroClub.rol == "administrador"
        ).first()
        
        autor_id = miembro_admin.usuario_id if miembro_admin else club.creador_id
        if not autor_id:
             # Fallback to first user
             autor_id = db.query(Usuario).first().id

        print(f"Usando Autor ID: {autor_id}")

        # 3. Datos de prueba
        noticias_data = [
            {
                "titulo": "¡Bienvenidos al Club Cerditos!",
                "contenido": "Nos complace dar la bienvenida a todos los nuevos miembros a esta temporada de vuelo. Recordad revisar las normas de seguridad en la pista.",
                "categoria": "general",
                "imagen_url": "https://images.unsplash.com/photo-1559677363-22879599583d?auto=format&fit=crop&q=80&w=800",
                "visible_para": "publico",
                "estado": "publicada"
            },
            {
                "titulo": "Reunión Mensual de Socios",
                "contenido": "Este próximo fin de semana tendremos nuestra reunión mensual para discutir las mejoras en la pista de aterrizaje. ¡Tu opinión cuenta!",
                "categoria": "anuncio",
                "imagen_url": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800",
                "visible_para": "socios",
                "estado": "publicada"
            },
            {
                "titulo": "Resultados Competición Local",
                "contenido": "Felicitaciones a Juan Pérez por su primer lugar en acrobacias. Aquí están los resultados completos...",
                "categoria": "resultado",
                "imagen_url": "https://images.unsplash.com/photo-1531326233772-243869752a6d?auto=format&fit=crop&q=80&w=800",
                "visible_para": "socios",
                "estado": "publicada"
            },
            {
                "titulo": "Mantenimiento de Pista Programado",
                "contenido": "La pista principal permanecerá cerrada este jueves por tareas de mantenimiento y repintado de líneas.",
                "categoria": "urgente",
                "visible_para": "publico",
                "estado": "publicada"
            },
            {
                "titulo": "Nuevas tasas para 2026",
                "contenido": "Se ha aprobado la actualización de cuotas para el ejercicio 2026. Consultad el documento adjunto en la sección de documentos.",
                "categoria": "administrativo",
                "visible_para": "socios",
                "estado": "borrador" # Esta no debería salir en listas públicas normales si filtramos
            }
        ]

        # 4. Insertar
        count = 0
        for data in noticias_data:
            # Check for duplicates
            exists = db.query(Noticia).filter(
                Noticia.club_id == club_id, 
                Noticia.titulo == data["titulo"]
            ).first()
            
            if not exists:
                nueva_noticia = Noticia(
                    club_id=club_id,
                    autor_id=autor_id,
                    titulo=data["titulo"],
                    contenido=data["contenido"],
                    categoria=data["categoria"],
                    imagen_url=data.get("imagen_url"),
                    visible_para=data["visible_para"],
                    estado=data["estado"],
                    permite_comentarios=True,
                    fecha_creacion=datetime.now() - timedelta(days=count) # Crear en días diferentes
                )
                db.add(nueva_noticia)
                count += 1
        
        db.commit()
        print(f"Se han insertado {count} noticias nuevas para el club {club.nombre}.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_noticias()
