"""Ollama API adapter for local-model discovery and chat."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx


class OllamaUnavailableError(RuntimeError):
    """Raised when the configured Ollama server cannot be reached."""


class OllamaRequestError(RuntimeError):
    """Raised when Ollama responds but the request cannot be completed safely."""


class OllamaClient:
    """Small provider adapter for Ollama discovery, testing, and streaming chat."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 5.0,
        generation_timeout_seconds: float = 120.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.generation_timeout_seconds = generation_timeout_seconds
        self.transport = transport

    async def version(self) -> str:
        payload = await self._get_json("/api/version")
        version = payload.get("version")
        if not isinstance(version, str) or not version:
            raise OllamaRequestError("Ollama version response was incomplete.")
        return version

    async def models(self) -> list[dict[str, Any]]:
        payload = await self._get_json("/api/tags")
        models = payload.get("models")
        if not isinstance(models, list):
            raise OllamaRequestError("Ollama model-list response was incomplete.")
        return [item for item in models if isinstance(item, dict)]

    async def test_model(self, model: str) -> dict[str, Any]:
        request_body = {
            "model": model,
            "prompt": "Respond with exactly: OK",
            "stream": False,
        }
        return await self._post_json(
            "/api/generate",
            request_body,
            timeout_seconds=self.generation_timeout_seconds,
        )

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        """Yield assistant text chunks from Ollama's NDJSON chat stream."""

        request_body = {
            "model": model,
            "messages": messages,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.generation_timeout_seconds,
                transport=self.transport,
            ) as client:
                async with client.stream("POST", "/api/chat", json=request_body) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line:
                            continue

                        try:
                            payload = json.loads(line)
                        except json.JSONDecodeError as exc:
                            raise OllamaRequestError(
                                "Ollama returned invalid streaming JSON."
                            ) from exc

                        if not isinstance(payload, dict):
                            raise OllamaRequestError(
                                "Ollama returned an unexpected streaming response."
                            )

                        error = payload.get("error")
                        if isinstance(error, str) and error:
                            raise OllamaRequestError(error)

                        message = payload.get("message")
                        if isinstance(message, dict):
                            content = message.get("content")
                            if isinstance(content, str) and content:
                                yield content

                        if payload.get("done") is True:
                            break
        except httpx.RequestError as exc:
            raise OllamaUnavailableError(f"Unable to reach Ollama at {self.base_url}.") from exc
        except httpx.HTTPStatusError as exc:
            raise OllamaRequestError(f"Ollama returned HTTP {exc.response.status_code}.") from exc

    async def _get_json(self, path: str) -> dict[str, Any]:
        return await self._request_json("GET", path, timeout_seconds=self.timeout_seconds)

    async def _post_json(
        self,
        path: str,
        body: dict[str, Any],
        *,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        return await self._request_json(
            "POST",
            path,
            json=body,
            timeout_seconds=timeout_seconds,
        )

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.request(method, path, json=json)
                response.raise_for_status()
        except httpx.RequestError as exc:
            raise OllamaUnavailableError(f"Unable to reach Ollama at {self.base_url}.") from exc
        except httpx.HTTPStatusError as exc:
            raise OllamaRequestError(f"Ollama returned HTTP {exc.response.status_code}.") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise OllamaRequestError("Ollama returned invalid JSON.") from exc

        if not isinstance(payload, dict):
            raise OllamaRequestError("Ollama returned an unexpected response.")
        return payload
