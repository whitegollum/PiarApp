import sys
import os

# Añadir el directorio raíz al path para poder importar módulos
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app.models.usuario import Usuario

def check_superadmin(email):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if usuario:
            print(f"Usuario: {usuario.email}")
            print(f"Es Superadmin: {usuario.es_superadmin}")
            if usuario.es_superadmin:
                print("VERIFICACIÓN EXITOSA: El usuario es superadmin.")
            else:
                print("VERIFICACIÓN FALLIDA: El usuario NO es superadmin.")
        else:
            print(f"Usuario {email} no encontrado.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_superadmin("whitegollum@gmail.com")
