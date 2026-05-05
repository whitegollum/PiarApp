# 📝 Changelog - Mayo 2026

## Agente IA Nativo (01/05/2026)

### 🎯 Resumen
Reemplazo completo de OpenClaw por un agente IA integrado directamente en el backend FastAPI. Elimina la dependencia del gateway externo, simplifica la arquitectura Docker y añade funcionalidades avanzadas (tool-use, sesiones persistentes, personalidad configurable por admin).

---

## 🤖 Módulo `app/agent/`

### Backend — Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `app/agent/__init__.py` | Módulo principal |
| `app/agent/models.py` | Tablas: `chat_sessions`, `chat_messages`, `agent_config` |
| `app/agent/schemas.py` | Modelos Pydantic v2 (MessageIn, ChatResponse, SessionSummary, etc.) |
| `app/agent/router.py` | Endpoints de chat para usuarios |
| `app/agent/admin_router.py` | Endpoints de configuración para superadmin |
| `app/agent/service.py` | Orquestación del turno (tool-use loop, max 5 iteraciones) |
| `app/agent/storage.py` | CRUD de sesiones/mensajes con ownership checks |
| `app/agent/tools.py` | Tools: `list_clubs`, `list_club_members`, `list_events` |
| `app/agent/persona_loader.py` | Carga y cacheo de personalidad desde markdown |
| `app/agent/dependencies.py` | `get_current_superadmin` dependency |
| `app/agent/providers/__init__.py` | Factory de providers |
| `app/agent/providers/base.py` | Interfaz abstracta `ProviderBase` |
| `app/agent/providers/openai_apikey.py` | Provider OpenAI con API Key |

### Backend — Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/config.py` | +`openai_api_key`, +`agent_data_dir`, -vars OPENCLAW_*, +`extra="ignore"` |
| `app/main.py` | +import agent models, +registro de routers agent, -registro chat.router legacy |
| `app/routes/__init__.py` | -auto-import de `chat` |
| `requirements.txt` | +`openai>=1.50.0` |

### Datos — Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `data/agent/identity.md` | Identidad del agente (nombre, rol, contexto) |
| `data/agent/soul.md` | Tono y personalidad |
| `data/agent/tools.md` | Descripción de herramientas disponibles |
| `data/agent/agents.md` | Instrucciones operativas |

### Docker / Infra

| Archivo | Cambio |
|---------|--------|
| `docker-compose.yml` | Pendiente: eliminar servicio OpenClaw, dar red propia al backend |
| `frontend/nginx.conf` | Upstream cambiado de `openclaw-gateway-piara:8000` a `backend:8000` |

---

## 🔌 API Endpoints Nuevos

### Chat (usuario autenticado)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chat/send` | Enviar mensaje al agente |
| GET | `/api/chat/sessions` | Listar sesiones (filtrable por `club_id`) |
| GET | `/api/chat/sessions/{id}/messages` | Obtener mensajes de una sesión |
| DELETE | `/api/chat/sessions/{id}` | Archivar sesión |

### Admin (superadmin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/agent/config` | Obtener configuración del agente |
| PUT | `/api/admin/agent/config` | Actualizar configuración |
| GET | `/api/admin/agent/providers/{name}/models` | Listar modelos del provider |
| GET | `/api/admin/agent/persona/{filename}` | Leer archivo de personalidad |
| PUT | `/api/admin/agent/persona/{filename}` | Actualizar archivo de personalidad |

---

## 🗑️ Eliminado / Deprecado

- `app/routes/chat.py` — Ya no se registra en `main.py` (legacy OpenClaw proxy)
- `app/services/openclaw_service.py` — Ya no se importa (cliente HTTP a OpenClaw)
- Variables OPENCLAW_* en `config.py` — Eliminadas del modelo Settings
- Servicio `openclaw-gateway-piara` en Docker — Pendiente de eliminar del compose

---

## 📋 Tablas de BD Nuevas

```sql
-- chat_sessions: sesiones de chat por usuario+club
CREATE TABLE chat_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    club_id INTEGER REFERENCES clubes(id),
    title VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- chat_messages: mensajes dentro de sesiones
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSON,
    tool_call_id VARCHAR(100),
    tokens_in INTEGER,
    tokens_out INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- agent_config: configuración singleton del agente
CREATE TABLE agent_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    provider VARCHAR(50) NOT NULL DEFAULT 'openai_apikey',
    model_id VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    max_tokens INTEGER DEFAULT 2048,
    temperature INTEGER DEFAULT 70,
    enabled BOOLEAN DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES usuarios(id)
);
```

> Las tablas se crean automáticamente al arrancar el backend (`Base.metadata.create_all`).

---

## ⚙️ Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | Sí (para chat) | Clave de API de OpenAI |
| `agent_data_dir` | No | Ruta a datos del agente (default: `./data/agent`) |

---

## 🔐 OAuth PKCE — Provider OpenAI (01/05/2026)

