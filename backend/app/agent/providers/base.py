from abc import ABC, abstractmethod


class ProviderBase(ABC):
    """Interfaz común de proveedores de LLM."""

    @abstractmethod
    async def list_models(self) -> list[dict]:
        """Devuelve [{id, name, context_window}, ...] de modelos disponibles."""
        ...

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> dict:
        """
        Devuelve un dict normalizado:
        {
          "content": str | None,
          "tool_calls": [{"id", "name", "arguments"}, ...] | None,
          "stop_reason": "end" | "tool_use" | "length",
          "tokens_in": int,
          "tokens_out": int,
        }
        """
        ...
