from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings


class OpenF1Service:
    _client: httpx.AsyncClient | None = None

    def __init__(self) -> None:
        self.base_url = f"{settings.openf1_base_url.rstrip('/')}/"

    def _get_client(self) -> httpx.AsyncClient:
        if self.__class__._client is None or self.__class__._client.is_closed:
            self.__class__._client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)
        return self.__class__._client

    @classmethod
    async def close_client(cls) -> None:
        if cls._client is not None and not cls._client.is_closed:
            await cls._client.aclose()

    @retry(
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        reraise=True,
    )
    async def get_json(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        response = await self._get_client().get(path.lstrip("/"), params=params or {})
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []
