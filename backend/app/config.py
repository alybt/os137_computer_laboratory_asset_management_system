"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path
from typing import ClassVar

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env when present. Values already in the environment win.
load_dotenv(BASE_DIR / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    app_name: str = "LabAssets API"
    app_version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")

    # SQLite is the zero-setup fallback for local testing. Set DATABASE_URL to
    # PostgreSQL in the VirtualBox VM (see .env.example and README.md).
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'lab_assets.db'}"
    )

    secret_key: str = os.getenv(
        "SECRET_KEY", "dev-only-secret-change-me-in-production-0s137"
    )
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720")
    )

    # Comma-separated list. "*" allows any origin, which is convenient while
    # the frontend (WSL/Distrobox) and backend (VirtualBox VM) are on different
    # machines. Tighten this once the VM IP is fixed.
    cors_origins: ClassVar[list[str]] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]

    auto_seed: bool = _as_bool(os.getenv("AUTO_SEED"), True)

    # Demo accounts created by the seeder.
    demo_password: str = os.getenv("DEMO_PASSWORD", "labassets123")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")


settings = Settings()
