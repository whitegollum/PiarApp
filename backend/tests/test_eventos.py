import pytest
import uuid
import httpx
from app.main import app
from datetime import datetime, timedelta

# Helper (copied from test_noticias for independence, normally should be in conftest or utils)
async def create_user_and_login(client, email=None):
    if not email:
        email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"
    
    # Register
    reg_resp = await client.post(
        "/api/auth/registro",
        json={
            "nombre_completo": "Test User",
            "email": email,
            "password": password
        }
    )
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    
    # Login
    login_resp = await client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["tokens"]["access_token"]
    return token

async def create_club_helper(client, token):
    slug = f"club-{uuid.uuid4().hex[:8]}"
    resp = await client.post(
        "/api/clubes",
        json={"nombre": "Club Eventos", "slug": slug, "descripcion": "Desc"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    return resp.json()

@pytest.mark.anyio
async def test_eventos_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Setup
        token = await create_user_and_login(client)
        club = await create_club_helper(client, token)
        club_id = club["id"]
        
        # 1. Create Evento
        fecha_inicio = (datetime.now() + timedelta(days=5)).isoformat()
        fecha_fin = (datetime.now() + timedelta(days=5, hours=2)).isoformat()
        
        evento_data = {
            "nombre": "Torneo de Vuelo",
            "descripcion": "Competición anual de acrobacias.",
            "tipo": "competicion",
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "hora_inicio": "10:00",
            "hora_fin": "12:00",
            "ubicacion": "Campo Principal",
            "aforo_maximo": 50,
            "requisitos": {"nivel": "avanzado", "licencia": True},
            "permite_comentarios": True
        }
        
        resp_create = await client.post(
            f"/api/clubes/{club_id}/eventos",
            json=evento_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_create.status_code == 200
        created_event = resp_create.json()
        assert created_event["nombre"] == "Torneo de Vuelo"
        assert created_event["requisitos"]["nivel"] == "avanzado"
        assert created_event["tipo"] == "competicion"
        evento_id = created_event["id"]
        
        # 2. Get Evento List
        resp_list = await client.get(
            f"/api/clubes/{club_id}/eventos",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_list.status_code == 200
        assert len(resp_list.json()) > 0
        
        # 3. Update Evento
        update_payload = {
            "nombre": "Gran Torneo de Vuelo",
            "aforo_maximo": 100
        }
        resp_update = await client.put(
            f"/api/clubes/{club_id}/eventos/{evento_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_update.status_code == 200
        updated = resp_update.json()
        assert updated["nombre"] == "Gran Torneo de Vuelo"
        # Check if original data persisted
        assert updated["tipo"] == "competicion" 
        
        # 4. Delete Evento
        resp_delete = await client.delete(
            f"/api/clubes/{club_id}/eventos/{evento_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_delete.status_code == 200
        
        # 5. Verify Deletion
        resp_get = await client.get(
            f"/api/clubes/{club_id}/eventos/{evento_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_get.status_code == 404
