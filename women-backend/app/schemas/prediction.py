from typing import Any, Literal

from pydantic import BaseModel, Field


class TextPredictionRequest(BaseModel):
    condition: Literal["pcos", "pcod", "thyroid"]
    model_variant: str | None = Field(
        default=None,
        description="Specific model variant id (e.g. 'pcod_v2'). Omit to use the condition's default variant.",
    )
    input_data: dict[str, Any] = Field(
        description="Field values matching the chosen model's schema. "
        "See GET /api/predict/text/schema/{variant_id} for the exact fields expected."
    )


class TextPredictionResponse(BaseModel):
    id: str
    model_variant: str
    condition: str
    prediction: str
    confidence_score: float
    probabilities: dict[str, float]


class ImagePredictionResponse(BaseModel):
    id: str
    severity: str
    confidence_score: float
    probabilities: dict[str, float]
    model_degraded: bool
    warning: str | None = None
    image_path: str


class PredictionHistoryItem(BaseModel):
    id: str
    kind: Literal["text", "image"]
    prediction_type: str | None = None  # for text
    model_variant: str | None = None
    severity: str | None = None  # for image
    prediction_result: str | None = None  # for text
    confidence_score: float
    created_at: str


class PredictionStatsResponse(BaseModel):
    total_predictions: int
    text_predictions: int
    image_predictions: int
    by_condition: dict[str, int]
    by_severity: dict[str, int]
