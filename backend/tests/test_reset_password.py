"""Tests para reset de contraseña"""
import uuid
from datetime import datetime, timedelta

import httpx
import pytest

from app.main import app
from app.database.db import get_db
from app.models.usuario import Usuario
from app.utils.security import AuthUtils


def _get_db_session():
    """Obtiene una sesión de BD para setup de tests"""
    gen = get_db()
    db = next(gen)
    return db, gen


@pytest.mark.anyio
async def test_solicitar_reset_email_existente():
    """Solicitar reset con email existente devuelve 200 con mensaje genérico"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"reset-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar usuario
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Reset Test",
            "email": email,
            "password": "Password123"
        })

        # Solicitar reset
        response = await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": email
        })
        assert response.status_code == 200
        body = response.json()
        assert "message" in body
        assert "instrucciones" in body["message"]


@pytest.mark.anyio
async def test_solicitar_reset_email_inexistente():
    """Solicitar reset con email inexistente devuelve 200 (no revela existencia)"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        response = await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": "noexiste@example.com"
        })
        assert response.status_code == 200
        body = response.json()
        assert "message" in body


@pytest.mark.anyio
async def test_solicitar_reset_usuario_google_only():
    """Solicitar reset para usuario Google-only devuelve 200 sin enviar email"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"google-{uuid.uuid4().hex[:8]}@example.com"

    # Crear usuario solo Google (sin password_hash)
    db, gen = _get_db_session()
    try:
        usuario = Usuario(
            email=email,
            nombre_completo="Google Only User",
            contraseña_hash=None,
            google_id=f"google-{uuid.uuid4().hex[:8]}",
            activo=True
        )
        db.add(usuario)
        db.commit()
    finally:
        try:
            next(gen)
        except StopIteration:
            pass

    async with client:
        response = await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": email
        })
        assert response.status_code == 200


@pytest.mark.anyio
async def test_reset_con_token_valido():
    """Reset con token válido actualiza la contraseña"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"reset-valid-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar usuario
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Reset Valid",
            "email": email,
            "password": "OldPassword123"
        })

        # Solicitar reset
        await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": email
        })

        # Obtener token de la BD
        db, gen = _get_db_session()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            token = usuario.reset_token
            assert token is not None
        finally:
            try:
                next(gen)
            except StopIteration:
                pass

        # Reset con token
        response = await client.post("/api/auth/reset-contrasena", json={
            "token": token,
            "nueva_contrasena": "NewPassword456"
        })
        assert response.status_code == 200

        # Login con nueva contraseña
        login_response = await client.post("/api/auth/login", json={
            "email": email,
            "password": "NewPassword456"
        })
        assert login_response.status_code == 200

        # Login con vieja contraseña falla
        login_old = await client.post("/api/auth/login", json={
            "email": email,
            "password": "OldPassword123"
        })
        assert login_old.status_code == 401


@pytest.mark.anyio
async def test_reset_con_token_expirado():
    """Reset con token expirado devuelve 400"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"reset-exp-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar usuario
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Reset Expired",
            "email": email,
            "password": "Password123"
        })

        # Setear token expirado manualmente
        db, gen = _get_db_session()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            usuario.reset_token = "expired-token-123"
            usuario.reset_token_expires = datetime.utcnow() - timedelta(hours=2)
            db.commit()
        finally:
            try:
                next(gen)
            except StopIteration:
                pass

        # Intentar reset
        response = await client.post("/api/auth/reset-contrasena", json={
            "token": "expired-token-123",
            "nueva_contrasena": "NewPassword456"
        })
        assert response.status_code == 400
        assert "expirado" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_reset_token_un_solo_uso():
    """Token de reset solo funciona una vez"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"reset-once-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar usuario
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Reset Once",
            "email": email,
            "password": "Password123"
        })

        # Solicitar reset
        await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": email
        })

        # Obtener token
        db, gen = _get_db_session()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            token = usuario.reset_token
        finally:
            try:
                next(gen)
            except StopIteration:
                pass

        # Primer uso: OK
        response = await client.post("/api/auth/reset-contrasena", json={
            "token": token,
            "nueva_contrasena": "NewPassword456"
        })
        assert response.status_code == 200

        # Segundo uso: falla
        response2 = await client.post("/api/auth/reset-contrasena", json={
            "token": token,
            "nueva_contrasena": "AnotherPassword789"
        })
        assert response2.status_code == 400


@pytest.mark.anyio
async def test_reset_contrasena_debil():
    """Reset con contraseña menor a 8 caracteres devuelve 422"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        response = await client.post("/api/auth/reset-contrasena", json={
            "token": "any-token",
            "nueva_contrasena": "short"
        })
        assert response.status_code == 422


@pytest.mark.anyio
async def test_validar_token_valido():
    """Validar token válido devuelve valid=true con email_hint"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"validate-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar usuario
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Validate Token",
            "email": email,
            "password": "Password123"
        })

        # Solicitar reset
        await client.post("/api/auth/solicitar-reset-contrasena", json={
            "email": email
        })

        # Obtener token
        db, gen = _get_db_session()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            token = usuario.reset_token
        finally:
            try:
                next(gen)
            except StopIteration:
                pass

        # Validar
        response = await client.get(f"/api/auth/validar-reset-token?token={token}")
        assert response.status_code == 200
        body = response.json()
        assert body["valid"] is True
        assert body["email_hint"] is not None
        assert "@" in body["email_hint"]


@pytest.mark.anyio
async def test_validar_token_expirado():
    """Validar token expirado devuelve valid=false"""
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")
    email = f"validate-exp-{uuid.uuid4().hex[:8]}@example.com"

    async with client:
        # Registrar y setear token expirado
        await client.post("/api/auth/registro", json={
            "nombre_completo": "Validate Expired",
            "email": email,
            "password": "Password123"
        })

        db, gen = _get_db_session()
        try:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            usuario.reset_token = "validate-expired-token"
            usuario.reset_token_expires = datetime.utcnow() - timedelta(hours=1)
            db.commit()
        finally:
            try:
                next(gen)
            except StopIteration:
                pass

        response = await client.get("/api/auth/validar-reset-token?token=validate-expired-token")
        assert response.status_code == 200
        body = response.json()
        assert body["valid"] is False
