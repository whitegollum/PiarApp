import httpx
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
        self.password = settings.openclaw_password
        # Base URL for HTTP API (e.g. http://127.0.0.1:18789)
        self.base_url = settings.openclaw_api_url.replace("/v1/chat", "").rstrip("/")
        # WS URL for diagnostic only
        self.ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
        logger.info(f"OpenClawService initialized: base_url={self.base_url}, ws_url={self.ws_url}, auth_mode={self.auth_mode}")

    def _get_token(self) -> str:
        secret = self.password if self.auth_mode == "password" else self.api_key
        if not secret:
            raise ValueError(f"Credencial no configurada para OpenClaw (modo: {self.auth_mode})")
        return secret

    def _get_session_key(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Genera una sessionKey basada en el contexto (usuario y club)."""
        if not context:
            return "agent:main:main"
        user_id = context.get("user_id")
        club_id = context.get("club_id")
        if user_id and club_id:
            return f"agent:main:club_{club_id}_user_{user_id}"
        elif user_id:
            return f"agent:main:user_{user_id}"
        return "agent:main:main"

    def _get_auth_headers(self) -> Dict[str, str]:
        """Headers de autenticación para la HTTP API."""
        token = self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def get_response(self, messages: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> str:
        """
        Envía mensajes a OpenClaw via HTTP API (OpenAI-compatible /v1/chat/completions).
        Con shared-secret auth, el gateway concede scopes operator completos automáticamente.
        """
        url = f"{self.base_url}/v1/chat/completions"
        session_key = self._get_session_key(context)

        # Construir mensajes en formato OpenAI
        openai_messages = []
        for m in messages:
            openai_messages.append({
                "role": m.get("role", "user"),
                "content": m.get("content", ""),
            })

        payload = {
            "model": "openclaw/default",
            "messages": openai_messages,
            "stream": False,
        }

        logger.info(f"OpenClaw HTTP request: url={url}, session_key={session_key}, messages={len(openai_messages)}")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_auth_headers(),
                    json=payload,
                )

                if response.status_code != 200:
                    error_body = response.text
                    logger.error(f"OpenClaw HTTP error {response.status_code}: {error_body}")
                    return f"Error de OpenClaw (HTTP {response.status_code}): {error_body[:500]}"

                data = response.json()
                # OpenAI-compatible response format
                choices = data.get("choices", [])
                if choices:
                    message = choices[0].get("message", {})
                    content = message.get("content", "")
                    if content:
                        return content

                # Fallback: devolver raw si no es formato esperado
                logger.warning(f"Unexpected response format: {str(data)[:500]}")
                return str(data)

        except httpx.TimeoutException:
            error_msg = "Error: Tiempo de espera agotado esperando respuesta de OpenClaw"
            logger.error(error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Error HTTP OpenClaw: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return error_msg

    async def get_chat_history(self, session_key: Optional[str] = None, context: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Recupera el historial de chat.
        Nota: La HTTP API de OpenClaw puede no tener un endpoint de historial directo.
        Si no existe, devuelve lista vacía.
        """
        if not session_key:
            session_key = self._get_session_key(context)

        # Intentar endpoint de historial si existe
        url = f"{self.base_url}/v1/chat/history"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    url,
                    headers=self._get_auth_headers(),
                    params={"session_key": session_key, "limit": limit},
                )

                if response.status_code == 404:
                    # Endpoint no existe, normal
                    logger.info("Chat history endpoint not available")
                    return []

                if response.status_code != 200:
                    logger.warning(f"Chat history error {response.status_code}: {response.text[:200]}")
                    return []

                data = response.json()
                messages = []
                if isinstance(data, list):
                    messages = data
                elif isinstance(data, dict):
                    messages = data.get("messages", []) or data.get("history", []) or []

                # Filtrar solo mensajes de usuario y asistente
                return [m for m in messages if m.get("role") in ["user", "assistant"]]

        except Exception as e:
            logger.warning(f"Error obteniendo historial: {e}")
            return []

    async def check_connection_status(self) -> Dict[str, Any]:
        """
        Verifica la conexión con OpenClaw via HTTP health check.
        """
        try:
            token = self._get_token()
            # Intentar un health check simple
            url = f"{self.base_url}/v1/models"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, headers=self._get_auth_headers())
                if response.status_code == 200:
                    return {"connected": True, "error": None}
                else:
                    return {"connected": False, "error": f"HTTP {response.status_code}: {response.text[:200]}"}
        except httpx.TimeoutException:
            return {"connected": False, "error": "Connection timeout"}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def diagnose_connection(self) -> Dict[str, Any]:
        """
        Diagnostica exhaustivamente la conexión a OpenClaw.
        Prueba tanto la HTTP API como el WebSocket.
        """
        diagnosis = {
            "config": {
                "base_url": self.base_url,
                "ws_url": self.ws_url,
                "auth_mode": self.auth_mode,
                "has_password": bool(self.password),
                "has_api_key": bool(self.api_key),
                "protocol_version": 3,
            },
            "steps": [],
            "success": False,
            "error": None
        }

        try:
            # Step 1: Verificar configuración
            diagnosis["steps"].append({
                "step": "config_check",
                "status": "ok",
                "details": f"Base URL: {self.base_url}, WS URL: {self.ws_url}, Auth: {self.auth_mode}, Password: {'✓' if self.password else '✗'}"
            })

            # Step 2: Obtener token
            try:
                token = self._get_token()
                token_preview = token[:20] + "..." if len(token) > 20 else token
                diagnosis["steps"].append({
                    "step": "token_retrieval",
                    "status": "ok",
                    "details": f"Token retrieved ({len(token)} chars): {token_preview}"
                })
            except Exception as e:
                diagnosis["steps"].append({"step": "token_retrieval", "status": "error", "details": str(e)})
                diagnosis["error"] = f"Token error: {str(e)}"
                return diagnosis

            # Step 3: Verificar conectividad de red
            try:
                import socket
                url_parts = self.base_url.replace('http://', '').replace('https://', '').split(':')
                host = url_parts[0]
                port = int(url_parts[1].split('/')[0]) if len(url_parts) > 1 else 18789

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

            # Step 4: Test HTTP API (/v1/models)
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{self.base_url}/v1/models",
                        headers=self._get_auth_headers(),
                    )
                    if response.status_code == 200:
                        diagnosis["steps"].append({
                            "step": "http_api_check",
                            "status": "ok",
                            "details": f"HTTP API responsive (GET /v1/models → 200). Response: {response.text[:500]}"
                        })
                    else:
                        diagnosis["steps"].append({
                            "step": "http_api_check",
                            "status": "warning",
                            "details": f"HTTP API returned {response.status_code}: {response.text[:500]}"
                        })
            except Exception as e:
                diagnosis["steps"].append({
                    "step": "http_api_check",
                    "status": "error",
                    "details": f"HTTP API unreachable: {str(e)}"
                })

            # Step 5: Test HTTP chat endpoint
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    test_payload = {
                        "model": "openclaw/default",
                        "messages": [{"role": "user", "content": "ping"}],
                        "stream": False,
                    }
                    response = await client.post(
                        f"{self.base_url}/v1/chat/completions",
                        headers=self._get_auth_headers(),
                        json=test_payload,
                    )
                    if response.status_code == 200:
                        data = response.json()
                        diagnosis["steps"].append({
                            "step": "http_chat_test",
                            "status": "ok",
                            "details": f"Chat completions endpoint working (200). Response keys: {list(data.keys()) if isinstance(data, dict) else type(data).__name__}"
                        })
                        diagnosis["success"] = True
                        diagnosis["steps"].append({
                            "step": "connection_summary",
                            "status": "ok",
                            "details": "All tests passed! OpenClaw HTTP API is ready for chat."
                        })
                    else:
                        diagnosis["steps"].append({
                            "step": "http_chat_test",
                            "status": "error",
                            "details": f"Chat completions returned {response.status_code}: {response.text[:500]}"
                        })
                        diagnosis["error"] = f"Chat API error: HTTP {response.status_code}"
            except httpx.TimeoutException:
                diagnosis["steps"].append({
                    "step": "http_chat_test",
                    "status": "error",
                    "details": "Timeout waiting for chat completions response (30s)"
                })
                diagnosis["error"] = "Chat API timeout"
            except Exception as e:
                diagnosis["steps"].append({
                    "step": "http_chat_test",
                    "status": "error",
                    "details": f"Chat test failed: {str(e)}"
                })
                diagnosis["error"] = f"Chat test error: {str(e)}"

        except Exception as e:
            diagnosis["error"] = f"Diagnostic error: {str(e)}"
            diagnosis["steps"].append({"step": "diagnostic_error", "status": "error", "details": str(e)})

        return diagnosis


# Instancia global
openclaw_service = OpenClawService()
