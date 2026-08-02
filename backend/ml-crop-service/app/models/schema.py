from pydantic import BaseModel, Field

DEFAULT_CANDIDATE_CROPS = ["Rice", "Millet", "Wheat", "Cotton", "Maize", "Sorghum", "Groundnut"]


class PredictRequest(BaseModel):
    nitrogen: float = Field(..., description="Soil nitrogen content")
    phosphorus: float = Field(..., description="Soil phosphorus content")
    potassium: float = Field(..., description="Soil potassium content")
    temperature: float = Field(..., description="Ambient temperature in Celsius")
    humidity: float = Field(..., description="Relative humidity percentage")
    ph: float = Field(..., description="Soil pH")
    rainfall: float = Field(..., description="Rainfall in mm")
    candidate_crops: list[str] = Field(default_factory=lambda: list(DEFAULT_CANDIDATE_CROPS))


class CropPrediction(BaseModel):
    crop: str
    probability: float


class PredictResponse(BaseModel):
    model_version: str
    predictions: list[CropPrediction]
    covered_crops: list[str]
    uncovered_crops: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str | None = None
