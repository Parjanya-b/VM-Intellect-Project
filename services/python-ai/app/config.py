from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# app/config.py -> app -> python-ai -> services -> repo root
REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # Environment variables override the .env file. Other VMI_* variables are ignored.
    model_config = SettingsConfigDict(
        env_prefix="VMI_", env_file=REPO_ROOT / ".env", extra="ignore"
    )

    service_token: str | None = None
    data_dir: Path = REPO_ROOT / ".data"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()
