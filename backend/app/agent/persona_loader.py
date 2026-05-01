from pathlib import Path
from app.config import settings

PERSONA_DIR = Path(settings.agent_data_dir)
PERSONA_FILES = ["identity.md", "soul.md", "tools.md", "agents.md"]

_cache: dict = {"content": None, "mtime": 0.0}


def load_system_prompt() -> str:
    """Concatena los 4 markdowns en un único system prompt."""
    existing = [(PERSONA_DIR / f) for f in PERSONA_FILES if (PERSONA_DIR / f).exists()]
    if not existing:
        return "Eres un asistente útil."

    latest_mtime = max(f.stat().st_mtime for f in existing)
    if _cache["content"] is not None and _cache["mtime"] >= latest_mtime:
        return _cache["content"]

    parts = []
    for fname in PERSONA_FILES:
        fpath = PERSONA_DIR / fname
        if fpath.exists():
            content = fpath.read_text(encoding="utf-8").strip()
            if content:
                parts.append(content)

    full = "\n\n---\n\n".join(parts)
    _cache["content"] = full
    _cache["mtime"] = latest_mtime
    return full


def read_persona_file(name: str) -> str:
    if name not in PERSONA_FILES:
        raise ValueError(f"Archivo no permitido: {name}")
    fpath = PERSONA_DIR / name
    return fpath.read_text(encoding="utf-8") if fpath.exists() else ""


def write_persona_file(name: str, content: str) -> None:
    if name not in PERSONA_FILES:
        raise ValueError(f"Archivo no permitido: {name}")
    PERSONA_DIR.mkdir(parents=True, exist_ok=True)
    (PERSONA_DIR / name).write_text(content, encoding="utf-8")
    _cache["content"] = None