### Resumen
Implementación de autenticación OAuth PKCE con ChatGPT Plus para usar el endpoint Codex Responses API (`https://chatgpt.com/backend-api/codex/responses`) sin necesidad de API Key de pago.

### Archivos nuevos/modificados

| Archivo | Descripción |
|---------|-------------|
| `app/agent/providers/openai_oauth.py` | Provider completo: OAuth PKCE S256, token refresh, streaming SSE, tool-use |
| `app/agent/admin_router.py` | +Endpoints OAuth start/poll para OpenAI y Copilot |

### Flujo OAuth PKCE
1. Admin inicia flujo desde UI → backend genera `code_verifier` + `code_challenge` (SHA256)
2. Se abre ventana de autorización en `https://auth0.openai.com/authorize`
3. Callback en `http://localhost:1455/auth/callback` intercambia code por tokens
4. Tokens se persisten en `data/agent/oauth_tokens.json`
5. Refresh automático cuando el access_token expira

### Parámetros OAuth
| Parámetro | Valor |
|-----------|-------|
| `client_id` | `app_EMoamEEZ73f0CkXaXp7hrann` |
| `redirect_uri` | `http://localhost:1455/auth/callback` |
| `audience` | `https://api.openai.com/v1` |
| `scope` | `openid profile email offline_access` |
| `code_challenge_method` | `S256` |

---

## 🧠 Codex Responses API — Formato y Restricciones

### Endpoint
`POST https://chatgpt.com/backend-api/codex/responses`

### Headers requeridos
```
Authorization: Bearer {access_token}
OpenAI-Beta: responses=v1
User-Agent: codex_cli_rs/0.1.0
originator: codex_cli_rs
chatgpt-account-id: {account_id}
```

### Payload
```json
{
  "model": "gpt-5.2",
  "instructions": "...",
  "input": [...],
  "store": false,
  "stream": true,
  "tools": [...]
}
```

### Restricciones importantes
| Restricción | Detalle |
|-------------|---------|
| `stream` | **Obligatorio `true`** — rechaza `false` |
| `store` | **Obligatorio `false`** — rechaza `true` |
| `temperature` | **NO soportado** — error si se incluye |
| `max_output_tokens` | **NO soportado** — error si se incluye |
| Modelo | Solo `gpt-5.2` disponible para ChatGPT Plus |
| Tools format | Plano: `{"type":"function","name":...,"parameters":...}` (NO anidado con key `function`) |
| function_call input | Solo `call_id` — **NO incluir `id`** (rechaza IDs que no empiezan con `fc`) |

### Formato de input (Responses API)
```json
// Mensaje de usuario
{"role": "user", "content": "..."}

// Mensaje de asistente
{"role": "assistant", "content": "..."}

// Tool call del modelo (enviado de vuelta)
{"type": "function_call", "call_id": "...", "name": "...", "arguments": "..."}

// Resultado de tool
{"type": "function_call_output", "call_id": "...", "output": "..."}
```

### Secuencia de eventos SSE
```
response.created → response.in_progress →
  response.output_item.added →
    (texto): response.output_text.delta* → response.output_text.done
    (tool):  response.function_call_arguments.delta* → response.function_call_arguments.done
  → response.output_item.done →
response.completed
```

---

## 🔧 Tools con Identidad de Usuario (01/05/2026)

### Resumen
Las tools del agente se ejecutan haciendo llamadas HTTP a la propia API del backend en `127.0.0.1:8000` usando el JWT del usuario que inició la conversación. Esto garantiza que el agente solo accede a datos que el usuario puede ver.

### Tools disponibles

| Tool | Descripción | Endpoint interno |
|------|-------------|-----------------|
| `list_clubs` | Lista clubes del usuario | `GET /api/clubes` |
| `get_club_info` | Detalle de un club | `GET /api/clubes/{id}` |
| `list_club_members` | Miembros de un club | `GET /api/clubes/{id}/miembros` |
| `list_events` | Eventos de un club | `GET /api/clubes/{id}/eventos` |
| `list_news` | Noticias de un club | `GET /api/clubes/{id}/noticias` |
| `list_socios` | Socios del club | `GET /api/socios/?club_id={id}` |
| `get_recent_content` | Contenido reciente | `GET /api/clubes/{id}/contenido-reciente` |

### Flujo de ejecución
1. Usuario envía mensaje → router extrae Bearer token del header
2. `handle_turn()` pasa `user_token` a `execute_tool()`
3. Tool hace `httpx.get("http://127.0.0.1:8000/api/...", headers={"Authorization": f"Bearer {user_token}"})`
4. Resultado se serializa como JSON y se envía de vuelta al modelo

---

## 🔬 Panel de Debug (01/05/2026)

### Resumen
Panel de diagnóstico en la página de administración del agente (`/admin/agent` → pestaña "Debug") para visualizar todo el pipeline de una llamada al modelo.

