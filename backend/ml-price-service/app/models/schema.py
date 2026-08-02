from datetime import date

from pydantic import BaseModel, Field

DEFAULT_CANDIDATE_CROPS = ["Rice", "Wheat", "Millet", "Cotton", "Maize", "Sorghum", "Groundnut"]


class PredictRequest(BaseModel):
    crop: str = Field(..., description="Crop name, e.g. Rice")
    market_name: str = Field(..., description="Mandi/market name, e.g. Nashik")
    target_date: date = Field(..., description="Date to predict the price for")


class PredictResponse(BaseModel):
    model_version: str
    crop: str
    predicted_price: float
    confidence: float
    model_type: str = Field(..., description="'time_series' or 'regression', whichever served this prediction")
    covered_crops: list[str]
    uncovered_crops: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str | None = None
