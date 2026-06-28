"""
Definición de tools (formato OpenAI) y dispatcher de ejecución.
Tools llaman a la API PiarApp con el Bearer token del usuario actual.
"""
import httpx
import json
import logging

log = logging.getLogger(__name__)

# Base URL interna (mismo proceso/container)
_API_BASE = "http://127.0.0.1:8000/api"

# Helper para definir tools de forma compacta
def _tool(name: str, desc: str, props: dict | None = None, required: list | None = None):
    params = {"type": "object", "properties": props or {}}
    if required:
        params["required"] = required
    return {
        "type": "function",
        "function": {"name": name, "description": desc, "parameters": params},
    }

_CLUB_ID = {"club_id": {"type": "integer", "description": "ID del club"}}
_CLUB_REQ = ["club_id"]

TOOL_SCHEMAS = [
    # === CLUBES ===
    _tool("list_clubs", "Lista los clubes a los que pertenece el usuario actual."),
    _tool("get_club_info", "Obtiene información detallada de un club (nombre, descripción, config, logo, colores).", _CLUB_ID, _CLUB_REQ),
    _tool("update_club", "Actualiza datos de un club (nombre, descripción, etc.).",
          {**_CLUB_ID, "data": {"type": "object", "description": "Campos a actualizar (nombre, descripcion, etc.)"}}, ["club_id", "data"]),
    _tool("get_my_role", "Obtiene el rol del usuario actual en un club.", _CLUB_ID, _CLUB_REQ),
    _tool("list_club_members", "Lista los miembros de un club con sus roles.", _CLUB_ID, _CLUB_REQ),
    _tool("invite_member", "Invita a un nuevo miembro al club por email.",
          {**_CLUB_ID, "email": {"type": "string", "description": "Email del invitado"},
           "rol": {"type": "string", "description": "Rol: socio, directivo, admin (default: socio)"}},
          ["club_id", "email"]),
    _tool("list_club_invitations", "Lista las invitaciones pendientes de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("get_recent_content", "Obtiene el contenido reciente (noticias y eventos) de un club.", _CLUB_ID, _CLUB_REQ),

    # === NOTICIAS ===
    _tool("list_news", "Lista las últimas noticias de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("create_news", "Crea una noticia en un club.",
          {**_CLUB_ID, "titulo": {"type": "string", "description": "Título de la noticia"},
           "contenido": {"type": "string", "description": "Contenido/cuerpo de la noticia"}},
          ["club_id", "titulo", "contenido"]),
    _tool("get_news", "Obtiene una noticia específica.",
          {**_CLUB_ID, "noticia_id": {"type": "integer", "description": "ID de la noticia"}},
          ["club_id", "noticia_id"]),
    _tool("update_news", "Actualiza una noticia existente.",
          {**_CLUB_ID, "noticia_id": {"type": "integer", "description": "ID de la noticia"},
           "data": {"type": "object", "description": "Campos a actualizar (titulo, contenido)"}},
          ["club_id", "noticia_id", "data"]),
    _tool("delete_news", "Elimina una noticia.",
          {**_CLUB_ID, "noticia_id": {"type": "integer", "description": "ID de la noticia"}},
          ["club_id", "noticia_id"]),

    # === EVENTOS ===
    _tool("list_events", "Lista los próximos eventos de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("create_event", "Crea un evento en un club.",
          {**_CLUB_ID, "titulo": {"type": "string", "description": "Título del evento"},
           "descripcion": {"type": "string", "description": "Descripción del evento"},
           "fecha_inicio": {"type": "string", "description": "Fecha inicio ISO (YYYY-MM-DDTHH:MM)"},
           "fecha_fin": {"type": "string", "description": "Fecha fin ISO (YYYY-MM-DDTHH:MM)"},
           "lugar": {"type": "string", "description": "Lugar del evento"}},
          ["club_id", "titulo", "fecha_inicio"]),
    _tool("get_event", "Obtiene un evento específico.",
          {**_CLUB_ID, "evento_id": {"type": "integer", "description": "ID del evento"}},
          ["club_id", "evento_id"]),
    _tool("update_event", "Actualiza un evento existente.",
          {**_CLUB_ID, "evento_id": {"type": "integer", "description": "ID del evento"},
           "data": {"type": "object", "description": "Campos a actualizar (titulo, descripcion, fecha_inicio, fecha_fin, lugar)"}},
          ["club_id", "evento_id", "data"]),
    _tool("delete_event", "Elimina un evento.",
          {**_CLUB_ID, "evento_id": {"type": "integer", "description": "ID del evento"}},
          ["club_id", "evento_id"]),

    # === VOTACIONES ===
    _tool("list_votaciones", "Lista las votaciones disponibles."),

    # === INSTALACIONES ===
    _tool("get_installation_password", "Obtiene la contraseña actual de la instalación del club.", _CLUB_ID, _CLUB_REQ),
    _tool("create_installation_password", "Crea/rota la contraseña de la instalación.",
          {**_CLUB_ID, "password": {"type": "string", "description": "Nueva contraseña (se genera auto si no se indica)"}},
          ["club_id"]),

    # === PRODUCTOS ===
    _tool("list_products", "Lista los productos/afiliaciones de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("create_product", "Crea un producto/afiliación en un club.",
          {**_CLUB_ID, "nombre": {"type": "string", "description": "Nombre del producto"},
           "descripcion": {"type": "string", "description": "Descripción"},
           "url_afiliacion": {"type": "string", "description": "URL del producto con código de afiliación incluido"},
           "precio_referencia": {"type": "string", "description": "Precio de referencia (texto libre, ej: '5,17 €')"},
           "proveedor": {"type": "string", "description": "Proveedor (Amazon, AliExpress, etc)"},
           "categoria": {"type": "string", "description": "Categoría del producto"}},
          ["club_id", "nombre", "url_afiliacion"]),
    _tool("get_product", "Obtiene un producto específico.",
          {**_CLUB_ID, "producto_id": {"type": "integer", "description": "ID del producto"}},
          ["club_id", "producto_id"]),
    _tool("update_product", "Actualiza un producto.",
          {**_CLUB_ID, "producto_id": {"type": "integer", "description": "ID del producto"},
           "data": {"type": "object", "description": "Campos a actualizar"}},
          ["club_id", "producto_id", "data"]),
    _tool("delete_product", "Elimina un producto.",
          {**_CLUB_ID, "producto_id": {"type": "integer", "description": "ID del producto"}},
          ["club_id", "producto_id"]),

    # === ALERTAS ===
    _tool("list_club_alerts", "Lista las alertas activas de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("get_alerts_count", "Obtiene el contador de alertas de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("get_my_alerts", "Obtiene las alertas personales del usuario."),

    # === TAREAS COMUNITARIAS ===
    _tool("list_tasks", "Lista las tareas comunitarias de un club.", _CLUB_ID, _CLUB_REQ),
    _tool("create_task", "Crea una tarea comunitaria en un club.",
          {**_CLUB_ID,
           "titulo": {"type": "string", "description": "Título (mín. 3 caracteres)"},
           "descripcion": {"type": "string", "description": "Descripción de la tarea"},
           "puntos": {"type": "integer", "description": "Puntos que otorga la tarea (≥ 0, default 0)"},
           "prioridad": {"type": "string", "enum": ["alta", "media", "baja"], "description": "Prioridad (default: media)"},
           "fecha_limite": {"type": "string", "description": "Fecha límite en formato ISO: YYYY-MM-DDTHH:MM:SS (ej: 2026-08-31T23:59:59)"},
           "max_participantes": {"type": "integer", "description": "Máximo de participantes (> 0)"}},
          ["club_id", "titulo"]),
    _tool("get_task", "Obtiene una tarea comunitaria específica.",
          {**_CLUB_ID, "tarea_id": {"type": "integer", "description": "ID de la tarea"}},
          ["club_id", "tarea_id"]),
    _tool("update_task", "Actualiza una tarea comunitaria.",
          {**_CLUB_ID, "tarea_id": {"type": "integer", "description": "ID de la tarea"},
           "data": {"type": "object", "description": "Campos a actualizar"}},
          ["club_id", "tarea_id", "data"]),
    _tool("delete_task", "Elimina una tarea comunitaria.",
          {**_CLUB_ID, "tarea_id": {"type": "integer", "description": "ID de la tarea"}},
          ["club_id", "tarea_id"]),

    # === PERFIL / AUTH ===
    _tool("get_my_profile", "Obtiene el perfil del usuario actual."),
    _tool("update_my_profile", "Actualiza el perfil del usuario actual.",
          {"data": {"type": "object", "description": "Campos a actualizar (nombre, apellidos, telefono, etc.)"}}, ["data"]),
    _tool("get_pending_invitations", "Lista las invitaciones pendientes del usuario."),

    # === DASHBOARD ===
    _tool("get_dashboard_recent", "Obtiene contenido reciente global del dashboard."),
]


# ============================================================
# ERROR FORMATTING
# ============================================================

def _format_api_error(r) -> str:
    """Convierte la respuesta de error HTTP en un string legible para el LLM."""
    try:
        body = r.json()
    except Exception:
        text = (r.text or "").strip()
        return text or f"HTTP {r.status_code} sin cuerpo de respuesta"

    detail = body.get("detail")

    # Pydantic v2 validation errors: lista de objetos {loc, msg, type}
    if isinstance(detail, list):
        msgs = []
        for err in detail:
            loc_parts = [str(x) for x in err.get("loc", []) if x not in ("body", "")]
            loc = " → ".join(loc_parts) if loc_parts else None
            msg = err.get("msg", "error desconocido")
            msgs.append(f"Campo '{loc}': {msg}" if loc else msg)
        return "; ".join(msgs) if msgs else f"HTTP {r.status_code}: error de validación sin detalle"

    # String o None
    if isinstance(detail, str) and detail.strip():
        return detail.strip()

    # Fallback: texto crudo
    text = (r.text or "").strip()[:400]
    return text or f"HTTP {r.status_code} sin detalle"


# ============================================================
# DISPATCHER
# ============================================================

# Routing table: tool_name -> (method, path_template, body_key?)
# path_template uses {arg_name} for path params
# body_key: if set, that argument is sent as JSON body; if "REST" auto-builds body from remaining args
_ROUTES: dict[str, tuple[str, str, str | None]] = {
    # Clubes
    "list_clubs":              ("GET",    "/clubes",                              None),
    "get_club_info":           ("GET",    "/clubes/{club_id}",                    None),
    "update_club":             ("PUT",    "/clubes/{club_id}",                    "data"),
    "get_my_role":             ("GET",    "/clubes/mi-rol/{club_id}",             None),
    "list_club_members":       ("GET",    "/clubes/{club_id}/miembros",           None),
    "invite_member":           ("POST",   "/clubes/{club_id}/miembros/invitar",   "REST"),
    "list_club_invitations":   ("GET",    "/clubes/{club_id}/miembros/invitaciones", None),
    "get_recent_content":      ("GET",    "/clubes/{club_id}/contenido-reciente", None),
    # Noticias
    "list_news":               ("GET",    "/clubes/{club_id}/noticias",           None),
    "create_news":             ("POST",   "/clubes/{club_id}/noticias",           "REST"),
    "get_news":                ("GET",    "/clubes/{club_id}/noticias/{noticia_id}", None),
    "update_news":             ("PUT",    "/clubes/{club_id}/noticias/{noticia_id}", "data"),
    "delete_news":             ("DELETE", "/clubes/{club_id}/noticias/{noticia_id}", None),
    # Eventos
    "list_events":             ("GET",    "/clubes/{club_id}/eventos",            None),
    "create_event":            ("POST",   "/clubes/{club_id}/eventos",            "REST"),
    "get_event":               ("GET",    "/clubes/{club_id}/eventos/{evento_id}", None),
    "update_event":            ("PUT",    "/clubes/{club_id}/eventos/{evento_id}", "data"),
    "delete_event":            ("DELETE", "/clubes/{club_id}/eventos/{evento_id}", None),
    # Votaciones
    "list_votaciones":         ("GET",    "/votaciones/",                         None),
    # Instalaciones
    "get_installation_password": ("GET",  "/clubes/{club_id}/instalacion/password", None),
    "create_installation_password": ("POST", "/clubes/{club_id}/instalacion/password", "REST"),
    # Productos
    "list_products":           ("GET",    "/clubes/{club_id}/productos",          None),
    "create_product":          ("POST",   "/clubes/{club_id}/productos",          "REST"),
    "get_product":             ("GET",    "/clubes/{club_id}/productos/{producto_id}", None),
    "update_product":          ("PUT",    "/clubes/{club_id}/productos/{producto_id}", "data"),
    "delete_product":          ("DELETE", "/clubes/{club_id}/productos/{producto_id}", None),
    # Alertas
    "list_club_alerts":        ("GET",    "/clubs/{club_id}/alertas",             None),
    "get_alerts_count":        ("GET",    "/clubs/{club_id}/alertas/count",       None),
    "get_my_alerts":           ("GET",    "/alertas/mis-alertas",                 None),
    # Tareas comunitarias
    "list_tasks":              ("GET",    "/clubes/{club_id}/tareas-comunitarias", None),
    "create_task":             ("POST",   "/clubes/{club_id}/tareas-comunitarias", "REST"),
    "get_task":                ("GET",    "/clubes/{club_id}/tareas-comunitarias/{tarea_id}", None),
    "update_task":             ("PUT",    "/clubes/{club_id}/tareas-comunitarias/{tarea_id}", "data"),
    "delete_task":             ("DELETE", "/clubes/{club_id}/tareas-comunitarias/{tarea_id}", None),
    # Auth / Perfil
    "get_my_profile":          ("GET",    "/auth/usuarios/me",                    None),
    "update_my_profile":       ("PUT",    "/auth/usuarios/me",                    "data"),
    "get_pending_invitations": ("GET",    "/auth/invitaciones/pendientes",        None),
    # Dashboard
    "get_dashboard_recent":    ("GET",    "/dashboard/contenido-reciente",        None),
}


async def execute_tool(name: str, arguments: dict, user_id: int,
                       user_token: str | None = None) -> dict:
    """Ejecuta una tool llamando a la API PiarApp con el token del usuario."""
    if not user_token:
        return {"ok": False, "error": "No se pudo autenticar la llamada (sin token)"}

    route = _ROUTES.get(name)
    if not route:
        return {"ok": False, "error": f"Tool desconocida: {name}"}

    method, path_tpl, body_mode = route

    headers = {
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
    }

    # Build path replacing {param} placeholders
    path_params = set()
    path = path_tpl
    for key, val in arguments.items():
        placeholder = "{" + key + "}"
        if placeholder in path:
            path = path.replace(placeholder, str(val))
            path_params.add(key)

    # Build body from remaining args
    body = None
    if body_mode == "data":
        body = arguments.get("data", {})
    elif body_mode == "REST":
        body = {k: v for k, v in arguments.items() if k not in path_params}

    try:
        async with httpx.AsyncClient(base_url=_API_BASE, timeout=15.0) as http:
            r = await http.request(method, path, headers=headers, json=body)

            if r.status_code in (200, 201):
                return {"ok": True, "data": r.json()}
            elif r.status_code == 204:
                return {"ok": True, "data": None}
            else:
                log.warning("Tool %s returned %s: %s", name, r.status_code, r.text[:500])
                detail = _format_api_error(r)
                return {"ok": False, "status": r.status_code, "error": detail}

    except Exception as e:
        log.error("Tool %s execution error: %s", name, e)
        msg = str(e) or "Error de conexión desconocido"
        return {"ok": False, "error": msg}
