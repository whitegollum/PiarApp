import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.database.db import SessionLocal
from app.main import app
from app.models.club import Club
from app.models.invitacion import Invitacion
from app.models.usuario import Usuario


def _create_user_and_club() -> tuple[int, int]:
    db = SessionLocal()
    try:
        email = f"admin-{uuid.uuid4().hex[:8]}@example.com"
        usuario = Usuario(
            email=email,
            nombre_completo="Admin Test",
            contraseña_hash="hash",
            email_verificado=True,
            activo=True,
            es_superadmin=True
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

        club = Club(
            nombre="Club Test",
            slug=f"club-{uuid.uuid4().hex[:8]}",
            descripcion="",
            creador_id=usuario.id
        )
        db.add(club)
        db.commit()
        db.refresh(club)
        return usuario.id, club.id
    finally:
        db.close()


def _create_invitation(club_id: int, creador_id: int) -> str:
    db = SessionLocal()
    try:
        token = uuid.uuid4().hex
        invitacion = Invitacion(
            club_id=club_id,
            email=f"invite-{uuid.uuid4().hex[:8]}@example.com",
            usuario_id=None,
            rol="miembro",
            token=token,
            estado="pendiente",
            creado_por_id=creador_id,
            fecha_vencimiento=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(invitacion)
        db.commit()
        return token
    finally:
        db.close()


@pytest.mark.anyio
async def test_invitation_public_data():
    creador_id, club_id = _create_user_and_club()
    token = _create_invitation(club_id, creador_id)

    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        response = await client.get(f"/api/auth/invitaciones/{token}")
        assert response.status_code == 200
        body = response.json()
        assert "email" in body
        assert body["club_id"] == club_id
        assert body["club_name"] == "Club Test"


@pytest.mark.anyio
async def test_invitation_public_invalid_token():
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async with client:
        response = await client.get("/api/auth/invitaciones/invalid-token")
        assert response.status_code == 404
