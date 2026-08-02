import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import settings
from app.inference.predictor import CropPredictor

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("ml-crop-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading crop model from %s", settings.model_path)
    app.state.predictor = CropPredictor(settings.model_path, settings.metadata_path)
    logger.info("Model %s loaded", app.state.predictor.model_version)
    yield


app = FastAPI(title="AgriIntel ML Crop Service", lifespan=lifespan)
app.include_router(router)
