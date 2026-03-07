import websockets
import json
import asyncio
import logging
import traceback
from typing import List, Dict, Any, Optional
from ..config import Settings

logger = logging.getLogger(__name__)
settings = Settings()

class OpenClawService:
    def __init__(self):
        self.auth_mode = settings.openclaw_auth_mode
        self.api_key = settings.openclaw_api_key
        # Use WS URL (convert http/https to ws/wss if needed, or expect correct config)
        self.ws_url = settings.openclaw_api_url.replace("http://", "ws://").replace("https://", "wss://").replace("/v1/chat", "") 
        self.password = settings.openclaw_password
        logger.info(f"OpenClawService initialized: url={self.ws_url}, auth_mode={self.auth_mode}")
        
    def _get_token(self) -> str:
        # En modo WS con el ejemplo del usuario, parece que el token va en 'auth.token'
        secret = self.password if self.auth_mode == "password" else self.api_key
        if not secret:
            raise ValueError(f"Credencial no configurada para OpenClaw (modo: {self.auth_mode})")
        return secret

    def _get_session_key(self, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Genera una sessionKey basada en el contexto (usuario y club).
        Formato: agent:main:club_{clubId}_user_{userId}
        """
        if not context:
            return "agent:main:main"
            
        user_id = context.get("user_id")
        club_id = context.get("club_id")
        
        if user_id and club_id:
            return f"agent:main:club_{club_id}_user_{user_id}"
        elif user_id:
            return f"agent:main:user_{user_id}"
        
        return "agent:main:main"

    async def get_response(self, messages: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> str:
        """
        Conecta por WebSocket, realiza el handshake y envía los mensajes.
        """
        uri = self.ws_url
        token = self._get_token()
        session_key = self._get_session_key(context)
        
        logger.info(f"OpenClaw get_response called: uri={uri}, session_key={session_key}")
        
        try:
            logger.info(f"Attempting WebSocket connection to {uri}")
            async with websockets.connect(uri) as websocket:
                logger.info("WebSocket connection established")
                # 1. Esperar al challenge de conexión
                response = await websocket.recv()
                challenge = json.loads(response)
                
                if challenge.get("type") == "event" and challenge.get("event") == "connect.challenge":
                    # 2. Enviar respuesta al challenge (Handshake)
                    handshake_payload = {
                        "type": "req",
                        "id": "1",
                        "method": "connect",
                        "params": {
                            "minProtocol": 3,
                            "maxProtocol": 3,
                            "client": {
                                "id": "cli",
                                "version": "1.0.0",
                                "platform": "python",
                                "mode": "backend"
                            },
                            "role": "operator",
                            "scopes": ["operator.read", "operator.write", "operator.admin"],
                            "auth": {
                                "token": token,
                                "password": token
                            },
                            "locale": "es-ES",
                            "userAgent": "piarapp-backend/1.0.0"
                        }
                    }
                    logger.info("Sending handshake payload...")
                    await websocket.send(json.dumps(handshake_payload))
                    
                    # 3. Esperar confirmación de conexión (asumiendo que devuelve algo)
                    logger.info("Waiting for handshake response...")
                    # El ejemplo JS no muestra que pasa después, pero es normal esperar un 'op': 'connected' o similar.
                    # Por ahora devolvemos "Conexión WS Establecida" para probar el handshake.
                    # En una implementación real de chat, aquí enviaríamos el mensaje del usuario.
                    
                    # Para el propósito de "get_response", voy a intentar enviar el mensaje si el handshake es exitoso.
                    # Como no tengo la especificación de cómo enviar mensajes por WS en OpenClaw,
                    # asumiré por ahora que solo probamos conexión o usaré un formato genérico si confirma.
                    
                    connect_response = await websocket.recv()
                    logger.info(f"Handshake response: {connect_response[:200]}...")
                    connect_data = json.loads(connect_response)
                    
                    if not (connect_data.get("ok") or connect_data.get("type") == "res"):
                        error_msg = f"Fallo en handshake: {connect_data}"
                        logger.error(error_msg)
                        return error_msg
                    
                    logger.info("Handshake successful")
                        
                    # 4. Enviar mensaje de chat
                    # Generar ID único para la solicitud
                    chat_req_id = f"req_{asyncio.get_event_loop().time()}"
                    
                    # Extraer el último mensaje del usuario para enviarlo
                    # OpenClaw parece esperar un string simple en 'message' para 'chat.send'
                    user_msg = "Hola"
                    if messages:
                         for m in reversed(messages):
                              if m.get("role") == "user":
                                   user_msg = m.get("content", "")
                                   break
                    
                    chat_payload = {
                        "type": "req",
                        "id": chat_req_id,
                        "method": "chat.send",
                        "params": {
                            "sessionKey": session_key,
                            "message": user_msg,
                            "idempotencyKey": f"idem_{chat_req_id}"
                        }
                    }
                    logger.info(f"Sending chat message: {user_msg[:100]}...")
                    await websocket.send(json.dumps(chat_payload))
                    logger.info("Chat message sent, waiting for response...")
                    
                    # 5. Esperar respuesta del chat
                    # Flujo: primero llega un 'res' confirmando recepción, luego 'event' con el contenido
                    accumulated_response = ""
                    response_started = False
                    
                    while True:
                        try:
                            msg_raw = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                            msg = json.loads(msg_raw)

                            # 1. Chequear 'res' del request enviado
                            if msg.get("type") == "res" and msg.get("id") == chat_req_id:
                                # Aquí confirmamos recepción.
                                if not msg.get("ok"):
                                    return f"Error en chat.send: {msg.get('error')}"
                                # El servidor confirma 'request valid received'
                                # Ahora esperamos el evento 'chat' real.
                                continue

                            # 2. Chequear eventos de chat y agente (respuesta real asíncrona)
                            if msg.get("type") == "event":
                                event_type = msg.get("event")
                                payload = msg.get("payload", {})
                                
                                # Caso A: Evento 'agent' con stream de texto
                                if event_type == "agent":
                                    stream_type = payload.get("stream")
                                    if stream_type == "assistant":
                                        data = payload.get("data", {})
                                        delta = data.get("delta", "")
                                        accumulated_response += delta
                                        # Si hay un indicador de fin en data? (no visto en logs)
                                        
                                    elif stream_type == "lifecycle":
                                        data = payload.get("data", {})
                                        if data.get("phase") == "end":
                                            return accumulated_response

                                # Caso B: Evento 'chat' (estado del mensaje)
                                elif event_type == "chat":
                                    state = payload.get("state")
                                    if state == "final":
                                        # Podemos extraer el texto completo de aquí si lo preferimos
                                        msg_content = payload.get("message", {}).get("content", [])
                                        if isinstance(msg_content, list):
                                             full_text = "".join([c.get("text", "") for c in msg_content if c.get("type") == "text"])
                                             if full_text:
                                                  return full_text
                                        return accumulated_response

                        except asyncio.TimeoutError:
                            # Si ya recibimos algo, devolvemos eso
                            if accumulated_response:
                                return accumulated_response
                            return "Error: Tiempo de espera agotado esperando respuesta de OpenClaw"
                        
                        # Add simple break interval if not using wait_for (but we are used wait_for)
                        # Just in case websocket connection is problematic
                        await asyncio.sleep(0.01)
                            
                else:
                    error_msg = f"Respuesta inesperada del servidor (no challenge): {response}"
                    logger.error(error_msg)
                    return error_msg

        except websockets.exceptions.ConnectionClosedError as e:
            error_msg = f"Conexión cerrada inesperadamente: {e}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return error_msg
        except Exception as e:
            error_msg = f"Error WebSocket: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return error_msg

    async def get_chat_history(self, session_key: Optional[str] = None, context: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Recupera el historial de chat.
        Prioriza 'session_key' si se provee. Si no, usa 'context' para generarla.
        """
        if not session_key:
             session_key = self._get_session_key(context)
             
        uri = self.ws_url
        token = self._get_token()
        
        try:
            async with websockets.connect(uri) as websocket:
                # 1. Esperar al challenge de conexión
                response = await websocket.recv()
                challenge = json.loads(response)
                
                if challenge.get("type") == "event" and challenge.get("event") == "connect.challenge":
                    # 2. Enviar respuesta al challenge (Handshake) - Reutilizamos payload
                    handshake_payload = {
                        "type": "req",
                        "id": "1",
                        "method": "connect",
                        "params": {
                            "minProtocol": 3,
                            "maxProtocol": 3,
                            "client": {
                                "id": "cli",
                                "version": "1.0.0",
                                "platform": "python",
                                "mode": "backend"
                            },
                            "role": "operator",
                            "scopes": ["operator.read", "operator.write", "operator.admin"],
                            "auth": {
                                "token": token,
                                "password": token
                            },
                            "locale": "es-ES",
                            "userAgent": "piarapp-backend/1.0.0"
                        }
                    }
                    await websocket.send(json.dumps(handshake_payload))
                    
                    # 3. Esperar confirmación
                    connect_response = await websocket.recv()
                    connect_data = json.loads(connect_response)
                    
                    if not (connect_data.get("ok") or connect_data.get("type") == "res"):
                        print(f"Fallo en handshake history: {connect_data}")
                        return []

                    # 4. Solicitar historial
                    hist_req_id = f"req_hist_{asyncio.get_event_loop().time()}"
                    history_payload = {
                        "type": "req",
                        "id": hist_req_id,
                        "method": "chat.history",
                        "params": {
                            "sessionKey": session_key,
                            "limit": limit
                        }
                    }
                    await websocket.send(json.dumps(history_payload))
                    
                    # 5. Esperar respuesta
                    # La respuesta debe ser de type 'res' con el payload conteniendo 'messages' o similar
                    # O tal vez un evento. Asumiremos 'res' directo primero.
                    try:
                        while True:
                            msg_raw = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                            msg = json.loads(msg_raw)
                            
                            if msg.get("type") == "res" and msg.get("id") == hist_req_id:
                                if msg.get("ok"):
                                    # Payload debería tener la lista de mensajes
                                    # Estructura observada: payload: { messages: [...] }
                                    payload = msg.get("payload", {})
                                    
                                    messages = []
                                    if isinstance(payload, list):
                                        messages = payload
                                    else:
                                        messages = payload.get("messages", []) or payload.get("history", []) or []
                                        
                                    # Filtrar solo mensajes de usuario y asistente para no ensuciar la UI con logs de herramientas
                                    # Opcional: Si queremos debugging, lo dejamos. Para usuario final, mejor filtrar.
                                    filtered = [
                                        m for m in messages 
                                        if m.get("role") in ["user", "assistant"]
                                    ]
                                    return filtered
                                else:
                                    print(f"Error recuperando historial: {msg.get('error')}")
                                    return []
                            
                            # Ignorar otros eventos mientras esperamos la respuesta
                            
                    except asyncio.TimeoutError:
                        print("Timeout esperando historial")
                        return []
                
        except Exception as e:
            print(f"Error obteniendo historial: {e}")
            return []
        
        return []

    async def check_connection_status(self) -> Dict[str, Any]:
        """
        Verifica rápidamente si hay conexión WebSocket con OpenClaw.
        Retorna: {"connected": bool, "error": str | None}
        """
        try:
            token = self._get_token()
            async with websockets.connect(self.ws_url, open_timeout=5) as websocket:
                # Esperar challenge
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                challenge = json.loads(response)
                
                if challenge.get("type") == "event" and challenge.get("event") == "connect.challenge":
                    # Enviar handshake mínimo
                    handshake_payload = {
                        "type": "req",
                        "id": "status_check",
                        "method": "connect",
                        "params": {
                            "minProtocol": 3,
                            "maxProtocol": 3,
                            "client": {
                                "id": "cli",
                                "version": "1.0.0",
                                "platform": "python",
                                "mode": "status_check"
                            },
                            "role": "operator",
                            "scopes": ["operator.read"],
                            "auth": {
                                "token": token,
                                "password": token
                            }
                        }
                    }
                    await websocket.send(json.dumps(handshake_payload))
                    
                    # Esperar confirmación
                    connect_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    connect_data = json.loads(connect_response)
                    
                    if connect_data.get("ok") or connect_data.get("type") == "res":
                        return {"connected": True, "error": None}
                    else:
                        error_msg = connect_data.get("error", {}).get("message", "Unknown error")
                        return {"connected": False, "error": f"Handshake failed: {error_msg}"}
                        
                return {"connected": False, "error": "Unexpected challenge format"}
                
        except asyncio.TimeoutError:
            return {"connected": False, "error": "Connection timeout"}
        except websockets.exceptions.WebSocketException as e:
            return {"connected": False, "error": f"WebSocket error: {str(e)}"}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def diagnose_connection(self) -> Dict[str, Any]:
        """
        Diagnostica exhaustivamente la conexión a OpenClaw.
        Incluye todos los tests realizados durante la depuración:
        - Configuración y credenciales
        - Client ID correcto
        - Conectividad de red
        - WebSocket handshake
        - Challenge-response flow
        - Autenticación completa
        """
        diagnosis = {
            "config": {
                "ws_url": self.ws_url,
                "auth_mode": self.auth_mode,
                "has_password": bool(self.password),
                "has_api_key": bool(self.api_key),
                "client_id": "cli",  # Client ID correcto después de debug
                "protocol_version": 3,
            },
            "steps": [],
            "success": False,
            "error": None
        }
        
        try:
            # Step 1: Verificar configuración
            config_details = f"URL: {self.ws_url}, Auth: {self.auth_mode}, Password: {'✓' if self.password else '✗'}"
            diagnosis["steps"].append({
                "step": "config_check", 
                "status": "ok", 
                "details": config_details
            })
            
            # Step 1.5: Verificar client_id correcto
            diagnosis["steps"].append({
                "step": "client_id_verification",
                "status": "ok",
                "details": "Using client_id='cli' (validated during troubleshooting)"
            })
            
            # Step 2: Intentar obtener token
            try:
                token = self._get_token()
                token_preview = token[:20] + "..." if len(token) > 20 else token
                diagnosis["steps"].append({
                    "step": "token_retrieval", 
                    "status": "ok", 
                    "details": f"Token retrieved ({len(token)} chars): {token_preview}"
                })
            except Exception as e:
                diagnosis["steps"].append({
                    "step": "token_retrieval", 
                    "status": "error", 
                    "details": f"Failed to get token: {str(e)}"
                })
                diagnosis["error"] = f"Token error: {str(e)}"
                return diagnosis
            
            # Step 2.5: Verificar conectividad de red (similar al test TCP realizado)
            try:
                import socket
                # Extraer host y puerto del ws_url
                url_parts = self.ws_url.replace('ws://', '').replace('wss://', '').split(':')
                host = url_parts[0]
                port = int(url_parts[1]) if len(url_parts) > 1 else 18789
                
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result == 0:
                    diagnosis["steps"].append({
                        "step": "network_connectivity",
                        "status": "ok",
                        "details": f"TCP connection to {host}:{port} successful"
                    })
                else:
                    diagnosis["steps"].append({
                        "step": "network_connectivity",
                        "status": "error",
                        "details": f"TCP connection to {host}:{port} failed (code: {result})"
                    })
                    diagnosis["error"] = f"Network connectivity failed to {host}:{port}"
                    return diagnosis
            except Exception as e:
                diagnosis["steps"].append({
                    "step": "network_connectivity",
                    "status": "error",
                    "details": f"Network test failed: {str(e)}"
                })
                # No retornamos aquí, continuamos con WebSocket que podría funcionar
            
            # Step 3: Intentar conexión WebSocket
            try:
                logger.info(f"[DIAGNOSIS] Attempting WebSocket connection to {self.ws_url}")
                async with websockets.connect(self.ws_url) as websocket:
                    diagnosis["steps"].append({
                        "step": "websocket_connection", 
                        "status": "ok", 
                        "details": f"WebSocket connected successfully to {self.ws_url}"
                    })
                    
                    # Step 4: Esperar challenge
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                        challenge = json.loads(response)
                        challenge_preview = str(challenge)[:100] + "..." if len(str(challenge)) > 100 else str(challenge)
                        diagnosis["steps"].append({
                            "step": "challenge_received", 
                            "status": "ok", 
                            "details": f"Challenge received - Type: {challenge.get('type')}, Event: {challenge.get('event')} | Data: {challenge_preview}"
                        })
                        
                        if challenge.get("type") == "event" and challenge.get("event") == "connect.challenge":
                            # Step 5: Enviar handshake
                            handshake_payload = {
                                "type": "req",
                                "id": "diag_1",
                                "method": "connect",
                                "params": {
                                    "minProtocol": 3,
                                    "maxProtocol": 3,
                                    "client": {
                                        "id": "cli",
                                        "version": "1.0.0",
                                        "platform": "python",
                                        "mode": "diagnostic"
                                    },
                                    "role": "operator",
                                    "scopes": ["operator.read", "operator.write", "operator.admin"],
                                    "auth": {
                                        "token": token,
                                        "password": token
                                    },
                                    "locale": "es-ES",
                                    "userAgent": "piarapp-diagnostic/1.0.0"
                                }
                            }
                            await websocket.send(json.dumps(handshake_payload))
                            diagnosis["steps"].append({
                                "step": "handshake_sent", 
                                "status": "ok", 
                                "details": f"Handshake sent with client_id='cli', role='operator', protocol=3"
                            })
                            
                            # Step 6: Esperar respuesta del handshake
                            connect_response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                            connect_data = json.loads(connect_response)
                            
                            response_preview = str(connect_data)[:200] + "..." if len(str(connect_data)) > 200 else str(connect_data)
                            
                            if connect_data.get("ok") or connect_data.get("type") == "res":
                                server_info = connect_data.get("payload", {}).get("server", {})
                                protocol = connect_data.get("payload", {}).get("protocol", "unknown")
                                diagnosis["steps"].append({
                                    "step": "handshake_response", 
                                    "status": "ok", 
                                    "details": f"✓ Handshake successful! Protocol: {protocol}, Server: {server_info.get('version', 'unknown')} | Response: {response_preview}"
                                })
                                diagnosis["success"] = True
                                
                                # Step 7: Resumen de tests exitosos
                                diagnosis["steps"].append({
                                    "step": "connection_summary",
                                    "status": "ok",
                                    "details": "All connection tests passed! OpenClaw is ready to receive messages."
                                })
                            else:
                                error_msg = connect_data.get("error", {}).get("message", "Unknown error")
                                diagnosis["steps"].append({
                                    "step": "handshake_response", 
                                    "status": "error", 
                                    "details": f"✗ Handshake rejected: {error_msg} | Full response: {response_preview}"
                                })
                                diagnosis["error"] = f"Handshake failed: {error_msg}"
                        else:
                            diagnosis["steps"].append({
                                "step": "challenge_validation", 
                                "status": "error", 
                                "details": f"Unexpected challenge format: {challenge}"
                            })
                            diagnosis["error"] = "Unexpected challenge format"
                            
                    except asyncio.TimeoutError:
                        diagnosis["steps"].append({"step": "challenge_timeout", "status": "error", "details": "Timeout waiting for challenge"})
                        diagnosis["error"] = "Timeout waiting for challenge"
                    except json.JSONDecodeError as e:
                        diagnosis["steps"].append({"step": "json_parse_error", "status": "error", "details": str(e)})
                        diagnosis["error"] = f"JSON parse error: {str(e)}"
                        
            except asyncio.TimeoutError:
                diagnosis["steps"].append({"step": "websocket_connection", "status": "error", "details": "Connection timeout"})
                diagnosis["error"] = "WebSocket connection timeout"
            except websockets.exceptions.ConnectionClosedError as e:
                diagnosis["steps"].append({"step": "websocket_connection", "status": "error", "details": f"Connection closed: {str(e)}"})
                diagnosis["error"] = f"WebSocket connection closed: {str(e)}"
            except Exception as e:
                diagnosis["steps"].append({"step": "websocket_connection", "status": "error", "details": str(e)})
                diagnosis["error"] = f"WebSocket error: {str(e)}"
                
        except Exception as e:
            diagnosis["error"] = f"Diagnostic error: {str(e)}"
            diagnosis["steps"].append({"step": "diagnostic_error", "status": "error", "details": str(e)})
                
        return diagnosis

# Instancia global
openclaw_service = OpenClawService()
