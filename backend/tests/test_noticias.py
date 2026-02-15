import pytest
import uuid
import httpx
from app.main import app

# Helper to create a unique user and get token
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
    user_data = reg_resp.json()
    
    # Login
    login_resp = await client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    # The login endpoint might expect form data (OAuth2PasswordRequestForm) or JSON depending on implementation. 
    # Let's check auth route. The test_auth.py used JSON for login, but let's verify if standard FastAPI OAuth2 relies on form data.
    # Re-reading test_auth.py: valid login IS using JSON in that test? 
    # "json={'email': email, 'password': 'Password123'}" 
    # Let's stick to that if it works.
    
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["tokens"]["access_token"]
    return token, user_data

# Helper to create a club
async def create_club(client, token, name="Club Test"):
    slug = f"club-{uuid.uuid4().hex[:8]}"
    resp = await client.post(
        "/api/clubes",
        json={
            "nombre": name,
            "slug": slug,
            "descripcion": "Descripción test"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    return resp.json()

@pytest.mark.anyio
async def test_noticias_crud():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup: Create User and Club
        token, user = await create_user_and_login(client)
        club = await create_club(client, token)
        club_id = club["id"]
        
        # 2. Test Create Noticia
        noticia_data = {
            "titulo": "Nueva Noticia Importante",
            "contenido": "Contenido detallado de la noticia para pruebas.",
            "categoria": "anuncio",
            "imagen_url": "http://ejemplo.com/img.jpg",
            "visible_para": "socios",
            "permite_comentarios": True
        }
        
        resp_create = await client.post(
            f"/api/clubes/{club_id}/noticias",
            json=noticia_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_create.status_code == 200
        data_create = resp_create.json()
        assert data_create["titulo"] == noticia_data["titulo"]
        assert data_create["categoria"] == "anuncio"
        noticia_id = data_create["id"]
        
        # 3. Test Read Noticia (List)
        resp_list = await client.get(
            f"/api/clubes/{club_id}/noticias",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_list.status_code == 200
        data_list = resp_list.json()
        assert len(data_list) > 0
        assert data_list[0]["id"] == noticia_id
        
        # 4. Test Read Noticia (Single)
        resp_get = await client.get(
            f"/api/clubes/{club_id}/noticias/{noticia_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_get.status_code == 200
        assert resp_get.json()["titulo"] == noticia_data["titulo"]
        
        # 5. Test Update Noticia
        update_data = {
            "titulo": "Titulo Actualizado",
            "visible_para": "publico"
        }
        resp_update = await client.put(
            f"/api/clubes/{club_id}/noticias/{noticia_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_update.status_code == 200
        updated_noticia = resp_update.json()
        assert updated_noticia["titulo"] == "Titulo Actualizado"
        assert updated_noticia["visible_para"] == "publico"
        # Check unchanged field
        assert updated_noticia["contenido"] == noticia_data["contenido"]
        
        # 6. Test Delete Noticia
        resp_delete = await client.delete(
            f"/api/clubes/{club_id}/noticias/{noticia_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_delete.status_code == 200
        
        # Verify deletion
        resp_get_after = await client.get(
            f"/api/clubes/{club_id}/noticias/{noticia_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_get_after.status_code == 404

@pytest.mark.anyio
async def test_noticias_permissions():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Admin User
        token_admin, _ = await create_user_and_login(client)
        club = await create_club(client, token_admin)
        club_id = club["id"]
        
        # Create a news item as admin
        resp = await client.post(
            f"/api/clubes/{club_id}/noticias",
            json={
                "titulo": "Noticia Admin",
                "contenido": "Contenido...",
                "categoria": "general"
            },
            headers={"Authorization": f"Bearer {token_admin}"}
        )
        assert resp.status_code == 200
        
        # Second User (Not a member)
        token_user2, _ = await create_user_and_login(client)
        
        # Try to read news (should fail if not member, according to logic)
        resp_read = await client.get(
            f"/api/clubes/{club_id}/noticias",
            headers={"Authorization": f"Bearer {token_user2}"}
        )
        # Based on code: "Verificar que el usuario es miembro del club" -> 403
        assert resp_read.status_code == 403
        
        # Try to create news (should fail)
        resp_create = await client.post(
            f"/api/clubes/{club_id}/noticias",
            json={"titulo": "Hacker News", "contenido": "Intruder Alert! This content is long enough."},
            headers={"Authorization": f"Bearer {token_user2}"}
        )
        assert resp_create.status_code == 403
