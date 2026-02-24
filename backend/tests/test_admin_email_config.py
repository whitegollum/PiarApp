import uuid

import httpx
import pytest

from app.database.db import SessionLocal
from app.main import app
from app.models.usuario import Usuario


def _set_superadmin(email: str) -> None:
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if usuario:
            usuario.es_superadmin = True
            db.commit()
    finally:
        db.close()


async def _register_and_login(client: httpx.AsyncClient) -> tuple[str, str]:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"

    register_response = await client.post(
        "/api/auth/registro",
        json={
            "nombre_completo": "Test Admin",
            "email": email,
            "password": "Password123"
        },
    )
    assert register_response.status_code == 200

    login_response = await client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": "Password123"
        },
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    access_token = login_body["tokens"]["access_token"]
    return email, access_token


@pytest.mark.anyio
async def test_admin_email_config_requires_superadmin():
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        _, token = await _register_and_login(client)

        response = await client.get(
            "/api/admin/config/email",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 403


@pytest.mark.anyio
async def test_admin_email_config_flow():
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        email, _ = await _register_and_login(client)
        _set_superadmin(email)

        login_response = await client.post(
            "/api/auth/login",
            json={
                "email": email,
                "password": "Password123"
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        response = await client.get(
            "/api/admin/config/email",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        body = response.json()
        assert "smtp_server" in body
        assert "frontend_url" in body

        update_response = await client.put(
            "/api/admin/config/email",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "smtp_server": "",
                "smtp_port": 587,
                "smtp_username": "",
                "smtp_password": "",
                "smtp_from_email": "noreply@piarapp.com",
                "smtp_use_tls": True,
                "smtp_use_ssl": False,
                "frontend_url": "http://localhost:5173"
            },
        )
        assert update_response.status_code == 200

        test_response = await client.post(
            "/api/admin/config/test-email",
            headers={"Authorization": f"Bearer {token}"},
            json={"to_email": "test@example.com"}
        )
        assert test_response.status_code == 200
        assert "message" in test_response.json()
