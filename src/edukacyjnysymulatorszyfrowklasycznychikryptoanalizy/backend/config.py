from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BACKEND_")

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
