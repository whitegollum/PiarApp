import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.openclaw_service import OpenClawService

@pytest.mark.asyncio
async def test_openclaw_ws_connection_mocked():
    """
    Prueba unitaria con Mock para verificar el flujo completo handshake -> chat.send -> chat events.
    """
    # Mock data
    challenge_msg = json.dumps({"type": "event", "event": "connect.challenge"})
    success_msg = json.dumps({"type": "res", "ok": True, "msg": "Conectado"})
    
    # Mockear websockets.connect
    mock_ws_connection = AsyncMock()
    mock_ws_protocol = AsyncMock()
    
    # Gestionar estado interno para la secuencia de respuestas
    mock_ws_protocol._test_step = 0

    async def side_effect_recv():
        step = mock_ws_protocol._test_step
        mock_ws_protocol._test_step += 1

        if step == 0:
            return challenge_msg
        elif step == 1:
            # Respuesta al connect enviado (ACK)
            return success_msg
        elif step == 2:
            # Respuesta inmediata al chat.send (ACK)
            # Necesitamos el ID enviado para responder con el mismo ID
            last_call = mock_ws_protocol.send.call_args
            sent_json = json.loads(last_call[0][0]) 
            req_id = sent_json.get("id")
            return json.dumps({"type": "res", "id": req_id, "ok": True})
        elif step == 3:
            # Evento con el contenido del chat en el formato esperado
            return json.dumps({
                "type": "event", 
                "event": "chat", 
                "payload": {
                    "state": "final",
                    "message": {
                        "content": [
                            {"type": "text", "text": "Hola, soy OpenClaw Mock"}
                        ]
                    }
                }
            })
        else:
            await asyncio.sleep(0.1) 
            return json.dumps({"type": "event", "event": "keepalive"})

    mock_ws_protocol.recv.side_effect = side_effect_recv
    
    # Configurar el __aenter__ para devolver el protocolo
    mock_ws_connection.__aenter__.return_value = mock_ws_protocol
    
    with patch("websockets.connect", return_value=mock_ws_connection) as mock_connect:
        service = OpenClawService()
        # Forzar configuración para test
        service.ws_url = "ws://test-ws-url:8080"
        service.auth_mode = "password"
        service.password = "secret_token_123"

        response_text = await service.get_response(messages=[{"role":"user", "content":"Hola"}])

        # Verificar que se intentó conectar a la URL correcta
        mock_connect.assert_called_with("ws://test-ws-url:8080")

        # Verificar handshake enviado
        assert mock_ws_protocol.send.call_count >= 2 
        
        # Verificar mensaje de conexión
        connect_call_args = mock_ws_protocol.send.call_args_list[0]
        connect_json = json.loads(connect_call_args[0][0])
        assert connect_json["type"] == "req"
        assert connect_json["method"] == "connect"
        
        # Verificar mensaje de chat
        chat_call_args = mock_ws_protocol.send.call_args_list[1]
        chat_json = json.loads(chat_call_args[0][0])
        assert chat_json["type"] == "req"
        assert chat_json["method"] == "chat.send" # Actualizado
        assert "sessionKey" in chat_json["params"]

        # Verificar respuesta final
        assert "Hola, soy OpenClaw Mock" in response_text


# Test de error eliminado al cambiar a WS


