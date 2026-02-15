import sys
import os
import json

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.club import Club
from app.models.evento import Evento
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from datetime import datetime, timedelta

def seed_eventos():
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
            club_id = club.id
        else:
            print(f"Usando Club ID {club_id}: {club.nombre}")

        # 2. Obtener responsable (Admin)
        miembro_admin = db.query(MiembroClub).filter(
            MiembroClub.club_id == club_id,
            MiembroClub.rol == "administrador"
        ).first()
        
        responsable_id = miembro_admin.usuario_id if miembro_admin else club.creador_id
        if not responsable_id:
             responsable_id = db.query(Usuario).first().id

        print(f"Usando Responsable ID: {responsable_id}")

        now = datetime.now()
        
        # 3. Datos de prueba
        eventos_data = [
            {
                "nombre": "Campeonato Regional de Acrobacias",
                "descripcion": "El campeonato anual donde los mejores pilotos de la región demuestran sus habilidades. Habrá categorías F3A y Freestyle. Barbacoa al finalizar.",
                "tipo": "competicion",
                "fecha_inicio": now + timedelta(days=15),
                "fecha_fin": now + timedelta(days=15, hours=8),
                "hora_inicio": "09:00",
                "hora_fin": "17:00",
                "ubicacion": "Pista Principal",
                "aforo_maximo": 100,
                "requisitos": {"licencia": True, "seguro": True, "nivel": "avanzado"},
                "estado": "no_iniciado"
            },
            {
                "nombre": "Día del Club y Puertas Abiertas",
                "descripcion": "Jornada festiva para invitar a amigos y familiares. Exhibiciones de drones y vuelo circular. Comida comunitaria.",
                "tipo": "social",
                "fecha_inicio": now + timedelta(days=5),
                "fecha_fin": now + timedelta(days=5, hours=6),
                "hora_inicio": "10:00",
                "hora_fin": "16:00",
                "ubicacion": "Zona Social y Pista",
                "aforo_maximo": 200,
                "requisitos": {"licencia": False}, # Abierto al público
                "estado": "no_iniciado"
            },
            {
                "nombre": "Curso de Iniciación a Drones",
                "descripcion": "Taller teórico-práctico para aprender a volar cuadricópteros. Incluye simulador y vuelo real con doble mando.",
                "tipo": "formacion",
                "fecha_inicio": now + timedelta(days=2),
                "fecha_fin": now + timedelta(days=2, hours=4),
                "hora_inicio": "16:00",
                "hora_fin": "20:00",
                "ubicacion": "Aula 1",
                "aforo_maximo": 15,
                "requisitos": {"material_propio": "Opcional"},
                "estado": "no_iniciado"
            },
            {
                "nombre": "Vuelo Nocturno de Verano",
                "descripcion": "Evento pasado para probar nuestras luces LED.",
                "tipo": "volar_grupo",
                "fecha_inicio": now - timedelta(days=10),
                "fecha_fin": now - timedelta(days=10, hours=3),
                "hora_inicio": "21:00",
                "hora_fin": "00:00",
                "ubicacion": "Pista Principal",
                "aforo_maximo": 30,
                "estado": "finalizado"
            }
        ]

        # 4. Insertar
        count = 0
        for data in eventos_data:
            # Check for duplicates based on name and date
            exists = db.query(Evento).filter(
                Evento.club_id == club_id, 
                Evento.nombre == data["nombre"]
            ).first()
            
            if not exists:
                nuevo_evento = Evento(
                    club_id=club_id,
                    contacto_responsable_id=responsable_id,
                    nombre=data["nombre"],
                    descripcion=data["descripcion"],
                    tipo=data["tipo"],
                    fecha_inicio=data["fecha_inicio"],
                    fecha_fin=data.get("fecha_fin"),
                    hora_inicio=data.get("hora_inicio"),
                    hora_fin=data.get("hora_fin"),
                    ubicacion=data.get("ubicacion"),
                    aforo_maximo=data.get("aforo_maximo"),
                    requisitos=data.get("requisitos", {}),
                    estado=data["estado"],
                    permite_comentarios=True,
                    fecha_creacion=now
                )
                db.add(nuevo_evento)
                count += 1
        
        db.commit()
        print(f"Se han insertado {count} eventos nuevos para el club {club.nombre}.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_eventos()
