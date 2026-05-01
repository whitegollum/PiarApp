"""
OpenAI OAuth provider (suscripción ChatGPT / Codex).

Implementa el flujo PKCE contra auth.openai.com usando el client_id público
del Codex CLI. El token resultante permite inferencia contra
chatgpt.com/backend-api/codex/responses.

ATENCIÓN:
- Los refresh tokens pueden ser single-use (rotación). Siempre persistir
  el refresh_token devuelto en cada refresh.
- Este patrón replica el del Codex CLI y puede romperse si OpenAI cambia
  el system prompt requerido o los headers de verificación.
- El admin debe abrir un navegador en la misma máquina que corre el backend
  (o accesible via localhost:1455).
"""
import asyncio
import base64
import hashlib
import json
import logging
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs

import httpx

from app.config import settings
from .base import ProviderBase

log = logging.getLogger(__name__)

# --- Constantes del flujo OAuth (Codex CLI) ---
CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
REDIRECT_URI = "http://localhost:1455/auth/callback"
OAUTH_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize"
OAUTH_TOKEN_URL = "https://auth.openai.com/oauth/token"
SCOPES = "openid profile email offline_access"

# Inferencia
INFERENCE_BASE_URL = "https://chatgpt.com/backend-api"
INFERENCE_PATH = "/codex/responses"
INFERENCE_URL = f"{INFERENCE_BASE_URL}{INFERENCE_PATH}"

# Persistencia
OAUTH_FILE = Path(settings.agent_data_dir) / ".openai_oauth.json"
MODELS_CACHE_FILE = Path(settings.agent_data_dir) / ".codex_models_cache.json"
TOKEN_LOCK = asyncio.Lock()

# Refresh con 5 minutos de margen
REFRESH_LEEWAY_S = 5 * 60

# Cache TTL para modelos: 24 horas
MODELS_CACHE_TTL_S = 86400

# --- Catálogo estático curado ---
# Fuente: @mariozechner/pi-ai (packages/ai/scripts/generate-models.ts)
# Provider: "openai-codex", API: "openai-codex-responses"
# Base URL: https://chatgpt.com/backend-api
# Actualizar cuando se publique nueva versión de pi-ai con cambios en codexModels.
BUNDLED_MODELS: list[dict] = [
    {"id": "gpt-5.1", "name": "GPT-5.1", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.1-codex-max", "name": "GPT-5.1 Codex Max", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.1-codex-mini", "name": "GPT-5.1 Codex Mini", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.2", "name": "GPT-5.2", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.2-codex", "name": "GPT-5.2 Codex", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.3-codex", "name": "GPT-5.3 Codex", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.4", "name": "GPT-5.4", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.5", "name": "GPT-5.5", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.4-mini", "name": "GPT-5.4 Mini", "context_window": 272000, "max_tokens": 128000},
    {"id": "gpt-5.3-codex-spark", "name": "GPT-5.3 Codex Spark", "context_window": 128000, "max_tokens": 128000},
]

# Codex system prompt (requerido por el chequeo de auth de OpenAI).
# Mantener sincronizado con https://github.com/openai/codex
CODEX_SYSTEM_PROMPT = (
    "You are a coding assistant. Help the user with their coding tasks. "
    "Be concise and direct."
)


# =============================================================================
# PKCE helpers
# =============================================================================

def _generate_pkce() -> tuple[str, str]:
    """Genera code_verifier + code_challenge (S256)."""
    verifier_bytes = secrets.token_bytes(32)
    code_verifier = base64.urlsafe_b64encode(verifier_bytes).rstrip(b"=").decode()
    challenge_bytes = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(challenge_bytes).rstrip(b"=").decode()
    return code_verifier, code_challenge


def _generate_state() -> str:
    return secrets.token_urlsafe(16)


# =============================================================================
# Token persistence
# =============================================================================

def _save_tokens(data: dict) -> None:
    """Guarda tokens en disco."""
    OAUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    OAUTH_FILE.write_text(json.dumps(data, indent=2))
    try:
        OAUTH_FILE.chmod(0o600)
    except OSError:
        pass


