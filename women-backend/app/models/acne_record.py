import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class AcneImageRecord(Base):
    __tablename__ = "acne_image_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    severity_result: Mapped[str] = mapped_column(String(50), nullable=False)  # "Low" | "Moderate" | "High"
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
    probabilities: Mapped[dict] = mapped_column(JSON, nullable=True)

    # See app/ml/image_model.py for how this is determined. True whenever
    # the underlying model's output looks degenerate (near-identical
    # probabilities regardless of input) so the API and UI can warn the
    # user instead of presenting an unreliable number as if it were solid.
    model_degraded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="acne_records")
