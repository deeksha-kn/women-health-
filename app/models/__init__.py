"""
Importing this package ensures every model class is registered on
Base.metadata before Alembic autogenerate or create_all() runs. Without
these imports, a model defined in its own file but never imported anywhere
would be silently invisible to migrations.
"""
from app.models.user import User
from app.models.prediction_history import PredictionHistory
from app.models.acne_record import AcneImageRecord
from app.models.password_reset_token import PasswordResetToken

__all__ = ["User", "PredictionHistory", "AcneImageRecord", "PasswordResetToken"]
