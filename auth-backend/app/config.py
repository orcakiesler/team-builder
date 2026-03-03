from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Relay Auth API"
    environment: Literal["dev", "prod"] = "dev"

    # Security
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Database: sqlite for local dev; use postgres (e.g. Render Postgres) in production so data survives restarts
    database_url: str = "sqlite:///./auth.db"

    @property
    def database_url_normalized(self) -> str:
        """Use postgresql:// so SQLAlchemy uses the right driver (Render gives postgres://)."""
        u = self.database_url
        if u.startswith("postgres://"):
            return "postgresql://" + u[9:]
        return u

    class Config:
        env_prefix = "AUTH_"
        env_file = ".env"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

