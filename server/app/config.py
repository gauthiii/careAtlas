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

    # Comma-separated list of browser origins allowed to call this API.
    cors_origins: str = "http://localhost:5173"

    # Only return agents created on or after this instant (ServiceNow UTC datetime).
    agents_created_since: str = "2026-06-02 00:00:00"

    # Outbound request timeout to ServiceNow, in seconds.
    request_timeout: float = 20.0

    # Microsoft Entra External ID Native Authentication public client settings.
    entra_app_id: str
    entra_tenant_id: str
    entra_object_id: Optional[str] = None
    entra_tenant_subdomain: str
    entra_tenant_domain: Optional[str] = None
    entra_scopes: str = "openid offline_access profile"

    model_config = SettingsConfigDict(
        env_file=SERVER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def entra_domain(self) -> str:
        return self.entra_tenant_domain or f"{self.entra_tenant_subdomain}.onmicrosoft.com"

    @property
    def entra_base_url(self) -> str:
        return f"https://{self.entra_tenant_subdomain}.ciamlogin.com/{self.entra_domain}"

    @property
    def entra_authority_url(self) -> str:
        return f"https://{self.entra_tenant_subdomain}.ciamlogin.com/common"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
