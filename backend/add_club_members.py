#!/usr/bin/env python
import sys
from app.database.db import SessionLocal
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from app.utils.security import AuthUtils
from datetime import datetime

NEW_USERS = [
    {"email": "pepe@test.com", "nombre": "Pepe Attendee", "pass": "Test1234"},
    {"email": "laura@test.com", "nombre": "Laura Attendee", "pass": "Test1234"},
    {"email": "ana@test.com", "nombre": "Ana Attendee", "pass": "Test1234"},
    {"email": "david@test.com", "nombre": "David Attendee", "pass": "Test1234"},
]

CLUB_ID = 2

def run():
    db = SessionLocal()
    try:
        print(f"Adding users to Club ID {CLUB_ID}...")
        for u_data in NEW_USERS:
            # 1. Create or Get User
            user = db.query(Usuario).filter(Usuario.email == u_data["email"]).first()
            if not user:
                user = Usuario(
                    email=u_data["email"],
                    nombre_completo=u_data["nombre"],
                    contraseña_hash=AuthUtils.hash_password(u_data["pass"]),
                    email_verificado=True,
                    activo=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"Created User: {user.email}")
            else:
                print(f"User exists: {user.email}")

            # 2. Add to Club
            # Check if member exists
            member = db.query(MiembroClub).filter(
                MiembroClub.usuario_id == user.id,
                MiembroClub.club_id == CLUB_ID
            ).first()

            if not member:
                member = MiembroClub(
                    usuario_id=user.id,
                    club_id=CLUB_ID,
                    rol="socio",
                    estado="activo",
                    fecha_aprobacion=datetime.now()
                )
                db.add(member)
                db.commit()
                print(f" -> Added to Club {CLUB_ID} as 'socio'")
            else:
                print(f" -> Already a member of Club {CLUB_ID}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
