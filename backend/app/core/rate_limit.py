from fastapi import Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


limiter = Limiter(key_func=get_remote_address, headers_enabled=True)


async def rate_limit_exceeded_handler(
    _: Request,
    __: RateLimitExceeded,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too Many Requests"},
        headers={"Retry-After": "60"},
    )
