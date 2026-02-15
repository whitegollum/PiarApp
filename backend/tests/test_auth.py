import uuid

import httpx
import pytest

from app.main import app


@pytest.mark.anyio
async def test_register_and_login():
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        register_response = await client.post(
            "/api/auth/registro",
            json={
                "nombre_completo": "Test Usuario",
                "email": email,
                "password": "Password123"
            },
        )
        assert register_response.status_code == 200
        register_body = register_response.json()
        assert register_body.get("email") == email

        login_response = await client.post(
            "/api/auth/login",
            json={
                "email": email,
                "password": "Password123"
            },
        )
        assert login_response.status_code == 200
        login_body = login_response.json()
        assert "tokens" in login_body
        assert "access_token" in login_body["tokens"]
        assert "refresh_token" in login_body["tokens"]
