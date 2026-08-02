import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.schema import HealthResponse, PredictRequest, PredictResponse

logger = logging.getLogger("ml-crop-service")

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, request: Request) -> PredictResponse:
    predictor = request.app.state.predictor
    try:
        return predictor.predict(
            nitrogen=payload.nitrogen,
            phosphorus=payload.phosphorus,
            potassium=payload.potassium,
            temperature=payload.temperature,
            humidity=payload.humidity,
            ph=payload.ph,
            rainfall=payload.rainfall,
            candidate_crops=payload.candidate_crops,
        )
    except Exception:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Inference failed")


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        return HealthResponse(status="degraded", model_loaded=False, model_version=None)
    return HealthResponse(status="ok", model_loaded=True, model_version=predictor.model_version)
