import sys
import os

# Añadir el directorio actual al path
sys.path.append(os.path.dirname(__file__))

# Importar desde app
try:
    from app.database.db import SessionLocal
    from app.models.usuario import Usuario

    def check_superadmin(email):
        db = SessionLocal()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            if usuario:
                print(f"Usuario: {usuario.email}")
                print(f"Es Superadmin: {usuario.es_superadmin}")
                if usuario.es_superadmin:
                    print("VERIFICACION_EXITOSA")
                else:
                    print("VERIFICACION_FALLIDA: es_superadmin=False")
                    # Intento fix rápido
                    usuario.es_superadmin = True
                    db.commit()
                    print("CORREGIDO: Se ha establecido es_superadmin=True")
            else:
                print(f"Usuario {email} no encontrado.")
        except Exception as e:
            print(f"Error consultando DB: {e}")
        finally:
            db.close()

    if __name__ == "__main__":
        check_superadmin("whitegollum@gmail.com")

except ImportError as e:
    print(f"Error importando modulos: {e}")
except Exception as e:
    print(f"Error general: {e}")