# @pytest.mark.skip(reason="Habilitar manualmente para probar conexión REAL contra tu servidor OpenClaw")
@pytest.mark.asyncio
async def test_openclaw_history_mocked():
    """
    Prueba unitaria con Mock para verificar el flujo de recuperación de historial.
    """
    # Mock data
    challenge_msg = json.dumps({"type": "event", "event": "connect.challenge"})
    success_msg = json.dumps({"type": "res", "ok": True, "msg": "Conectado"})
    
    # Mockear websockets.connect
    mock_ws_connection = AsyncMock()
    mock_ws_protocol = AsyncMock()
    
    # Gestionar estado interno para la secuencia de respuestas
    mock_ws_protocol._test_step = 0

    async def side_effect_recv():
        step = mock_ws_protocol._test_step
        mock_ws_protocol._test_step += 1

        if step == 0:
            return challenge_msg
        elif step == 1:
            # Respuesta al connect enviado (ACK)
            return success_msg
        elif step == 2:
            # Respuesta al chat.history
            # Necesitamos el ID enviado para responder con el mismo ID
            last_call = mock_ws_protocol.send.call_args
            sent_json = json.loads(last_call[0][0])
            req_id = sent_json.get("id")
            
            # Payload simulado con mensajes
            simulated_messages = [
                {"role": "user", "content": "Hola"},
                {"role": "assistant", "content": [{"type": "text", "text": "Hola, ¿en qué puedo ayudarte?"}]},
                {"role": "toolResult", "content": "Ignored tool output"}
            ]
            
            response_payload = {
                "type": "res",
                "id": req_id,
                "ok": True,
                "payload": {
                    "sessionKey": "agent:main:main",
                    "messages": simulated_messages
                }
            }
            return json.dumps(response_payload)
        else:
            await asyncio.sleep(0.1) 
            return json.dumps({"type": "event", "event": "keepalive"})

    mock_ws_protocol.recv.side_effect = side_effect_recv
    mock_ws_connection.__aenter__.return_value = mock_ws_protocol

    with patch("websockets.connect", return_value=mock_ws_connection):
        service = OpenClawService()
        # Forzar configuración
        service.ws_url = "ws://test-mock-url"
        service.auth_mode = "password"
        service.password = "secret"
        
        history = await service.get_chat_history(limit=5)
        
        # Debe haber filtrado el toolResult, quedando solo user y assistant
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[0]["content"] == "Hola"
        assert history[1]["role"] == "assistant"
        # Verificar manejo de contenido complejo vs simple
        # El servicio devuelve el objeto tal cual, así que el assistant tendría content=[...]
        content_block = history[1]["content"]
        assert isinstance(content_block, list)
        assert content_block[0]["text"] == "Hola, ¿en qué puedo ayudarte?"

@pytest.mark.asyncio
async def test_openclaw_multisession_routing():
    """
    Verifica que se generen sessionKeys diferentes para distintos usuarios/clubes.
    """
    # Mockear websockets.connect
    mock_ws_connection = AsyncMock()
    mock_ws_protocol = AsyncMock()
    
    # Simple success response sequence
    challenge_msg = json.dumps({"type": "event", "event": "connect.challenge"})
    success_msg = json.dumps({"type": "res", "ok": True, "msg": "Conectado"})
    chat_ack = json.dumps({"type": "res", "id": "TEST_ID", "ok": True}) # ID ignored here due to dynamic generation
    
    # Configurar respuestas para que no se bloquee el loop
    # 0: challenge, 1: handshake_res, 2: char_res (y simulamos fin por timeout o break)
    mock_ws_protocol.recv.side_effect = [
        challenge_msg, success_msg, chat_ack, asyncio.TimeoutError
    ]
    mock_ws_connection.__aenter__.return_value = mock_ws_protocol

    with patch("websockets.connect", return_value=mock_ws_connection):
        service = OpenClawService()
        service.ws_url = "ws://mock"
        service.auth_mode = "password"
        service.password = "secret"
        
        # Caso 1: Usuario 1 en Club 10
        ctx1 = {"user_id": 1, "club_id": 10}
        # Mock wait_for in service loop to raise TimeoutError immediately after chat ack to finish
        with patch("asyncio.wait_for", side_effect=[challenge_msg, success_msg, chat_ack, asyncio.TimeoutError]):
            # Wait, wait_for call signatures might differ or loop structure.
            # Simplified approach: Inspect call_args of websocket.send
            try:
                await service.get_response([{"role": "user", "content": "Hi"}], context=ctx1)
            except:
                pass # Expected timeout/error as we don't provide full conversation flow
            
            # Verificar el payload de chat.send
            # Se esperan 2 llamadas a send: 1 handshake, 1 chat.send
            assert mock_ws_protocol.send.call_count >= 2
            
            # Buscar la llamada a chat.send
            chat_call_args = mock_ws_protocol.send.call_args
            chat_json = json.loads(chat_call_args[0][0])
            
            # Verificar formato de sessionKey para usuario 1
            assert chat_json["method"] == "chat.send"
            assert chat_json["params"]["sessionKey"] == "agent:main:club_10_user_1"

        # Reset mock
        mock_ws_protocol.reset_mock()
        mock_ws_protocol.recv.side_effect = [challenge_msg, success_msg, chat_ack, asyncio.TimeoutError]

        # Caso 2: Usuario 2 en Club 20
        ctx2 = {"user_id": 2, "club_id": 20}
        try:
             await service.get_response([{"role": "user", "content": "Hi"}], context=ctx2)
        except:
             pass
        
        chat_call_args_2 = mock_ws_protocol.send.call_args
        chat_json_2 = json.loads(chat_call_args_2[0][0])
        
        assert chat_json_2["params"]["sessionKey"] == "agent:main:club_20_user_2"
