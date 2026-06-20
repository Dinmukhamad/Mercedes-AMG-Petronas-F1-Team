from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings


class ExternalAPIError(RuntimeError):
    pass


class JolpicaService:
    def __init__(self) -> None:
        self.base_url = f"{settings.jolpica_base_url.rstrip('/')}/"

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
    ) -> dict[str, Any]:
        request_params = {"limit": 100, "offset": 0}
        if params:
            request_params.update(params)
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30.0) as client:
            response = await client.get(path.lstrip("/"), params=request_params)
            response.raise_for_status()
            return response.json()
