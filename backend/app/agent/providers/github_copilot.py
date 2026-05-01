"""
GitHub Copilot provider — usa el endpoint OpenAI-compatible de api.githubcopilot.com.
Auth: device-code flow contra GitHub, luego session-token efímero (~30 min).

ADVERTENCIA: usar Copilot como backend de un servicio de producción puede
violar los TOS de GitHub. Recomendado solo para dev/testing personal.
"""
import asyncio
import json
import time
from pathlib import Path

import httpx

from app.config import settings
from .base import ProviderBase

COPILOT_FILE = Path(settings.agent_data_dir) / ".copilot_oauth.json"
TOKEN_LOCK = asyncio.Lock()

# GitHub OAuth public client ID (VS Code)
GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"
GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token"
COPILOT_CHAT_URL = "https://api.githubcopilot.com/chat/completions"


class GitHubCopilotProvider(ProviderBase):
    """Provider que usa GitHub Copilot como backend de LLM."""

    async def _ensure_session_token(self) -> str:
        """Token efímero (~30 min) obtenido del github_token de larga duración."""
        async with TOKEN_LOCK:
            if not COPILOT_FILE.exists():
                raise RuntimeError(
                    "Copilot OAuth no configurado. Usa /api/admin/agent/oauth/copilot/start "
                    "para iniciar el flujo de autenticación."
                )
            data = json.loads(COPILOT_FILE.read_text())
            now = time.time()

            # Session token todavía válido
            if data.get("session_expires_at", 0) - 60 > now:
                return data["session_token"]

            # Obtener nuevo session token con el github_token
            github_token = data.get("github_token")
            if not github_token:
                raise RuntimeError(
                    "No hay github_token almacenado. Re-autoriza vía "
                    "/api/admin/agent/oauth/copilot/start"
                )

            async with httpx.AsyncClient(timeout=30.0) as http:
                r = await http.get(
                    COPILOT_TOKEN_URL,
                    headers={
                        "Authorization": f"token {github_token}",
                        "Accept": "application/json",
                    },
                )
                r.raise_for_status()
                tok = r.json()

            data["session_token"] = tok["token"]
            data["session_expires_at"] = tok["expires_at"]
            COPILOT_FILE.write_text(json.dumps(data, indent=2))
            return tok["token"]

    async def list_models(self) -> list[dict]:
        return [
            {"id": "gpt-4o", "name": "Copilot · GPT-4o", "context_window": 128000},
            {"id": "gpt-4o-mini", "name": "Copilot · GPT-4o mini", "context_window": 128000},
            {"id": "claude-3.5-sonnet", "name": "Copilot · Claude Sonnet", "context_window": 200000},
        ]

    async def chat(self, messages, tools=None, model="gpt-4o-mini",
                   max_tokens=2048, temperature=0.7) -> dict:
        token = await self._ensure_session_token()
        async with httpx.AsyncClient(timeout=120.0) as http:
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            r = await http.post(
                COPILOT_CHAT_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Editor-Version": "vscode/1.90.0",
                    "Editor-Plugin-Version": "copilot/1.200.0",
                    "Openai-Intent": "conversation-panel",
                },
            )
            r.raise_for_status()
            resp = r.json()

        msg = resp["choices"][0]["message"]
        tool_calls = None
        if msg.get("tool_calls"):
            tool_calls = [
                {"id": tc["id"], "name": tc["function"]["name"],
                 "arguments": json.loads(tc["function"]["arguments"])}
                for tc in msg["tool_calls"]
            ]
        stop = "tool_use" if tool_calls else (
            "length" if resp["choices"][0]["finish_reason"] == "length" else "end"
        )
        return {
            "content": msg.get("content"),
            "tool_calls": tool_calls,
            "stop_reason": stop,
            "tokens_in": resp.get("usage", {}).get("prompt_tokens", 0),
            "tokens_out": resp.get("usage", {}).get("completion_tokens", 0),
        }


# --- Device-code flow helpers (usados por admin_router) ---

async def start_device_code_flow() -> dict:
    """Inicia un device-code flow contra GitHub.
    Devuelve {device_code, user_code, verification_uri, expires_in, interval}.
    """
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            GITHUB_DEVICE_CODE_URL,
            data={
                "client_id": GITHUB_CLIENT_ID,
                "scope": "read:user",
            },
            headers={"Accept": "application/json"},
        )
        r.raise_for_status()
        return r.json()


async def poll_device_code(device_code: str) -> dict:
    """Hace polling del token endpoint de GitHub.
    Si authorization_pending → {"status": "pending"}
    Si completado → obtiene copilot session token, guarda todo y devuelve {"status": "complete"}
    """
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": GITHUB_CLIENT_ID,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
        )

    body = r.json()

    error = body.get("error", "")
    if error == "authorization_pending":
        return {"status": "pending"}
    if error == "slow_down":
        return {"status": "pending", "slow_down": True}
    if error == "expired_token":
        return {"status": "expired"}
    if error:
        return {"status": "error", "detail": body.get("error_description", error)}

    # Éxito - tenemos un github access_token
    github_token = body.get("access_token")
    if not github_token:
        return {"status": "error", "detail": "No access_token in response"}

    # Obtener session token de Copilot
    async with httpx.AsyncClient(timeout=30.0) as http:
        r2 = await http.get(
            COPILOT_TOKEN_URL,
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/json",
            },
        )
        if r2.status_code != 200:
            return {
                "status": "error",
                "detail": "GitHub token obtenido pero no se pudo acceder a Copilot. "
                          "¿La cuenta tiene licencia de Copilot activa?",
            }
        copilot_tok = r2.json()

    # Guardar todo
    token_data = {
        "github_token": github_token,
        "session_token": copilot_tok["token"],
        "session_expires_at": copilot_tok["expires_at"],
    }
    COPILOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    COPILOT_FILE.write_text(json.dumps(token_data, indent=2))
    return {"status": "complete"}
