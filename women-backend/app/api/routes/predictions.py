from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.ml.feature_encoder import MissingFieldError, UnknownCategoryError, get_feature_schema
from app.ml.registry import TEXT_MODEL_REGISTRY, get_variant, list_variants_for_condition
from app.ml.image_predictor import predict_image
from app.models.user import User
from app.schemas.prediction import ImagePredictionResponse, TextPredictionRequest, TextPredictionResponse
from app.services import prediction_service
from app.services.upload_service import ImageTooLargeError, InvalidImageError, validate_and_save_acne_image

router = APIRouter()


@router.get("/text/variants")
def list_text_model_variants():
    """Lists every available text model variant, grouped by condition, with metadata."""
    by_condition: dict[str, list[dict]] = {}
    for spec in TEXT_MODEL_REGISTRY.values():
        by_condition.setdefault(spec.condition, []).append({
            "variant_id": spec.variant_id,
            "display_name": spec.display_name,
            "is_default": spec.is_default_for_condition,
            "n_classes": spec.n_classes,
            "training_accuracy": spec.training_accuracy,
            "training_auc": spec.training_auc,
            "notes": spec.notes,
        })
    return by_condition


@router.get("/text/schema/{variant_id}")
def get_text_model_schema(variant_id: str):
    """
    Returns the exact field list (and allowed categorical values) a given
    model variant expects, so a form can be built without hardcoding field
    names that could drift out of sync with the trained model.
    """
    try:
        spec = get_variant(variant_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown model variant '{variant_id}'.")
    return get_feature_schema(spec)


@router.post("/text", response_model=TextPredictionResponse)
def predict_text_endpoint(
    payload: TextPredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        record = prediction_service.run_text_prediction(
            db,
            user_id=current_user.id,
            condition=payload.condition,
            input_data=payload.input_data,
            model_variant=payload.model_variant,
        )
    except MissingFieldError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UnknownCategoryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return TextPredictionResponse(
        id=record.id,
        model_variant=record.model_variant,
        condition=record.prediction_type,
        prediction=record.prediction_result,
        confidence_score=round(record.confidence_score, 2),
        probabilities={k: round(v, 4) for k, v in record.probabilities.items()},
    )


@router.post("/image", response_model=ImagePredictionResponse)
async def predict_image_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        saved_path, image_bytes = await validate_and_save_acne_image(file, user_id=current_user.id)
    except InvalidImageError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ImageTooLargeError as e:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e))

    result = predict_image(image_bytes)

    record = prediction_service.save_image_prediction(
        db,
        user_id=current_user.id,
        image_path=saved_path,
        severity_result=result.predicted_label,
        confidence_score=result.confidence_score,
        probabilities=result.probabilities,
        model_degraded=result.degraded,
    )

    response_dict = result.to_dict()
    return ImagePredictionResponse(
        id=record.id,
        severity=response_dict["severity"],
        confidence_score=response_dict["confidence_score"],
        probabilities=response_dict["probabilities"],
        model_degraded=response_dict["model_degraded"],
        warning=response_dict.get("warning"),
        image_path=record.image_path,
    )
