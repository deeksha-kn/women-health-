import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class PasswordResetToken(Base):
    """
    Tracks issued password-reset tokens so each one can be marked used after
    a successful reset. The JWT itself is stateless and self-verifying, but
    without this table a captured-and-reused reset link would work forever
    (or until expiry) even after the user had already reset their password
    with it once.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_jti: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="password_reset_tokens")
