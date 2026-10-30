import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SHORT_BASE_URL: str = "http://localhost:8000"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
