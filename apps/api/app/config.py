from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://pharmacy:pharmacy@localhost:5432/pharmacy"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    app_env: str = "development"
    auth_jwt_secret: str = "local-dev-secret-change-before-deployment-000000000000"
    auth_jwt_issuer: str = "pharmacy-management"
    auth_access_token_minutes: int = 15
    auth_refresh_token_days: int = 30
    auth_session_max_days: int = 90
    auth_cookie_secure: bool = False
    bootstrap_admin_email: str = "admin@pharmacy.local"
    bootstrap_admin_password: str | None = None

    @model_validator(mode="after")
    def validate_production_auth_settings(self) -> "Settings":
        if self.app_env.lower() == "production":
            if len(self.auth_jwt_secret) < 32 or "change-before" in self.auth_jwt_secret:
                raise ValueError("Production requires a unique AUTH_JWT_SECRET of at least 32 characters")
            if not self.auth_cookie_secure:
                raise ValueError("Production requires AUTH_COOKIE_SECURE=true")
        return self


settings = Settings()