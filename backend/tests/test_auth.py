import uuid

from fastapi.testclient import TestClient

from app.main import app


def test_register_and_login():
    client = TestClient(app)
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"

    register_response = client.post(
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

    login_response = client.post(
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
