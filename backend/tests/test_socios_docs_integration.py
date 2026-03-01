import os
# Set env var BEFORE importing app
os.environ["DATABASE_URL"] = "sqlite:///./test_temp_integration.db"

import pytest
from fastapi import status
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.db import Base, get_db
from app.main import app
from app.models.socio import Socio
from app.models.documentacion_reglamentaria import DocumentacionReglamentaria
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    # Debug: Check if tables are registered
    print(f"Registered tables: {Base.metadata.tables.keys()}")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Debug: Check if tables exist in DB
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [row[0] for row in result]
        print(f"Existing tables in DB: {tables}")
        
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def auth_headers(client):
    """Create a user and return auth headers"""
    # Create user
    user_data = {
        "email": "test@example.com",
        "password": "password123",
        "nombre_completo": "Test User"
    }
    # Fix: endpoint is /registro, not /register
    res = client.post("/api/auth/registro", json=user_data)
    if res.status_code != 200:
        print(f"Registration failed: {res.json()}")
    
    # Login
    # Fix: endpoint is /login, expects JSON, not form data
    login_data = {"email": "test@example.com", "password": "password123"}
    response = client.post("/api/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.json()}")
    
    # Fix: token is nested in "tokens"
    data = response.json()
    token = data.get("tokens", {}).get("access_token")
    
    if not token:
        raise ValueError(f"No access token returned: {data}")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def admin_headers(client):
    """Create an admin user and return auth headers"""
    admin_data = {
        "email": "admin@example.com",
        "password": "password123",
        "nombre_completo": "Admin User"
    }
    # Fix: endpoint is /registro
    client.post("/api/auth/registro", json=admin_data)
    
    # Elevate to admin manually
    db = TestingSessionLocal()
    user = db.query(Usuario).filter(Usuario.email == "admin@example.com").first()
    if user:
        user.es_superadmin = True
        if hasattr(user, 'rol'):
            user.rol = "superadmin"
        db.commit()
    db.close()
    
    # Fix: endpoint is /login
    login_data = {"email": "admin@example.com", "password": "password123"}
    response = client.post("/api/auth/login", json=login_data)
    token = response.json().get("tokens", {}).get("access_token")
    return {"Authorization": f"Bearer {token}"}

def test_documentacion_flow(client, auth_headers, admin_headers):
    # 1. Initial State: No docs
    response = client.get("/api/documentacion/me", headers=auth_headers)
    assert response.status_code == 404

    # 2. Upload RC
    files = {'rc_archivo': ('rc.pdf', b'%PDF-1.4 content', 'application/pdf')}
    data = {'rc_numero': '12345'}
    response = client.post("/api/documentacion/me", headers=auth_headers, files=files, data=data)
    assert response.status_code == 200
    assert response.json()["rc_numero"] == "12345"
    assert response.json()["rc_tiene_archivo"] == True

    # 3. Download RC
    response = client.get("/api/documentacion/me/rc", headers=auth_headers)
    assert response.status_code == 200
    assert response.content == b'%PDF-1.4 content'

    # 4. Upload Carnet
    files = {'carnet_archivo': ('carnet.jpg', b'fakeimage', 'image/jpeg')}
    data = {'carnet_numero': 'P-999'}
    response = client.post("/api/documentacion/me", headers=auth_headers, files=files, data=data)
    assert response.status_code == 200
    assert response.json()["carnet_numero"] == "P-999"
    assert response.json()["carnet_tiene_archivo"] == True

    # 5. Admin can access user documentation
    # First get user id from self
    user_info = client.get("/api/auth/usuarios/me", headers=auth_headers).json()
    user_id = user_info["id"]

    # Admin gets docs
    response = client.get(f"/api/documentacion/usuarios/{user_id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["rc_numero"] == "12345"

    # Admin downloads RC
    response = client.get(f"/api/documentacion/usuarios/{user_id}/rc", headers=admin_headers)
    assert response.status_code == 200
    assert response.content == b'%PDF-1.4 content'

def test_socio_flow(client, auth_headers, admin_headers):
    # 1. Create Club (using Admin)
    club_data = {
        "nombre": "Test Club", 
        "slug": "test-club",
        "descripcion": "Club de prueba"
    }
    club_res = client.post("/api/clubes/", json=club_data, headers=admin_headers)
    if club_res.status_code != 200:
        print(f"Club creation failed: {club_res.json()}")
    club_id = club_res.json()["id"]

    # 2. Get User ID
    user_info = client.get("/api/auth/usuarios/me", headers=auth_headers).json()
    user_id = user_info["id"]

    # 3. Register User as Socio
    socio_data = {
        "club_id": club_id,
        "usuario_id": user_id,
        "nombre": "Socio Test",
        "email": "test@example.com"
    }
    response = client.post("/api/socios/", json=socio_data, headers=admin_headers)
    assert response.status_code == 200
    socio_id = response.json()["id"]

    # 4. Upload Photo
    files = {'file': ('photo.jpg', b'photoblob', 'image/jpeg')}
    response = client.post(f"/api/socios/{socio_id}/foto", files=files, headers=admin_headers)
    assert response.status_code == 200

    # 5. Get Photo
    response = client.get(f"/api/socios/{socio_id}/foto")
    assert response.status_code == 200
    assert response.content == b'photoblob'
    assert response.headers["content-type"] == "image/jpeg"

    # 6. Delete Socio
    response = client.delete(f"/api/socios/{socio_id}", headers=admin_headers)
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/api/socios/{socio_id}", headers=admin_headers)
    assert response.status_code == 404

