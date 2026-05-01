from sqlalchemy.orm import Session
from .providers import get_provider
from .persona_loader import load_system_prompt
from .tools import TOOL_SCHEMAS, execute_tool
from . import storage
import json
import logging

log = logging.getLogger(__name__)

HISTORY_WINDOW = 30
MAX_TOOL_ITERATIONS = 5


def _messages_to_provider_format(history: list, system_prompt: str) -> list[dict]:
    """Convierte modelos SQLAlchemy a formato Responses API input."""
    # Responses API uses a flat list of items, not Chat Completions format
    out = []
    for m in history:
        if m.role == "assistant" and m.tool_calls:
            tc_data = m.tool_calls
            # Handle tool_calls stored as JSON string
            if isinstance(tc_data, str):
                try:
                    tc_data = json.loads(tc_data)
                except (ValueError, TypeError):
                    tc_data = []
            if not tc_data:
                continue
            # Add each function_call as a separate item
            for tc in tc_data:
                out.append({
                    "type": "function_call",
                    "call_id": tc.get("id", ""),
                    "name": tc["name"],
                    "arguments": json.dumps(tc["arguments"]) if isinstance(tc["arguments"], dict) else tc["arguments"],
                })
        elif m.role == "tool":
            # function_call_output format for Responses API
            out.append({
                "type": "function_call_output",
                "call_id": m.tool_call_id or "",
                "output": m.content or "",
            })
        elif m.role == "assistant" and not m.content:
            # Skip empty assistant messages (from previous errors)
            continue
        elif m.role == "user":
            out.append({
                "role": "user",
                "content": m.content or "",
            })
        elif m.role == "assistant":
            out.append({
                "role": "assistant",
                "content": m.content or "",
            })
    return out


async def handle_turn(db: Session, user_id: int, club_id: int | None,
                      session_id: int | None, user_message: str,
                      user_token: str | None = None) -> dict:
    """
    Procesa un turno completo del chat.
    DB operations son sync; provider calls son async.
    """
    cfg = storage.get_agent_config(db)
    if not cfg.enabled:
        raise RuntimeError("El agente está deshabilitado por el administrador.")

    # 1. Sesión + ownership check
    sess = storage.get_or_create_session(db, user_id, club_id, session_id)

    # 2. Guardar mensaje del usuario
    user_msg = storage.append_message(db, sess.id, "user", user_message)
    new_messages = [user_msg]

    # 3. Recuperar historial (limitado)
    history = storage.get_session_messages(db, sess.id, user_id)
    history = history[-HISTORY_WINDOW:]

    # 4. Construir prompt y llamar al modelo (con bucle tool use)
    system_prompt = load_system_prompt()
    provider = get_provider(cfg.provider)

    for iteration in range(MAX_TOOL_ITERATIONS):
        provider_messages = _messages_to_provider_format(history, system_prompt)
        result = await provider.chat(
            messages=provider_messages,
            tools=TOOL_SCHEMAS if TOOL_SCHEMAS else None,
            model=cfg.model_id,
            max_tokens=cfg.max_tokens,
            temperature=cfg.temperature / 100.0,
            system_prompt=system_prompt,
        )

        # Guardar mensaje del assistant
        asst_msg = storage.append_message(
            db, sess.id, "assistant",
            content=result["content"] or "",
            tool_calls=result["tool_calls"],
            tokens_in=result["tokens_in"],
            tokens_out=result["tokens_out"],
        )
        history.append(asst_msg)
        new_messages.append(asst_msg)

        # Si no hay tool calls, hemos terminado
        if result["stop_reason"] != "tool_use":
            break

        # Ejecutar tools y guardar resultados
        for tc in result["tool_calls"]:
            tool_result = await execute_tool(tc["name"], tc["arguments"], user_id, user_token)
            tool_msg = storage.append_message(
                db, sess.id, "tool",
                content=json.dumps(tool_result),
                tool_call_id=tc["id"],
            )
            history.append(tool_msg)
            new_messages.append(tool_msg)
    else:
        log.warning("session=%s max_tool_iterations alcanzado", sess.id)

    # 5. Auto-titular sesión en el primer turno
    if not sess.title:
        sess.title = user_message[:80]
        db.commit()

    return {
        "session_id": sess.id,
        "response": new_messages[-1].content if new_messages[-1].role == "assistant"
                    else "(sin respuesta)",
        "messages_added": new_messages,
    }


