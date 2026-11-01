from sqlalchemy.orm import Session

from app.ml.text_predictor import predict_text
from app.models.acne_record import AcneImageRecord
from app.models.prediction_history import PredictionHistory


def run_text_prediction(
    db: Session,
    user_id: str,
    condition: str,
    input_data: dict,
    model_variant: str | None,
) -> PredictionHistory:
    """
    Runs the ML prediction and persists it. Raises whatever the underlying
    predict_text() raises (MissingFieldError, UnknownCategoryError, etc.) —
    the route layer is responsible for translating those into HTTP errors.
    """
    result = predict_text(input_data, condition=condition, variant_id=model_variant)

    record = PredictionHistory(
        user_id=user_id,
        prediction_type=condition,
        model_variant=result.variant_id,
        input_data=input_data,
        prediction_result=result.predicted_label,
        confidence_score=round(result.confidence_score, 2),
        probabilities={k: round(v, 4) for k, v in result.probabilities.items()},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_image_prediction(
    db: Session,
    user_id: str,
    image_path: str,
    severity_result: str,
    confidence_score: float,
    probabilities: dict,
    model_degraded: bool,
) -> AcneImageRecord:
    record = AcneImageRecord(
        user_id=user_id,
        image_path=image_path,
        severity_result=severity_result,
        confidence_score=round(confidence_score, 2),
        probabilities={k: round(v, 4) for k, v in probabilities.items()},
        model_degraded=model_degraded,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
