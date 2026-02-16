import os

os.makedirs("backend/data", exist_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///./backend/data/test_documentacion.db"

import uuid

import httpx
import pytest

from app.database.db import SessionLocal
from app.models.usuario import Usuario

from app.main import app


async def register_user(client, email=None):
    if not email:
        email = f"doc-{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"

    resp = await client.post(
        "/api/auth/registro",
        json={
            "nombre_completo": "Doc User",
            "email": email,
            "password": password
        }
    )
    assert resp.status_code == 200, resp.text

    return email, password


async def login_user(client, email, password):
    resp = await client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["tokens"]["access_token"]


@pytest.mark.anyio
async def test_documentacion_upsert_and_download():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        email, password = await register_user(client)
        token = await login_user(client, email, password)

        # No documentacion yet
        resp_get = await client.get(
            "/api/documentacion/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_get.status_code == 404

        rc_content = b"rc-content"
        carnet_content = b"carnet-content"
        data = {
            "rc_numero": "RC-123",
            "rc_fecha_emision": "2024-01-01T00:00:00",
            "rc_fecha_vencimiento": "2025-01-01T00:00:00",
            "carnet_numero": "C-456",
            "carnet_fecha_emision": "2023-06-01T00:00:00",
            "carnet_fecha_vencimiento": "2026-06-01T00:00:00"
        }
        files = {
            "rc_archivo": ("rc.pdf", rc_content, "application/pdf"),
            "carnet_archivo": ("carnet.pdf", carnet_content, "application/pdf")
        }

        resp_put = await client.post(
            "/api/documentacion/me",
            data=data,
            files=files,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_put.status_code == 200, resp_put.text
        body = resp_put.json()
        assert body["rc_numero"] == "RC-123"
        assert body["rc_tiene_archivo"] is True
        assert body["carnet_tiene_archivo"] is True

        resp_get = await client.get(
            "/api/documentacion/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_get.status_code == 200
        assert resp_get.json()["rc_tiene_archivo"] is True

        resp_rc = await client.get(
            "/api/documentacion/me/rc",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_rc.status_code == 200
        assert resp_rc.content == rc_content
        assert "rc.pdf" in resp_rc.headers.get("content-disposition", "")

        resp_carnet = await client.get(
            "/api/documentacion/me/carnet",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_carnet.status_code == 200
        assert resp_carnet.content == carnet_content
        assert "carnet.pdf" in resp_carnet.headers.get("content-disposition", "")


@pytest.mark.anyio
async def test_documentacion_update_partial():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        email, password = await register_user(client)
        token = await login_user(client, email, password)

        # Crear doc parcial
        resp_post = await client.post(
            "/api/documentacion/me",
            data={"rc_numero": "RC-OLD"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_post.status_code == 200
        assert resp_post.json()["rc_numero"] == "RC-OLD"

        # Actualizar solo carnet
        resp_post_2 = await client.post(
            "/api/documentacion/me",
            data={"carnet_numero": "CARNET-NEW"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp_post_2.status_code == 200
        data = resp_post_2.json()
        assert data["rc_numero"] == "RC-OLD" # Debe mantenerse
        assert data["carnet_numero"] == "CARNET-NEW"
