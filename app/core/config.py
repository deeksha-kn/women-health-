"""
Centralized application configuration, loaded from environment variables
(see .env.example for the full list). Every other module imports `settings`
from here rather than calling os.getenv() directly, so there is exactly one
place that knows how configuration is sourced.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    APP_NAME: str = "Women's Health Prediction API"
    APP_ENV: str = "development"  # development | production
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # --- Security / JWT ---
    SECRET_KEY: str = Field(
        ..., description="Used to sign JWTs. MUST be overridden in production."
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Database ---
    DATABASE_URL: str = Field(
        ...,
        description=(
            "SQLAlchemy connection string, e.g. "
            "postgresql+psycopg://user:pass@localhost:5432/womens_health "
            "or mysql+pymysql://user:pass@localhost:3306/womens_health"
        ),
    )

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # --- File uploads ---
    UPLOAD_DIR: str = str(BASE_DIR / "storage" / "uploads" / "acne_images")
    REPORT_DIR: str = str(BASE_DIR / "storage" / "reports")
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_EXTENSIONS: str = "jpg,jpeg,png,webp"

    @property
    def allowed_image_extensions_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_IMAGE_EXTENSIONS.split(",")]

    # --- ML model paths ---
    ML_TEXT_MODELS_DIR: str = str(BASE_DIR / "app" / "ml" / "artifacts" / "text")
    ML_IMAGE_MODEL_PATH: str = str(
        BASE_DIR / "app" / "ml" / "artifacts" / "image" / "mobilenetv2_skin_severity.keras"
    )

    # --- Email (forgot password) ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@womenshealth.local"
    FRONTEND_RESET_URL: str = "http://localhost:3000/reset-password"
    # When SMTP isn't configured, the reset link is logged/returned instead of
    # emailed, so the feature is usable in local dev without a mail server.
    EMAIL_ENABLED: bool = False

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_placeholder(cls, v: str) -> str:
        if v in ("", "changeme", "secret", "your-secret-key-here"):
            raise ValueError(
                "SECRET_KEY must be set to a real random value in .env "
                "(e.g. `openssl rand -hex 32`). Refusing to start with a "
                "placeholder secret because it would let anyone forge JWTs."
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
