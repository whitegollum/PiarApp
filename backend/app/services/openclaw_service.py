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
        El campo 'user' mantiene sesiones persistentes por usuario/club.
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
            "user": session_key,
        }

        logger.info(f"OpenClaw HTTP request: url={url}, user={session_key}, messages={len(openai_messages)}")

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
        Verifica la conexión con OpenClaw via HTTP.
        """
        try:
            token = self._get_token()
            url = f"{self.base_url}/v1/models"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, headers=self._get_auth_headers())
                is_html = response.text.strip().startswith("<!") or response.text.strip().startswith("<html")
                if response.status_code == 200 and not is_html:
                    return {"connected": True, "error": None}
                elif is_html:
                    return {"connected": False, "error": "HTTP API endpoints not enabled (got Control UI HTML). Enable gateway.http.endpoints in openclaw.json"}
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

            # Step 4: Test HTTP API (/v1/models) — verifica que el endpoint HTTP esté habilitado
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{self.base_url}/v1/models",
                        headers=self._get_auth_headers(),
                    )
                    response_text = response.text
                    is_html = response_text.strip().startswith("<!") or response_text.strip().startswith("<html")
                    
                    if response.status_code == 200 and not is_html:
                        diagnosis["steps"].append({
                            "step": "http_models_endpoint",
                            "status": "ok",
                            "details": f"GET /v1/models → 200 (JSON). Response: {response_text}"
                        })
                    elif is_html:
                        diagnosis["steps"].append({
                            "step": "http_models_endpoint",
                            "status": "error",
                            "details": f"GET /v1/models devuelve HTML (Control UI fallback). El endpoint HTTP NO está habilitado. Añade gateway.http.endpoints.models.enabled=true y gateway.http.endpoints.chatCompletions.enabled=true a openclaw.json y reinicia el gateway."
                        })
                        diagnosis["error"] = "HTTP API endpoints not enabled in gateway config"
                        return diagnosis
                    else:
                        diagnosis["steps"].append({
                            "step": "http_models_endpoint",
                            "status": "error",
                            "details": f"GET /v1/models → {response.status_code}. Response: {response_text}"
                        })
            except Exception as e:
                diagnosis["steps"].append({
                    "step": "http_models_endpoint",
                    "status": "error",
                    "details": f"HTTP API unreachable: {str(e)}"
                })

            # Step 5: Test HTTP chat completions
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    test_payload = {
                        "model": "openclaw/default",
                        "messages": [{"role": "user", "content": "ping"}],
                        "stream": False,
                        "user": "diagnostic_test",
                    }
                    response = await client.post(
                        f"{self.base_url}/v1/chat/completions",
                        headers=self._get_auth_headers(),
                        json=test_payload,
                    )
                    response_text = response.text
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            diagnosis["steps"].append({
                                "step": "http_chat_test",
                                "status": "ok",
                                "details": f"POST /v1/chat/completions → 200. Response: {response_text}"
                            })
                            diagnosis["success"] = True
                            diagnosis["steps"].append({
                                "step": "connection_summary",
                                "status": "ok",
                                "details": "All tests passed! OpenClaw HTTP API is ready for chat."
                            })
                        except Exception:
                            diagnosis["steps"].append({
                                "step": "http_chat_test",
                                "status": "error",
                                "details": f"POST /v1/chat/completions → 200 but not JSON. Response: {response_text}"
                            })
                            diagnosis["error"] = "Chat API returned non-JSON"
                    else:
                        diagnosis["steps"].append({
                            "step": "http_chat_test",
                            "status": "error",
                            "details": f"POST /v1/chat/completions → {response.status_code}. Response: {response_text}"
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
