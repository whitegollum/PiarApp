"""Tests funcionales E2E para Tareas Comunitarias"""
import uuid
import httpx
import pytest
from app.main import app
from app.database.db import SessionLocal
from app.models.usuario import Usuario


async def create_user_and_login(client: httpx.AsyncClient, suffix: str = ""):
    email = f"test-func-{uuid.uuid4().hex[:8]}{suffix}@example.com"
    await client.post("/api/auth/registro", json={
        "nombre_completo": f"Func User {suffix}",
        "email": email,
        "password": "Password123"
    })
    # Make user superadmin so they can create clubs
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(Usuario.email == email).first()
        if user:
            user.es_superadmin = True
            db.commit()
    finally:
        db.close()
    login_resp = await client.post("/api/auth/login", json={
        "email": email, "password": "Password123"
    })
    tokens = login_resp.json().get("tokens", {})
    return tokens.get("access_token"), email


async def create_club(client: httpx.AsyncClient, token: str):
    slug = f"club-func-{uuid.uuid4().hex[:6]}"
    resp = await client.post("/api/clubes", json={
        "nombre": f"Club Func {uuid.uuid4().hex[:6]}",
        "slug": slug,
        "descripcion": "Club funcional"
    }, headers={"Authorization": f"Bearer {token}"})
    return resp.json().get("id")


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_flujo_completo_feliz():
    """Admin crea tarea -> Usuario se inscribe -> Admin aprueba -> Puntos en ranking"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token, _ = await create_user_and_login(client, "flow1")
        club_id = await create_club(client, token)
        if not club_id:
            pytest.skip("No se pudo crear club")

        # 1. Crear tarea
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias",
            json={"titulo": "Reparar pista", "puntos": 50, "prioridad": "alta", "categoria": "infraestructura"},
            headers=auth_headers(token)
        )
        assert resp.status_code == 200
        tarea_id = resp.json()["id"]

        # 2. Inscribirse
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/inscribirse",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200

        # 3. Aprobar
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/aprobar",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200
        assert resp.json()["participantes_premiados"] == 1

        # 4. Verificar ranking
        resp = await client.get(f"/api/clubes/{club_id}/ranking", headers=auth_headers(token))
        assert resp.status_code == 200
        ranking = resp.json()
        assert len(ranking) == 1
        assert ranking[0]["puntos_totales"] == 50
        assert ranking[0]["posicion"] == 1

        # 5. Verificar tarea está completada
        resp = await client.get(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}",
            headers=auth_headers(token)
        )
        assert resp.json()["estado"] == "completada"


@pytest.mark.asyncio
async def test_flujo_rechazo():
    """Admin crea -> Usuario se inscribe -> Admin rechaza -> Sin puntos"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token, _ = await create_user_and_login(client, "flow2")
        club_id = await create_club(client, token)
        if not club_id:
            pytest.skip("No se pudo crear club")

        # Crear e inscribirse
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias",
            json={"titulo": "Tarea fallida", "puntos": 30},
            headers=auth_headers(token)
        )
        tarea_id = resp.json()["id"]

        await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/inscribirse",
            headers=auth_headers(token)
        )

        # Rechazar
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/rechazar",
            json={"motivo": "No se realizó la tarea"},
            headers=auth_headers(token)
        )
        assert resp.status_code == 200

        # Verificar sin puntos en ranking
        resp = await client.get(f"/api/clubes/{club_id}/ranking", headers=auth_headers(token))
        ranking = resp.json()
        assert len(ranking) == 0

        # Verificar motivo visible
        resp = await client.get(
            f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}",
            headers=auth_headers(token)
        )
        data = resp.json()
        assert data["estado"] == "rechazada"
        assert data["motivo_rechazo"] == "No se realizó la tarea"


@pytest.mark.asyncio
async def test_flujo_periodo_completo():
    """Crear periodo -> Realizar tareas -> Cerrar periodo -> Confirmar premios"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token, _ = await create_user_and_login(client, "flow3")
        club_id = await create_club(client, token)
        if not club_id:
            pytest.skip("No se pudo crear club")

        # Crear periodo
        resp = await client.post(
            f"/api/clubes/{club_id}/periodos-premios",
            json={
                "nombre": "Q1 2026",
                "fecha_inicio": "2026-01-01T00:00:00",
                "fecha_fin": "2026-12-31T23:59:59",
                "tipo": "anual"
            },
            headers=auth_headers(token)
        )
        periodo_id = resp.json()["id"]

        # Crear premios
        for pos in [1, 2, 3]:
            await client.post(
                f"/api/clubes/{club_id}/periodos-premios/{periodo_id}/premios",
                json={"nombre": f"Premio #{pos}", "posicion": pos},
                headers=auth_headers(token)
            )

        # Crear y completar una tarea
        resp = await client.post(
            f"/api/clubes/{club_id}/tareas-comunitarias",
            json={"titulo": "Tarea periodo", "puntos": 100},
            headers=auth_headers(token)
        )
        tarea_id = resp.json()["id"]
        await client.post(f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/inscribirse", headers=auth_headers(token))
        await client.post(f"/api/clubes/{club_id}/tareas-comunitarias/{tarea_id}/aprobar", headers=auth_headers(token))

        # Cerrar periodo
        resp = await client.post(
            f"/api/clubes/{club_id}/periodos-premios/{periodo_id}/cerrar",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200

        # Verificar que el premio #1 tiene usuario asignado
        resp = await client.get(
            f"/api/clubes/{club_id}/periodos-premios/{periodo_id}",
            headers=auth_headers(token)
        )
        periodo_data = resp.json()
        assert periodo_data["estado"] == "cerrado"
        premio1 = next(p for p in periodo_data["premios"] if p["posicion"] == 1)
        assert premio1["usuario_id"] is not None

        # Confirmar premios
        resp = await client.post(
            f"/api/clubes/{club_id}/periodos-premios/{periodo_id}/confirmar",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200

        # Verificar confirmado
        resp = await client.get(
            f"/api/clubes/{club_id}/periodos-premios/{periodo_id}",
            headers=auth_headers(token)
        )
        assert resp.json()["estado"] == "confirmado"
        assert resp.json()["premios"][0]["confirmado"] is True


@pytest.mark.asyncio
async def test_filtros_tareas():
    """Verificar que los filtros funcionan correctamente"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token, _ = await create_user_and_login(client, "flow4")
        club_id = await create_club(client, token)
        if not club_id:
            pytest.skip("No se pudo crear club")

        # Crear tareas con diferentes categorías y prioridades
        await client.post(f"/api/clubes/{club_id}/tareas-comunitarias",
            json={"titulo": "T1", "puntos": 5, "categoria": "limpieza", "prioridad": "alta"},
            headers=auth_headers(token))
        await client.post(f"/api/clubes/{club_id}/tareas-comunitarias",
            json={"titulo": "T2", "puntos": 10, "categoria": "evento", "prioridad": "baja"},
            headers=auth_headers(token))

        # Filtrar por categoría
        resp = await client.get(
            f"/api/clubes/{club_id}/tareas-comunitarias?categoria=limpieza",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200
        tareas = resp.json()
        assert all(t["categoria"] == "limpieza" for t in tareas)

        # Filtrar por prioridad
        resp = await client.get(
            f"/api/clubes/{club_id}/tareas-comunitarias?prioridad=alta",
            headers=auth_headers(token)
        )
        assert resp.status_code == 200
        tareas = resp.json()
        assert all(t["prioridad"] == "alta" for t in tareas)
