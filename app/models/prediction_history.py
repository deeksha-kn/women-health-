import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class PredictionHistory(Base):
    """
    Stores one text-model prediction (PCOS / PCOD / Thyroid). `prediction_type`
    records which condition family was predicted, and `model_variant` records
    which specific trained model produced it (since there are two PCOD
    variants and two Thyroid variants in this system) — without that second
    field, "PCOD" alone wouldn't tell you which of two differently-trained
    models actually generated the result.
    """

    __tablename__ = "prediction_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    prediction_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "pcos" | "pcod" | "thyroid"
    model_variant: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "pcod_v2", "thyroid_preprocessed2"

    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    prediction_result: Mapped[str] = mapped_column(String(100), nullable=False)  # human-readable label
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100

    # Full class-probability breakdown (e.g. {"hyperthyroid": 0.81, ...}),
    # kept alongside the single top label/confidence above so the dashboard
    # and PDF report can show more than just the winning class if useful.
    probabilities: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="prediction_history")
