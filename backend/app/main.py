import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.models import TokenBlacklist
from app.routers import (
    admin,
    auth,
    constructors,
    drivers,
    favorites,
    gallery,
    races,
    seasons,
    standings,
    users,
    videos,
)
from app.services.jolpica_service import JolpicaService
from app.services.openf1_service import OpenF1Service


logger = logging.getLogger(__name__)


app = FastAPI(
    title="F1 Statistics Dashboard API",
    version="1.0.0",
    description="Backend API for Formula 1 statistics, media, favorites, and admin sync.",
)

allow_origins = settings.cors_origin_list
if settings.app_env == "production":
    allow_origins = [origin for origin in allow_origins if origin != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(seasons.router)
app.include_router(drivers.router)
app.include_router(constructors.router)
app.include_router(standings.router)
app.include_router(races.router)
app.include_router(videos.router)
app.include_router(gallery.router)
app.include_router(favorites.router)
app.include_router(admin.router)


@app.on_event("startup")
def ensure_database_tables() -> None:
    Base.metadata.create_all(bind=engine, tables=[TokenBlacklist.__table__])


@app.on_event("shutdown")
async def close_external_clients() -> None:
    await JolpicaService.close_client()
    await OpenF1Service.close_client()


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
    content: dict[str, str] = {"detail": "Internal server error"}
    if settings.app_env == "development":
        content["error"] = str(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
