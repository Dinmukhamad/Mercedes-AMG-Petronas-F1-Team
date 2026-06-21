from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    secret_key: str = Field(alias="SECRET_KEY")
    algorithm: str = Field("HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(1440, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    jolpica_base_url: str = Field(
        "https://api.jolpi.ca/ergast/f1",
        alias="JOLPICA_BASE_URL",
    )
    openf1_base_url: str = Field("https://api.openf1.org/v1", alias="OPENF1_BASE_URL")
    app_env: str = Field("development", alias="APP_ENV")
    cors_origins: str = Field(
        "http://localhost:3000,http://127.0.0.1:5500",
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @field_validator("database_url", "secret_key")
    @classmethod
    def validate_required_secret(cls, value: str, info) -> str:
        if not value or not value.strip():
            raise ValueError(f"{info.field_name.upper()} must be set")
        if info.field_name == "secret_key" and value == "change_me":
            raise ValueError("SECRET_KEY must not use the default development value")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
