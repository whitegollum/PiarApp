import uuid

import httpx
import pytest

from app.config import settings
from app.main import app
from app.services.google_oauth_service import GoogleOAuthService


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


@pytest.mark.anyio
async def test_google_oauth_code_flow(monkeypatch):
    async def fake_exchange(code: str, redirect_uri: str | None = None):
        return {
            "access_token": "google-access",
            "refresh_token": "google-refresh",
            "expires_in": 3600,
            "scope": "openid email profile",
            "token_type": "Bearer"
        }

    async def fake_userinfo(access_token: str):
        return {
            "id": "google-123",
            "email": "google-test@example.com",
            "name": "Google Test",
            "picture": "https://example.com/avatar.png"
        }

    monkeypatch.setattr(
        GoogleOAuthService,
        "intercambiar_codigo_por_tokens",
        fake_exchange
    )
    monkeypatch.setattr(
        GoogleOAuthService,
        "obtener_userinfo",
        fake_userinfo
    )
    monkeypatch.setattr(settings, "google_client_id", "test-client")
    monkeypatch.setattr(settings, "google_client_secret", "test-secret")

    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        response = await client.post(
            "/api/auth/google-oauth",
            json={
                "code": "test-code",
                "redirect_uri": "http://localhost:5173/auth/google-callback"
            }
        )

        assert response.status_code == 200
        body = response.json()
        assert body["usuario"]["email"] == "google-test@example.com"
        assert "access_token" in body["tokens"]
        assert "refresh_token" in body["tokens"]
