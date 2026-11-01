from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.acne_record import AcneImageRecord
from app.models.prediction_history import PredictionHistory
from app.models.user import User
from app.schemas.prediction import PredictionHistoryItem, PredictionStatsResponse

router = APIRouter()


@router.get("", response_model=list[PredictionHistoryItem])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text_records = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == current_user.id)
        .order_by(PredictionHistory.created_at.desc())
        .all()
    )
    image_records = (
        db.query(AcneImageRecord)
        .filter(AcneImageRecord.user_id == current_user.id)
        .order_by(AcneImageRecord.created_at.desc())
        .all()
    )

    items = [
        PredictionHistoryItem(
            id=r.id,
            kind="text",
            prediction_type=r.prediction_type,
            model_variant=r.model_variant,
            prediction_result=r.prediction_result,
            confidence_score=round(r.confidence_score, 2),
            created_at=r.created_at.isoformat(),
        )
        for r in text_records
    ] + [
        PredictionHistoryItem(
            id=r.id,
            kind="image",
            severity=r.severity_result,
            confidence_score=round(r.confidence_score, 2),
            created_at=r.created_at.isoformat(),
        )
        for r in image_records
    ]

    items.sort(key=lambda i: i.created_at, reverse=True)
    return items


@router.get("/stats", response_model=PredictionStatsResponse)
def get_prediction_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text_records = db.query(PredictionHistory).filter(PredictionHistory.user_id == current_user.id).all()
    image_records = db.query(AcneImageRecord).filter(AcneImageRecord.user_id == current_user.id).all()

    by_condition: dict[str, int] = {}
    for r in text_records:
        by_condition[r.prediction_type] = by_condition.get(r.prediction_type, 0) + 1

    by_severity: dict[str, int] = {}
    for r in image_records:
        by_severity[r.severity_result] = by_severity.get(r.severity_result, 0) + 1

    return PredictionStatsResponse(
        total_predictions=len(text_records) + len(image_records),
        text_predictions=len(text_records),
        image_predictions=len(image_records),
        by_condition=by_condition,
        by_severity=by_severity,
    )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # A given id could belong to either table (text or image predictions
    # share no id space guarantee), so check both rather than assuming.
    text_record = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.id == record_id, PredictionHistory.user_id == current_user.id)
        .first()
    )
    if text_record is not None:
        db.delete(text_record)
        db.commit()
        return

    image_record = (
        db.query(AcneImageRecord)
        .filter(AcneImageRecord.id == record_id, AcneImageRecord.user_id == current_user.id)
        .first()
    )
    if image_record is not None:
        db.delete(image_record)
        db.commit()
        return

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No prediction record with that id exists for this user.",
    )