def _load_tokens() -> dict | None:
    if not OAUTH_FILE.exists():
        return None
    try:
        return json.loads(OAUTH_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _decode_jwt_payload(jwt_token: str) -> dict:
    """Decodifica el payload de un JWT sin verificar firma."""
    parts = jwt_token.split(".")
    if len(parts) < 2:
        return {}
    payload_b64 = parts[1]
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception:
        return {}


def _extract_account_id(id_token: str) -> str:
    """Extrae el chatgpt_account_id del id_token JWT."""
    payload = _decode_jwt_payload(id_token)
    auth_claim = payload.get("https://api.openai.com/auth", {})
    return (
        auth_claim.get("chatgpt_account_id")
        or auth_claim.get("user_id")
        or payload.get("sub", "")
    )


# =============================================================================
# OAuth flow state (en memoria del proceso)
# =============================================================================

_pending_flow: dict | None = None
_flow_complete_event: asyncio.Event | None = None


# =============================================================================
# Callback server (puerto 1455)
# =============================================================================

async def _run_callback_server(expected_state: str, timeout_s: int = 300) -> str:
    """
    Levanta un servidor HTTP en 127.0.0.1:1455, espera el callback de OpenAI
    y devuelve el authorization code.
    """
    received_code: list[str | None] = [None]
    error_msg: list[str | None] = [None]

    async def handle_request(reader: asyncio.StreamReader,
                             writer: asyncio.StreamWriter):
        # Leer request line
        request_line = await reader.readline()
        request_str = request_line.decode("utf-8", errors="replace")

        # Leer headers (descartamos)
        while True:
            line = await reader.readline()
            if line in (b"\r\n", b"\n", b""):
                break

        parts = request_str.split(" ")
        if len(parts) < 2:
            writer.close()
            await writer.wait_closed()
            return

        path = parts[1]
        if not path.startswith("/auth/callback"):
            body = "Not Found"
            resp = f"HTTP/1.1 404 Not Found\r\nContent-Length: {len(body)}\r\n\r\n{body}"
            writer.write(resp.encode())
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        parsed = urlparse(path)
        params = parse_qs(parsed.query)

        if "error" in params:
            error_msg[0] = params["error"][0]
            body = f"<h1>Error: {error_msg[0]}</h1>"
            resp = (
                f"HTTP/1.1 400 Bad Request\r\n"
                f"Content-Type: text/html\r\n"
                f"Content-Length: {len(body.encode())}\r\n\r\n{body}"
            )
            writer.write(resp.encode())
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        cb_state = params.get("state", [None])[0]
        if cb_state != expected_state:
            error_msg[0] = "State mismatch — posible CSRF"
            body = f"<h1>{error_msg[0]}</h1>"
            resp = (
                f"HTTP/1.1 400 Bad Request\r\n"
                f"Content-Type: text/html\r\n"
                f"Content-Length: {len(body.encode())}\r\n\r\n{body}"
            )
            writer.write(resp.encode())
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        code = params.get("code", [None])[0]
        if not code:
            error_msg[0] = "Missing authorization code"
            body = f"<h1>{error_msg[0]}</h1>"
            resp = (
                f"HTTP/1.1 400 Bad Request\r\n"
                f"Content-Type: text/html\r\n"
                f"Content-Length: {len(body.encode())}\r\n\r\n{body}"
            )
            writer.write(resp.encode())
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        received_code[0] = code
        body = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<title>Login completado</title></head>"
            "<body style='font-family:system-ui;text-align:center;padding:4rem'>"
            "<h1>✅ Autenticación completada</h1>"
            "<p>Ya puedes cerrar esta pestaña y volver a la aplicación.</p>"
            "</body></html>"
        )
        resp = (
            f"HTTP/1.1 200 OK\r\n"
            f"Content-Type: text/html; charset=utf-8\r\n"
            f"Content-Length: {len(body.encode())}\r\n\r\n{body}"
        )
        writer.write(resp.encode())
        await writer.drain()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(handle_request, "127.0.0.1", 1455)

    try:
        deadline = time.time() + timeout_s
        while received_code[0] is None and error_msg[0] is None:
            if time.time() > deadline:
                raise RuntimeError(
                    "Timeout esperando callback OAuth (5 min). "
                    "El usuario no completó el login."
                )
            await asyncio.sleep(0.5)
    finally:
        server.close()
        await server.wait_closed()

    if error_msg[0]:
        raise RuntimeError(f"OAuth error: {error_msg[0]}")

    return received_code[0]  # type: ignore