async def handle_turn_debug(db: Session, user_id: int, club_id: int | None,
                            user_message: str, user_token: str | None = None) -> dict:
    """
    Versión debug de handle_turn: no persiste en DB, devuelve información detallada
    de cada paso del pipeline para diagnóstico.
    """
    debug_log = []
    cfg = storage.get_agent_config(db)

    debug_log.append({"step": "config", "provider": cfg.provider, "model": cfg.model_id,
                      "enabled": cfg.enabled})

    if not cfg.enabled:
        return {"debug_log": debug_log, "error": "Agente deshabilitado"}

    system_prompt = load_system_prompt()
    provider = get_provider(cfg.provider)

    # Build minimal input (just the user message, no history for debug)
    provider_messages = [{"role": "user", "content": user_message}]
    debug_log.append({"step": "input_messages", "messages": provider_messages})
    debug_log.append({"step": "tools_sent", "tool_count": len(TOOL_SCHEMAS),
                      "tool_names": [t["function"]["name"] for t in TOOL_SCHEMAS]})

    try:
        result = await provider.chat(
            messages=provider_messages,
            tools=TOOL_SCHEMAS if TOOL_SCHEMAS else None,
            model=cfg.model_id,
            max_tokens=cfg.max_tokens,
            temperature=cfg.temperature / 100.0,
            debug=True,
            system_prompt=system_prompt,
        )
    except RuntimeError as e:
        error_str = str(e)
        # Try to parse JSON error from debug mode
        try:
            error_data = json.loads(error_str)
        except (ValueError, TypeError):
            error_data = {"message": error_str}
        debug_log.append({"step": "provider_error", "error": error_data})
        return {"debug_log": debug_log, "error": error_str, "response": None}

    debug_log.append({
        "step": "provider_response",
        "content": result.get("content", ""),
        "tool_calls": result.get("tool_calls"),
        "stop_reason": result.get("stop_reason"),
        "tokens_in": result.get("tokens_in"),
        "tokens_out": result.get("tokens_out"),
    })

    # Include raw debug data from provider if available
    if "_debug" in result:
        debug_log.append({"step": "provider_raw_debug", **result["_debug"]})

    # If tool calls detected, execute them
    tool_results = []
    if result.get("tool_calls"):
        for tc in result["tool_calls"]:
            debug_log.append({"step": "executing_tool", "name": tc["name"],
                              "arguments": tc["arguments"], "call_id": tc["id"]})
            try:
                tool_output = await execute_tool(tc["name"], tc["arguments"],
                                                 user_id, user_token)
                tool_results.append({"name": tc["name"], "result": tool_output})
                debug_log.append({"step": "tool_result", "name": tc["name"],
                                  "result": tool_output})
            except Exception as e:
                tool_results.append({"name": tc["name"], "error": str(e)})
                debug_log.append({"step": "tool_error", "name": tc["name"],
                                  "error": str(e)})

        # Second LLM call with tool results
        for tc in result["tool_calls"]:
            provider_messages.append({
                "type": "function_call",
                "call_id": tc["id"],
                "name": tc["name"],
                "arguments": json.dumps(tc["arguments"]),
            })
        for i, tr in enumerate(tool_results):
            call_id = result["tool_calls"][i]["id"] if i < len(result["tool_calls"]) else result["tool_calls"][0]["id"]
            provider_messages.append({
                "type": "function_call_output",
                "call_id": call_id,
                "output": json.dumps(tr.get("result", tr.get("error", ""))),
            })

        debug_log.append({"step": "second_call_input", "messages": provider_messages})

        try:
            result2 = await provider.chat(
                messages=provider_messages,
                tools=TOOL_SCHEMAS if TOOL_SCHEMAS else None,
                model=cfg.model_id,
                max_tokens=cfg.max_tokens,
                temperature=cfg.temperature / 100.0,
                debug=True,
            )
            debug_log.append({
                "step": "second_call_response",
                "content": result2.get("content", ""),
                "tool_calls": result2.get("tool_calls"),
                "stop_reason": result2.get("stop_reason"),
            })
            if "_debug" in result2:
                debug_log.append({"step": "second_call_raw_debug", **result2["_debug"]})
            final_response = result2.get("content", "")
        except RuntimeError as e:
            debug_log.append({"step": "second_call_error", "error": str(e)})
            final_response = None
    else:
        final_response = result.get("content", "")

    return {
        "debug_log": debug_log,
        "response": final_response,
        "tool_calls": result.get("tool_calls"),
        "tool_results": tool_results if tool_results else None,
    }
