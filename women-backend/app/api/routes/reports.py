from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.acne_record import AcneImageRecord
from app.models.prediction_history import PredictionHistory
from app.models.user import User
from app.services.report_service import generate_image_prediction_report, generate_text_prediction_report

router = APIRouter()


@router.get("/{record_id}")
def get_report(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates (or regenerates) a PDF report for the given prediction record
    and returns it as a file download. Works for both text and image
    prediction records — the id is looked up in both tables since they
    don't share an id space guarantee.
    """
    text_record = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.id == record_id, PredictionHistory.user_id == current_user.id)
        .first()
    )
    if text_record is not None:
        pdf_path = generate_text_prediction_report(current_user, text_record)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"health_report_{text_record.prediction_type}_{record_id[:8]}.pdf",
        )

    image_record = (
        db.query(AcneImageRecord)
        .filter(AcneImageRecord.id == record_id, AcneImageRecord.user_id == current_user.id)
        .first()
    )
    if image_record is not None:
        pdf_path = generate_image_prediction_report(current_user, image_record)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"acne_report_{record_id[:8]}.pdf",
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No prediction record with that id exists for this user.",
    )
