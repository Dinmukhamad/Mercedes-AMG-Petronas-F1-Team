from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Awaitable, Callable

from fastapi import Request
from fastapi.responses import Response


@dataclass(frozen=True)
class CachedResponse:
    body: bytes
    headers: dict[str, str]
    status_code: int
    media_type: str | None
    expires_at: float


_cache: dict[str, CachedResponse] = {}
_lock = Lock()

_CACHE_TTLS = {
    "/api/home": 180,
    "/api/seasons": 1800,
    "/api/races": 300,
    "/api/drivers": 1800,
    "/api/constructors": 1800,
    "/api/standings": 300,
    "/api/videos": 300,
    "/api/gallery": 300,
}


def clear_response_cache() -> None:
    with _lock:
        _cache.clear()


def _ttl_for_path(path: str) -> int | None:
    for prefix, ttl in _CACHE_TTLS.items():
        if path == prefix or path.startswith(f"{prefix}/"):
            return ttl
    return None


def _cache_key(request: Request) -> str:
    query = request.url.query
    return f"{request.url.path}?{query}" if query else request.url.path


def _is_public_get(request: Request) -> bool:
    if request.method != "GET":
        return False
    if request.headers.get("authorization"):
        return False
    return _ttl_for_path(request.url.path) is not None


async def public_response_cache_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    if not _is_public_get(request):
        response = await call_next(request)
        if (
            request.method in {"POST", "PUT", "PATCH", "DELETE"}
            and request.url.path.startswith("/api/admin")
            and response.status_code < 400
        ):
            clear_response_cache()
        return response

    key = _cache_key(request)
    now = monotonic()
    with _lock:
        cached = _cache.get(key)
        if cached and cached.expires_at > now:
            headers = dict(cached.headers)
            headers["X-Cache"] = "HIT"
            return Response(
                content=cached.body,
                status_code=cached.status_code,
                headers=headers,
                media_type=cached.media_type,
            )
        if cached:
            _cache.pop(key, None)

    response = await call_next(request)
    if response.status_code != 200 or "set-cookie" in response.headers:
        return response

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    ttl = _ttl_for_path(request.url.path)
    headers = dict(response.headers)
    headers.pop("content-length", None)
    headers["Cache-Control"] = f"public, max-age={min(ttl or 60, 300)}"
    headers["X-Cache"] = "MISS"

    if ttl:
        with _lock:
            _cache[key] = CachedResponse(
                body=body,
                headers=headers,
                status_code=response.status_code,
                media_type=response.media_type,
                expires_at=monotonic() + ttl,
            )

    return Response(
        content=body,
        status_code=response.status_code,
        headers=headers,
        media_type=response.media_type,
    )
