"""Application settings, loaded from environment / server/.env."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    # ServiceNow instance hostname, e.g. "ven04690.service-now.com" (no scheme).
    snow_instance: str
    # Service account with read access to the AI Control Tower tables.
    snow_username: str
    snow_password: str
    # OAuth client credentials used to invoke ServiceNow AI Agents over A2A.
    snow_a2a_client_id: Optional[str] = None
    snow_a2a_client_secret: Optional[str] = None
    snow_a2a_token_skew_seconds: int = 60
    # Public backend origin used by ServiceNow to send async A2A callbacks.
    a2a_callback_base_url: Optional[str] = None
    # Shared callback verification token expected from ServiceNow callbacks.
    a2a_callback_token: Optional[str] = None

    # AWS Cognito user pool used for email/password + TOTP MFA authentication.
    cognito_region: str = "us-east-1"
    cognito_user_pool_id: Optional[str] = None
    cognito_client_id: Optional[str] = None
    cognito_client_secret: Optional[str] = None

    # Comma-separated list of browser origins allowed to call this API.
    cors_origins: str = "http://localhost:5173"

    # Only return agents created on or after this instant (ServiceNow UTC datetime).
    agents_created_since: str = "2026-06-02 00:00:00"

    # Outbound request timeout to ServiceNow, in seconds.
    request_timeout: float = 20.0

    model_config = SettingsConfigDict(
        env_file=SERVER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"

    def a2a_callback_url(self, agent_sys_id: str) -> str:
        base_url = (self.a2a_callback_base_url or "").rstrip("/")
        return f"{base_url}/api/a2a/callback/{agent_sys_id}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
