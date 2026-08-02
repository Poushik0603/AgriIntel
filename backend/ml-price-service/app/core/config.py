from pathlib import Path

from pydantic_settings import BaseSettings

SERVICE_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    models_dir: Path = SERVICE_ROOT / "models"
    metadata_path: Path = SERVICE_ROOT / "models" / "metadata.json"
    log_level: str = "info"

    class Config:
        env_prefix = "ML_PRICE_SERVICE_"


settings = Settings()
