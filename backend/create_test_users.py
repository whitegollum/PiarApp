#!/usr/bin/env python
"""
Script para crear usuarios de prueba en la base de datos PiarAPP.
Uso: python create_test_users.py
"""

import sys
from app.database.db import SessionLocal
from app.models.usuario import Usuario
from app.utils.security import AuthUtils

# Lista de usuarios de prueba
TEST_USERS = [
    {
        "email": "test@example.com",
        "nombre_completo": "Usuario Prueba",
        "password": "Password123"
    },
    {
        "email": "admin@piar.com",
        "nombre_completo": "Administrador PiarAPP",
        "password": "Admin123456"
    },
    {
        "email": "juan@example.com",
        "nombre_completo": "Juan García",
        "password": "Juan123456"
    },
    {
        "email": "maria@example.com",
        "nombre_completo": "María López",
        "password": "Maria123456"
    },
    {
        "email": "carlos@example.com",
        "nombre_completo": "Carlos Rodríguez",
        "password": "Carlos123456"
    },
]


def create_users():
    """Crea usuarios de prueba en la base de datos"""
    db = SessionLocal()
    
    try:
        usuarios_creados = 0
        usuarios_existentes = 0
        
        print("=" * 60)
        print("Creando usuarios de prueba...")
        print("=" * 60)
        
        for user_data in TEST_USERS:
            # Verificar si el usuario ya existe
            usuario_existente = db.query(Usuario).filter(
                Usuario.email == user_data["email"]
            ).first()
            
            if usuario_existente:
                print(f"⚠️  {user_data['email']} - Ya existe")
                usuarios_existentes += 1
                continue
            
            # Crear nuevo usuario
            usuario = Usuario(
                email=user_data["email"],
                nombre_completo=user_data["nombre_completo"],
                contraseña_hash=AuthUtils.hash_password(user_data["password"]),
                email_verificado=True,
                activo=True
            )
            
            db.add(usuario)
            db.commit()
            
            print(f"✅ {user_data['email']} - Creado")
            print(f"   Contraseña: {user_data['password']}")
            usuarios_creados += 1
        
        print("=" * 60)
        print(f"Resultado:")
        print(f"  ✅ Usuarios creados: {usuarios_creados}")
        print(f"  ⚠️  Usuarios existentes: {usuarios_existentes}")
        print("=" * 60)
        
        if usuarios_creados > 0:
            print("\n✓ ¡Usuarios de prueba listos para usar!")
            print("\nPuedes acceder a http://localhost:5175 con cualquiera de estos datos:")
            for user in TEST_USERS:
                print(f"  • {user['email']} / {user['password']}")
        
    except Exception as e:
        print(f"\n❌ Error al crear usuarios: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


def delete_all_users():
    """Elimina todos los usuarios de prueba"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("¿Estás seguro de que quieres eliminar todos los usuarios?")
        print("Este cambio no se puede deshacer.")
        respuesta = input("Escribe 'si' para confirmar: ").strip().lower()
        
        if respuesta != "si":
            print("Operación cancelada.")
            return
        
        # Eliminar todos los usuarios de prueba
        deleted_count = db.query(Usuario).delete()
        db.commit()
        
        print(f"✅ {deleted_count} usuarios eliminados de la base de datos")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error al eliminar usuarios: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


def list_users():
    """Lista todos los usuarios en la base de datos"""
    db = SessionLocal()
    
    try:
        usuarios = db.query(Usuario).all()
        
        print("=" * 60)
        print("Usuarios en la base de datos:")
        print("=" * 60)
        
        if not usuarios:
            print("No hay usuarios creados")
        else:
            for i, usuario in enumerate(usuarios, 1):
                estado = "✅ Activo" if usuario.activo else "❌ Inactivo"
                email_estado = "✓" if usuario.email_verificado else "✗"
                print(f"{i}. {usuario.email}")
                print(f"   Nombre: {usuario.nombre_completo}")
                print(f"   Estado: {estado}")
                print(f"   Email verificado: {email_estado}")
                print()
        
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error al listar usuarios: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        comando = sys.argv[1].lower()
        
        if comando == "crear":
            create_users()
        elif comando == "listar":
            list_users()
        elif comando == "limpiar":
            delete_all_users()
        else:
            print("Comando no reconocido")
            print("\nUso:")
            print("  python create_test_users.py crear   - Crear usuarios de prueba")
            print("  python create_test_users.py listar  - Listar usuarios")
            print("  python create_test_users.py limpiar - Eliminar todos los usuarios")
    else:
        # Por defecto, crear usuarios
        create_users()
