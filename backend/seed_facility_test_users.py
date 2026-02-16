import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import SessionLocal
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.noticia import Noticia
from app.models.comentario import Comentario
from app.models.instalacion import ContrasenaInstalacion
from app.utils.security import AuthUtils


def seed_users():
    db = SessionLocal()
    try:
        # 1. Create Users
        # Admin User
        admin_email = "admin@piar.com"
        admin_user = db.query(Usuario).filter(Usuario.email == admin_email).first()
        if not admin_user:
            print(f"Creating admin user: {admin_email}")
            admin_user = Usuario(
                email=admin_email,
                nombre_completo="Admin User",
                contraseña_hash=AuthUtils.hash_password("Admin123"),
                activo=True,
                email_verificado=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        else:
            print(f"Updating admin user password: {admin_email}")
            admin_user.contraseña_hash = AuthUtils.hash_password("Admin123")
            db.commit()
            db.refresh(admin_user)

        # Member User
        member_email = "pepe@test.com"
        member_user = db.query(Usuario).filter(Usuario.email == member_email).first()
        if not member_user:
            print(f"Creating member user: {member_email}")
            member_user = Usuario(
                email=member_email,
                nombre_completo="Pepe Member",
                contraseña_hash=AuthUtils.hash_password("Test1234"),
                activo=True,
                email_verificado=True
            )
            db.add(member_user)
            db.commit()
            db.refresh(member_user)
        else:
            print(f"Updating member user password: {member_email}")
            member_user.contraseña_hash = AuthUtils.hash_password("Test1234")
            db.commit()
            db.refresh(member_user)

        # 2. Create Club
        club = db.query(Club).filter(Club.id == 1).first()
        if not club:
            print("Creating test club (ID 1)")
            club = Club(
                nombre="Club Aeromodelismo Test",
                slug="test-club",
                descripcion="Un club de prueba para tests",
                creado_por_id=admin_user.id
            )
            db.add(club)
            db.commit()
            db.refresh(club)
        else:
            print(f"Club found: {club.nombre}")

        # 3. Create Memberships
        # Admin Membership
        admin_member = db.query(MiembroClub).filter(
            MiembroClub.usuario_id == admin_user.id,
            MiembroClub.club_id == club.id
        ).first()

        if not admin_member:
            print(f"Adding admin membership for {admin_email}")
            admin_member = MiembroClub(
                usuario_id=admin_user.id,
                club_id=club.id,
                rol="administrador",
                estado="activo"
            )
            db.add(admin_member)
        else:
            # Updates role if needed
            if admin_member.rol != "administrador":
                 admin_member.rol = "administrador"
                 db.add(admin_member)
                 print(f"Updated {admin_email} role to administrador")
            print(f"Admin membership exists for {admin_email}")

        # Member Membership
        normal_member = db.query(MiembroClub).filter(
            MiembroClub.usuario_id == member_user.id,
            MiembroClub.club_id == club.id
        ).first()

        if not normal_member:
            print(f"Adding normal membership for {member_email}")
            normal_member = MiembroClub(
                usuario_id=member_user.id,
                club_id=club.id,
                rol="miembro",
                estado="activo"
            )
            db.add(normal_member)
        else:
            print(f"Normal membership exists for {member_email}")

        db.commit()
        print("Seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
