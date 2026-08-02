import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.schema import DEFAULT_CANDIDATE_CROPS, HealthResponse, PredictRequest, PredictResponse

logger = logging.getLogger("ml-price-service")

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, request: Request) -> PredictResponse:
    predictor = request.app.state.predictor
    try:
        return predictor.predict(
            crop=payload.crop,
            market_name=payload.market_name,
            target_date=payload.target_date,
            candidate_crops=DEFAULT_CANDIDATE_CROPS,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Inference failed")


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        return HealthResponse(status="degraded", model_loaded=False, model_version=None)
    return HealthResponse(status="ok", model_loaded=True, model_version=predictor.model_version)