# =============================================================================
# Token exchange & refresh
# =============================================================================

async def _exchange_code(code: str, code_verifier: str) -> dict:
    """Intercambia authorization code por tokens."""
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            OAUTH_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "code_verifier": code_verifier,
            },
        )
        if r.status_code != 200:
            raise RuntimeError(f"Token exchange failed: {r.status_code} {r.text}")
        return r.json()


async def _refresh_tokens(refresh_token: str) -> dict:
    """Refresca el access_token usando el refresh_token."""
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            OAUTH_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": CLIENT_ID,
                "scope": SCOPES,
            },
        )
        if r.status_code != 200:
            raise RuntimeError(
                f"Refresh failed ({r.status_code}). "
                "El usuario debe re-autenticarse."
            )
        return r.json()


# =============================================================================
# Public API: start flow, poll status
# =============================================================================

async def start_oauth_flow() -> dict:
    """
    Inicia el flujo OAuth PKCE:
    1. Genera PKCE + state
    2. Arranca callback server en background (127.0.0.1:1455)
    3. Devuelve {authorization_url, ...} para que el frontend abra la URL
    """
    global _pending_flow, _flow_complete_event

    code_verifier, code_challenge = _generate_pkce()
    state = _generate_state()

    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "state": state,
    }
    authorization_url = f"{OAUTH_AUTHORIZE_URL}?{urlencode(params)}"

    _pending_flow = {
        "code_verifier": code_verifier,
        "state": state,
        "started_at": time.time(),
    }
    _flow_complete_event = asyncio.Event()

    # Lanzar callback server + exchange en background
    asyncio.create_task(_background_oauth_flow(state, code_verifier))

    return {
        "authorization_url": authorization_url,
        "state": state,
        "redirect_uri": REDIRECT_URI,
        "expires_in": 300,
    }


async def _background_oauth_flow(state: str, code_verifier: str):
    """Background task: espera callback, intercambia code, guarda tokens."""
    global _pending_flow, _flow_complete_event
    try:
        code = await _run_callback_server(state, timeout_s=300)
        tokens = await _exchange_code(code, code_verifier)

        # Extraer account_id del id_token
        account_id = ""
        if tokens.get("id_token"):
            account_id = _extract_account_id(tokens["id_token"])

        token_data = {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
            "expires_at": time.time() + tokens.get("expires_in", 3600),
            "account_id": account_id,
        }
        _save_tokens(token_data)
        log.info("OpenAI OAuth completado (account=%s...)", account_id[:8] if account_id else "?")

    except Exception as e:
        log.error("OpenAI OAuth flow failed: %s", e)
    finally:
        _pending_flow = None
        if _flow_complete_event:
            _flow_complete_event.set()


async def poll_oauth_status() -> dict:
    """
    Estado del flujo OAuth en curso.
    Returns: {"status": "no_flow"|"pending"|"complete"|"error"}
    """
    global _pending_flow, _flow_complete_event

    if _pending_flow is None:
        tokens = _load_tokens()
        if tokens and tokens.get("access_token"):
            return {"status": "complete"}
        return {"status": "no_flow"}

    if _flow_complete_event and _flow_complete_event.is_set():
        tokens = _load_tokens()
        if tokens and tokens.get("access_token"):
            return {"status": "complete"}
        return {"status": "error", "detail": "Flow completó pero no se guardaron tokens"}

    elapsed = time.time() - _pending_flow.get("started_at", 0)
    if elapsed > 300:
        _pending_flow = None
        return {"status": "error", "detail": "Timeout - usuario no completó el login"}

    return {"status": "pending"}


