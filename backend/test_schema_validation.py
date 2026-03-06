"""Quick test to validate NoticiaCreate schema"""
from app.schemas.noticia import NoticiaCreate
import json

# Simulate frontend data with empty strings
frontend_data = {
    "titulo": "Test Noticia",
    "contenido": "Este es un contenido de prueba que tiene más de 10 caracteres.",
    "categoria": "general",
    "imagen_url": "",  # Empty string like frontend sends
    "visible_para": "socios",
    "permite_comentarios": True
}

print("Testing NoticiaCreate schema validation...")
print(f"Input data: {json.dumps(frontend_data, indent=2)}")

try:
    noticia = NoticiaCreate(**frontend_data)
    print("\n✅ Validation PASSED")
    print(f"Parsed data: {noticia.model_dump()}")
    print(f"imagen_url is None: {noticia.imagen_url is None}")
except Exception as e:
    print(f"\n❌ Validation FAILED: {e}")

# Test with null
frontend_data_null = {
    "titulo": "Test Noticia 2",
    "contenido": "Otro contenido de prueba con más de 10 caracteres.",
    "categoria": "general",
    "imagen_url": None,
    "visible_para": "socios",
    "permite_comentarios": True
}

print("\n" + "="*50)
print("Testing with null imagen_url...")
print(f"Input data: {json.dumps(frontend_data_null, indent=2)}")

try:
    noticia2 = NoticiaCreate(**frontend_data_null)
    print("\n✅ Validation PASSED")
    print(f"Parsed data: {noticia2.model_dump()}")
except Exception as e:
    print(f"\n❌ Validation FAILED: {e}")

# Test minimal data (using defaults)
minimal_data = {
    "titulo": "Minimal Test",
    "contenido": "Solo lo mínimo requerido para crear una noticia."
}

print("\n" + "="*50)
print("Testing with minimal data (defaults)...")
print(f"Input data: {json.dumps(minimal_data, indent=2)}")

try:
    noticia3 = NoticiaCreate(**minimal_data)
    print("\n✅ Validation PASSED")
    print(f"Parsed data: {noticia3.model_dump()}")
except Exception as e:
    print(f"\n❌ Validation FAILED: {e}")
