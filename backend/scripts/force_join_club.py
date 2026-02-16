import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.noticia import Noticia
from app.models.comentario import Comentario
from app.models.instalacion import ContrasenaInstalacion

def force_join_club(email, club_id, role="miembro"):
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(Usuario.email == email).first()
        if not user:
            print(f"User not found: {email}")
            return
        
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            # Create dummy club if not exists
            print(f"Club {club_id} not found. Creating dummy club.")
            club = Club(
                id=club_id,
                nombre=f"Club {club_id}",
                slug=f"club-{club_id}",
                creado_por_id=user.id
            )
            db.add(club)
            db.commit()
            db.refresh(club)

        membership = db.query(MiembroClub).filter(
            MiembroClub.usuario_id == user.id,
            MiembroClub.club_id == club.id
        ).first()

        if membership:
            if membership.rol != role:
                membership.rol = role
                print(f"Updated role for {email} to {role}")
            else:
                print(f"{email} is already {role} of Club {club_id}")
        else:
            membership = MiembroClub(
                usuario_id=user.id,
                club_id=club.id,
                rol=role,
                estado="activo"
            )
            db.add(membership)
            print(f"Added {email} to Club {club_id} as {role}")

        db.commit()

    except Exception as e:
        print(f"Error forced join: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python force_join_club.py <email> <club_id> [role]")
    else:
        email = sys.argv[1]
        club_id = int(sys.argv[2])
        role = sys.argv[3] if len(sys.argv) > 3 else "miembro"
        force_join_club(email, club_id, role)
