import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import settings
from app.inference.predictor import PricePredictor

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("ml-price-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading price model(s) from %s", settings.models_dir)
    app.state.predictor = PricePredictor(settings.models_dir, settings.metadata_path)
    logger.info("Model %s loaded, covering: %s", app.state.predictor.model_version, app.state.predictor.covered_crops)
    yield


app = FastAPI(title="AgriIntel ML Price Service", lifespan=lifespan)
app.include_router(router)
