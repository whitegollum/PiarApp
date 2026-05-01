from .base import ProviderBase
from .openai_apikey import OpenAIApiKeyProvider
from .openai_oauth import OpenAIOAuthProvider
from .github_copilot import GitHubCopilotProvider

__all__ = ["ProviderBase", "OpenAIApiKeyProvider", "OpenAIOAuthProvider",
           "GitHubCopilotProvider", "get_provider"]


def get_provider(name: str = "openai_apikey") -> ProviderBase:
    """Factory de providers."""
    match name:
        case "openai_apikey":
            return OpenAIApiKeyProvider()
        case "openai_oauth":
            return OpenAIOAuthProvider()
        case "github_copilot":
            return GitHubCopilotProvider()
        case _:
            raise ValueError(f"Provider desconocido: {name}")
