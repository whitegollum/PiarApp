import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.openclaw_service import OpenClawService


@pytest.mark.asyncio
async def test_openclaw_http_chat_mocked():
    """
    Prueba unitaria con Mock para verificar el flujo HTTP /v1/chat/completions.
    """
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Hola, soy OpenClaw Mock"
                },
                "finish_reason": "stop"
            }
        ]
    }

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        service = OpenClawService()
        service.base_url = "http://127.0.0.1:18789"
        service.auth_mode = "password"
        service.password = "secret_token_123"

        response_text = await service.get_response(
            messages=[{"role": "user", "content": "Hola"}]
        )

        # Verificar que se llamó al endpoint correcto
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "/v1/chat/completions" in call_args[0][0]

        # Verificar headers de auth
        headers = call_args[1]["headers"]
        assert headers["Authorization"] == "Bearer secret_token_123"

        # Verificar payload
        payload = call_args[1]["json"]
        assert payload["messages"][0]["role"] == "user"
        assert payload["messages"][0]["content"] == "Hola"

        # Verificar respuesta
        assert "Hola, soy OpenClaw Mock" in response_text


@pytest.mark.asyncio
async def test_openclaw_http_error_handling():
    """
    Prueba que errores HTTP se manejan correctamente.
    """
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized: invalid token"

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        service = OpenClawService()
        service.base_url = "http://127.0.0.1:18789"
        service.auth_mode = "password"
        service.password = "bad_token"

        response_text = await service.get_response(
            messages=[{"role": "user", "content": "Test"}]
        )

        assert "Error de OpenClaw (HTTP 401)" in response_text


@pytest.mark.asyncio
async def test_openclaw_session_key_generation():
    """
    Verifica que se generen sessionKeys diferentes para distintos usuarios/clubes.
    """
    service = OpenClawService()
    service.auth_mode = "password"
    service.password = "secret"

    # Caso 1: Usuario 1 en Club 10
    key1 = service._get_session_key({"user_id": 1, "club_id": 10})
    assert key1 == "agent:main:club_10_user_1"

    # Caso 2: Usuario 2 en Club 20
    key2 = service._get_session_key({"user_id": 2, "club_id": 20})
    assert key2 == "agent:main:club_20_user_2"

    # Caso 3: Solo usuario, sin club
    key3 = service._get_session_key({"user_id": 5})
    assert key3 == "agent:main:user_5"

    # Caso 4: Sin contexto
    key4 = service._get_session_key(None)
    assert key4 == "agent:main:main"


@pytest.mark.asyncio
async def test_openclaw_history_mocked():
    """
    Prueba unitaria para verificar la recuperación de historial via HTTP.
    """
    simulated_messages = [
        {"role": "user", "content": "Hola"},
        {"role": "assistant", "content": "¿En qué puedo ayudarte?"},
        {"role": "tool", "content": "Ignored tool output"},
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"messages": simulated_messages}

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        service = OpenClawService()
        service.base_url = "http://127.0.0.1:18789"
        service.auth_mode = "password"
        service.password = "secret"

        history = await service.get_chat_history(limit=5)

        # Debe filtrar tool, quedando user y assistant
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_openclaw_history_404():
    """
    Verifica que si el endpoint de historial no existe, devuelve lista vacía.
    """
    mock_response = MagicMock()
    mock_response.status_code = 404

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        service = OpenClawService()
        service.base_url = "http://127.0.0.1:18789"
        service.auth_mode = "password"
        service.password = "secret"

        history = await service.get_chat_history()
        assert history == []