# =============================================================================
# Provider implementation
# =============================================================================

class OpenAIOAuthProvider(ProviderBase):
    """
    Provider que usa OAuth del Codex CLI para inferencia contra
    chatgpt.com/backend-api/codex/responses (Responses API).
    """

    async def _ensure_token(self) -> tuple[str, str]:
        """Devuelve (access_token, account_id) válidos."""
        async with TOKEN_LOCK:
            data = _load_tokens()
            if not data:
                raise RuntimeError(
                    "OAuth no configurado. Usa 'Conectar OpenAI OAuth' "
                    "en el panel de administración."
                )

            now = time.time()
            if data.get("expires_at", 0) - REFRESH_LEEWAY_S > now:
                return data["access_token"], data.get("account_id", "")

            if not data.get("refresh_token"):
                raise RuntimeError(
                    "No hay refresh_token. Re-autoriza en el panel de administración."
                )

            try:
                tok = await _refresh_tokens(data["refresh_token"])
            except RuntimeError:
                OAUTH_FILE.unlink(missing_ok=True)
                raise

            data.update({
                "access_token": tok["access_token"],
                "refresh_token": tok.get("refresh_token", data["refresh_token"]),
                "expires_at": now + tok.get("expires_in", 3600),
            })
            _save_tokens(data)
            return data["access_token"], data.get("account_id", "")

    async def list_models(self) -> list[dict]:
        """
        Hybrid model listing (Approach C):
        1. Check file-based cache (TTL 24h)
        2. If stale/missing → fetch from remote Codex /models endpoint
        3. Merge remote results with bundled catalog (remote wins on conflicts)

        The cache prevents hammering the (undocumented) endpoint on every
        admin panel load.
        """
        # 1. Try disk cache
        cached = self._read_models_cache()
        if cached is not None:
            return cached

        # 2. Try remote endpoint
        remote = await self._fetch_remote_models()

        # 3. Merge: remote models + bundled (dedup by id, remote wins)
        seen_ids: set[str] = set()
        merged: list[dict] = []

        if remote:
            for m in remote:
                seen_ids.add(m["id"])
                merged.append(m)

        for m in BUNDLED_MODELS:
            if m["id"] not in seen_ids:
                merged.append({
                    "id": m["id"],
                    "name": m["name"],
                    "context_window": m["context_window"],
                })

        # Cache the merged result
        if merged:
            self._write_models_cache(merged)

        return merged if merged else [
            {"id": "o4-mini", "name": "o4-mini", "context_window": 200000}
        ]

    def _read_models_cache(self) -> list[dict] | None:
        """Return cached models if file exists and is fresh (< TTL)."""
        try:
            if not MODELS_CACHE_FILE.exists():
                return None
            data = json.loads(MODELS_CACHE_FILE.read_text())
            if time.time() - data.get("fetched_at", 0) > MODELS_CACHE_TTL_S:
                return None
            models = data.get("models", [])
            return models if models else None
        except Exception:
            return None

    def _write_models_cache(self, models: list[dict]) -> None:
        """Persist models to cache file."""
        try:
            MODELS_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            MODELS_CACHE_FILE.write_text(json.dumps({
                "fetched_at": time.time(),
                "models": models,
            }, indent=2))
        except Exception as e:
            log.warning(f"Could not write models cache: {e}")

    async def _fetch_remote_models(self) -> list[dict] | None:
        """
        Fetch available models from the Codex backend.
        Returns parsed list or None on failure.
        """
        try:
            access_token, account_id = await self._ensure_token()
        except Exception as e:
            log.warning(f"Cannot fetch models (no token): {e}")
            return None

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "User-Agent": "codex_cli_rs/0.1.0",
            "originator": "codex_cli_rs",
        }
        if account_id:
            headers["chatgpt-account-id"] = account_id

        try:
            async with httpx.AsyncClient(timeout=15.0) as http:
                r = await http.get(
                    f"{INFERENCE_BASE_URL}/codex/models",
                    headers=headers,
                    params={"client_version": "0.1.0"},
                )
                if r.status_code != 200:
                    log.warning(
                        f"Codex /models returned {r.status_code}: "
                        f"{r.text[:200]}"
                    )
                    return None

                data = r.json()
                # Endpoint puede devolver {"models": [...]} o una lista directa
                raw = data.get("models") if isinstance(data, dict) else data
                if not isinstance(raw, list):
                    log.warning("Codex /models: unexpected response shape")
                    return None

                models = []
                for m in raw:
                    mid = m.get("id") or m.get("slug") or m.get("model")
                    if not mid:
                        continue
                    name = m.get("name") or m.get("title") or mid
                    models.append({
                        "id": mid,
                        "name": name,
                        "context_window": m.get("context_window", 200000),
                    })

                if not models:
                    log.warning("Codex /models returned empty list")
                    return None

                log.info(f"Fetched {len(models)} models from Codex endpoint")
                return models

        except Exception as e:
            log.warning(f"Failed to fetch Codex models: {e}")
            return None

    async def chat(self, messages, tools=None, model="gpt-5.2",
                   max_tokens=2048, temperature=0.7, debug=False,
                   system_prompt: str | None = None) -> dict:
        """
        Envía request al endpoint de inferencia Codex (Responses API).
        """
        # Legacy models not in the Codex catalog — remap to safe default
        LEGACY_REMAP = {"gpt-4o-mini", "gpt-4o", "o4-mini", "o3", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"}
        if model in LEGACY_REMAP:
            model = "gpt-5.2"

        access_token, account_id = await self._ensure_token()

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "responses=v1",
            "User-Agent": "codex_cli_rs/0.1.0",
            "originator": "codex_cli_rs",
        }
        if account_id:
            headers["chatgpt-account-id"] = account_id

        instructions = system_prompt if system_prompt else CODEX_SYSTEM_PROMPT
        payload: dict = {
            "model": model,
            "instructions": instructions,
            "input": messages,
            "store": False,
            "stream": True,
        }

        if tools:
            # Convert Chat Completions tool format to Responses API format
            converted_tools = []
            for t in tools:
                if "function" in t:
                    fn = t["function"]
                    converted_tools.append({
                        "type": "function",
                        "name": fn["name"],
                        "description": fn.get("description", ""),
                        "parameters": fn.get("parameters", {}),
                    })
                else:
                    converted_tools.append(t)
            payload["tools"] = converted_tools

        async with httpx.AsyncClient(timeout=120.0) as http:
            # First attempt
            async with http.stream("POST", INFERENCE_URL, headers=headers, json=payload) as r:
                if r.status_code == 401:
                    await r.aread()  # consume body
                    log.warning("Codex inference 401, reintentando con refresh...")
                    access_token, account_id = await self._ensure_token()
                    headers["Authorization"] = f"Bearer {access_token}"
                    if account_id:
                        headers["chatgpt-account-id"] = account_id
                else:
                    if r.status_code != 200:
                        body = await r.aread()
                        error_text = body.decode()[:500]
                        log.error("Codex inference failed: %s %s", r.status_code, error_text)
                        if debug:
                            raise RuntimeError(json.dumps({
                                "error": f"HTTP {r.status_code}",
                                "detail": error_text,
                                "payload_sent": {k: v for k, v in payload.items() if k != "input"},
                            }))
                        raise RuntimeError(f"Error inferencia Codex: {r.status_code}")

                    # Consume SSE stream and collect events
                    collected_events = []
                    async for line in r.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                collected_events.append(json.loads(data_str))
                            except json.JSONDecodeError:
                                continue

                    return self._parse_stream_response(collected_events, debug=debug)

            # Retry after 401
            async with http.stream("POST", INFERENCE_URL, headers=headers, json=payload) as r:
                if r.status_code != 200:
                    body = await r.aread()
                    error_text = body.decode()[:500]
                    log.error("Codex inference failed (retry): %s %s", r.status_code, error_text)
                    if debug:
                        raise RuntimeError(json.dumps({
                            "error": f"HTTP {r.status_code} (retry)",
                            "detail": error_text,
                        }))
                    raise RuntimeError(f"Error inferencia Codex: {r.status_code}")

                collected_events = []
                async for line in r.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            collected_events.append(json.loads(data_str))
                        except json.JSONDecodeError:
                            continue

                return self._parse_stream_response(collected_events, debug=debug)

    def _parse_stream_response(self, collected_events: list, debug: bool = False) -> dict:
        """Parse collected SSE events into a unified response dict."""
        # Debug: log event types
        event_types = [e.get("type") for e in collected_events]
        log.info("SSE event types received: %s", event_types)

        # First: always accumulate text deltas (most reliable method)
        text_parts = []
        for evt in collected_events:
            if evt.get("type") == "response.output_text.delta":
                text_parts.append(evt.get("delta", ""))

        # Accumulate function call arguments from streaming deltas
        func_call_args_parts = []
        func_call_name = None
        func_call_id = None
        for evt in collected_events:
            if evt.get("type") == "response.output_item.added":
                item = evt.get("item", {})
                if item.get("type") == "function_call":
                    func_call_name = item.get("name")
                    func_call_id = item.get("call_id", item.get("id", ""))
            elif evt.get("type") == "response.function_call_arguments.delta":
                func_call_args_parts.append(evt.get("delta", ""))

        # Build the final response object from "response.completed" for metadata
        resp = {}
        for evt in collected_events:
            if evt.get("type") == "response.completed":
                resp = evt.get("response", evt)
                break

        log.debug("response.completed output: %s", resp.get("output", []))

        # Parse tool calls from response.completed output OR from streaming deltas
        tool_calls = None
        output_items = resp.get("output", [])
        for item in output_items:
            if item.get("type") == "function_call":
                if tool_calls is None:
                    tool_calls = []
                args = item.get("arguments", "{}")
                tool_calls.append({
                    "id": item.get("call_id", item.get("id", "")),
                    "name": item.get("name", ""),
                    "arguments": json.loads(args) if isinstance(args, str) else args,
                })

        # Fallback: build tool call from streaming deltas if not found in completed
        if not tool_calls and func_call_name:
            args_str = "".join(func_call_args_parts) or "{}"
            tool_calls = [{
                "id": func_call_id or "call_0",
                "name": func_call_name,
                "arguments": json.loads(args_str) if isinstance(args_str, str) else args_str,
            }]

        # Content: prefer accumulated deltas, then try output items, then output_text
        content = None
        if text_parts:
            content = "".join(text_parts)
        else:
            for item in output_items:
                if item.get("type") == "message":
                    msg_content = item.get("content", [])
                    texts = [
                        c.get("text", "")
                        for c in msg_content
                        if c.get("type") == "output_text"
                    ]
                    if texts:
                        content = "\n".join(texts)
                        break

        if content is None and not tool_calls:
            fallback = resp.get("output_text", "")
            content = fallback if isinstance(fallback, str) else ""

        # Ensure content is always a string
        if not isinstance(content, str):
            content = str(content) if content else ""

        stop_reason = "tool_use" if tool_calls else "end"
        usage = resp.get("usage", {})

        result = {
            "content": content,
            "tool_calls": tool_calls,
            "stop_reason": stop_reason,
            "tokens_in": usage.get("input_tokens", usage.get("prompt_tokens", 0)),
            "tokens_out": usage.get("output_tokens", usage.get("completion_tokens", 0)),
        }
        if debug:
            result["_debug"] = {
                "event_types": event_types,
                "event_count": len(collected_events),
                "raw_events": collected_events[:20],  # limit to avoid huge payloads
                "completed_output": output_items,
            }
        log.info("Parsed response: content=%s, tool_calls=%s, stop=%s",
                 repr(content[:100]) if content else None, tool_calls, stop_reason)
        return result