### Endpoint

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chat/debug` | Ejecuta un turno sin persistir en BD, devuelve diagnóstico completo |

### Respuesta debug
```json
{
  "debug_log": [
    {"step": "config", "provider": "openai_oauth", "model": "gpt-5.2"},
    {"step": "input_messages", "messages": [...]},
    {"step": "tools_sent", "tool_count": 7, "tool_names": [...]},
    {"step": "provider_response", "content": "...", "tool_calls": [...], "stop_reason": "..."},
    {"step": "provider_raw_debug", "event_types": [...], "raw_events": [...]},
    {"step": "executing_tool", "name": "list_clubs", "arguments": {}},
    {"step": "tool_result", "name": "list_clubs", "result": [...]},
    {"step": "second_call_response", "content": "...", "stop_reason": "end"}
  ],
  "response": "...",
  "tool_calls": [...],
  "tool_results": [...]
}
```

### UI del panel
- **Prueba Simple**: envía saludo sin esperar tool calls
- **Prueba con Tool Call**: pregunta por clubes disponibles → trigger `list_clubs`
- Visualización: respuesta final (verde), tool calls detectados (azul), resultados de tools (amarillo), log completo del pipeline (terminal oscuro expandible)

---

## 📋 Frontend — Archivos modificados (01/05/2026)

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/AdminAgentConfig.tsx` | +Tab "Debug", +botones de prueba, +panel de diagnóstico visual |
| `src/services/chatService.ts` | +`ChatService.debugMessage()`, +interfaces `DebugResponse`, `DebugStep` |

---

## � Recuperación de Contraseña (05/05/2026)

### Resumen
Funcionalidad completa de "olvidé mi contraseña" con generación de token seguro, envío por email y formulario de restablecimiento en el frontend.

---

### Backend — Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `migrations/2026_05_04_add_reset_password_fields.sql` | Migración: columnas `reset_token` y `reset_token_expires` en tabla `usuarios` |
| `tests/test_reset_password.py` | 9 tests: solicitar reset, reset con token válido/expirado/un-solo-uso, contraseña débil, validar token |

### Backend — Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/models/usuario.py` | +`reset_token` (String, indexed), +`reset_token_expires` (DateTime) |
| `app/config.py` | +`password_reset_token_expire_minutes: int = 60` |
| `app/schemas/auth.py` | +`SolicitarResetRequest`, +`ResetContrasenaRequest`, +`ValidarResetTokenResponse` |
| `app/routes/auth.py` | +3 endpoints de reset, +helper `_mask_email()` |

### Frontend — Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/pages/ForgotPassword.tsx` | Página de solicitud de reset (email) |
| `src/pages/ResetPassword.tsx` | Página de nueva contraseña (con validación de token) |

### Frontend — Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | +Rutas `/auth/recuperar-contrasena` y `/auth/reset-contrasena` |
| `src/pages/Login.tsx` | Link "¿Olvidaste tu contraseña?" (ya existía) |

---

### API Endpoints Nuevos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/solicitar-reset-contrasena` | Genera token y envía email (siempre responde éxito) |
| GET | `/api/auth/validar-reset-token?token=xxx` | Verifica validez del token, devuelve `email_hint` |
| POST | `/api/auth/reset-contrasena` | Actualiza contraseña y borra token |

### Schemas

```python
class SolicitarResetRequest(BaseModel):
    email: EmailStr

class ResetContrasenaRequest(BaseModel):
    token: str
    nueva_contrasena: str  # min_length=8

class ValidarResetTokenResponse(BaseModel):
    valid: bool
    email_hint: Optional[str]  # ej: "u***@gmail.com"
```

### Migración SQL

```sql
ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;
CREATE INDEX idx_usuarios_reset_token ON usuarios(reset_token);
```

### Seguridad
- Token opaco con `secrets.token_urlsafe(32)` (256 bits de entropía)
- Expiración configurable (default 60 min)
- Un solo uso: se invalida al consumirse
- Respuesta genérica para evitar enumeración de emails
- Usuarios Google-only no reciben email de reset
- Validación de contraseña mínima 8 caracteres (Pydantic)

---

## �🐛 Errores resueltos durante integración Codex

| Error | Causa raíz | Fix |
|-------|-----------|-----|
| `model gpt-5.1 not found` | Solo `gpt-5.2` disponible | Default hardcoded + LEGACY_REMAP |
| `Store must be set to false` | Codex no persiste chats | `store: false` |
| `Stream must be set to true` | Codex solo streaming | `stream: true` + SSE parser |
| `Unsupported parameter: temperature` | No soportado | Eliminado del payload |
| `Unsupported parameter: max_output_tokens` | No soportado | Eliminado del payload |
| `Missing required parameter: tools[0].name` | Formato Chat Completions vs Responses | Conversión a formato plano |
| SQLite dict binding | `tool_calls` era dict | Serializar a JSON string antes de INSERT |
| Tool calls no detectados | Parser solo buscaba en `response.completed` | +Acumulación de `function_call_arguments.delta` |
| `Expected an ID that begins with 'fc'` | Se enviaba `"id": "call_..."` en function_call input | Eliminado campo `id`, solo usar `call_id` |
