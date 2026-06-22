from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings


class OpenF1Service:
    """HTTP-клиент создаётся один раз и переиспользуется для connection pooling."""

    def __init__(self) -> None:
        self.base_url = f"{settings.openf1_base_url.rstrip('/')}/"
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

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
        client = self._get_client()
        response = await client.get(path.lstrip("/"), params=params or {})
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []
