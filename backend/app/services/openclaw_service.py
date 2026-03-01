import websockets
import json
import asyncio
from typing import List, Dict, Any, Optional
from ..config import Settings

settings = Settings()

class OpenClawService:
    def __init__(self):
        self.auth_mode = settings.openclaw_auth_mode
        self.api_key = settings.openclaw_api_key
        # Use WS URL (convert http/https to ws/wss if needed, or expect correct config)
        self.ws_url = settings.openclaw_api_url.replace("http://", "ws://").replace("https://", "wss://").replace("/v1/chat", "") 
        self.password = settings.openclaw_password
        
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
        
        try:
            async with websockets.connect(uri) as websocket:
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
                                "id": "gateway-client",
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
                            "userAgent": "gateway-client/1.0.0"
                        }
                    }
                    await websocket.send(json.dumps(handshake_payload))
                    
                    # 3. Esperar confirmación de conexión (asumiendo que devuelve algo)
                    # El ejemplo JS no muestra que pasa después, pero es normal esperar un 'op': 'connected' o similar.
                    # Por ahora devolvemos "Conexión WS Establecida" para probar el handshake.
                    # En una implementación real de chat, aquí enviaríamos el mensaje del usuario.
                    
                    # Para el propósito de "get_response", voy a intentar enviar el mensaje si el handshake es exitoso.
                    # Como no tengo la especificación de cómo enviar mensajes por WS en OpenClaw,
                    # asumiré por ahora que solo probamos conexión o usaré un formato genérico si confirma.
                    
                    connect_response = await websocket.recv()
                    connect_data = json.loads(connect_response)
                    
                    if not (connect_data.get("ok") or connect_data.get("type") == "res"):
                        return f"Fallo en handshake: {connect_data}"
                        
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
                    await websocket.send(json.dumps(chat_payload))
                    
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
                    return f"Respuesta inesperada del servidor (no challenge): {response}"

        except websockets.exceptions.ConnectionClosedError as e:
            return f"Conexión cerrada inesperadamente: {e}"
        except Exception as e:
            return f"Error WebSocket: {str(e)}"

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
                                "id": "gateway-client",
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
                            "userAgent": "gateway-client/1.0.0"
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

# Instancia global
openclaw_service = OpenClawService()
