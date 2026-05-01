from openai import AsyncOpenAI
from .base import ProviderBase
from app.config import settings
import json


class OpenAIApiKeyProvider(ProviderBase):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def list_models(self):
        return [
            {"id": "gpt-4o", "name": "GPT-4o", "context_window": 128000},
            {"id": "gpt-4o-mini", "name": "GPT-4o mini", "context_window": 128000},
            {"id": "gpt-4.1", "name": "GPT-4.1", "context_window": 1000000},
            {"id": "gpt-4.1-mini", "name": "GPT-4.1 mini", "context_window": 1000000},
        ]

    async def chat(self, messages, tools=None, model="gpt-4o-mini",
                   max_tokens=2048, temperature=0.7):
        kwargs = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        resp = await self.client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        tool_calls = None
        if msg.tool_calls:
            tool_calls = [
                {"id": tc.id, "name": tc.function.name,
                 "arguments": json.loads(tc.function.arguments)}
                for tc in msg.tool_calls
            ]
        stop = "tool_use" if tool_calls else (
            "length" if resp.choices[0].finish_reason == "length" else "end"
        )
        return {
            "content": msg.content,
            "tool_calls": tool_calls,
            "stop_reason": stop,
            "tokens_in": resp.usage.prompt_tokens,
            "tokens_out": resp.usage.completion_tokens,
        }
