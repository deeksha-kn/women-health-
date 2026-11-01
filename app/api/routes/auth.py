import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenPairResponse,
    UserLoginRequest,
    UserPublic,
    UserRegisterRequest,
)
from app.services import auth_service
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=TokenPairResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(
            db, name=payload.name, email=payload.email, password=payload.password, phone=payload.phone
        )
    except auth_service.EmailAlreadyRegisteredError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    access, refresh = auth_service.issue_token_pair(user)
    return TokenPairResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPairResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.authenticate_user(db, email=payload.email, password=payload.password)
    except auth_service.InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")

    access, refresh = auth_service.issue_token_pair(user)
    return TokenPairResponse(access_token=access, refresh_token=refresh)


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        access = auth_service.refresh_access_token(db, payload.refresh_token)
    except auth_service.InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")
    return RefreshResponse(access_token=access)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    result = auth_service.request_password_reset(db, email=payload.email)

    # Always return the same response whether or not the email exists, so
    # this endpoint can't be used to enumerate registered accounts.
    generic_response = {
        "message": "If an account with that email exists, a password reset link has been sent."
    }

    if result is None:
        return generic_response

    user, token = result
    reset_link = f"{settings.FRONTEND_RESET_URL}?token={token}"

    if settings.EMAIL_ENABLED:
        send_password_reset_email(to_email=user.email, reset_link=reset_link)
    else:
        # No SMTP configured (typical for local development) — log the
        # link instead of silently dropping it, so the flow is still
        # testable without a real mail server.
        logger.info("EMAIL_ENABLED is False; password reset link for %s: %s", user.email, reset_link)

    return generic_response


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        auth_service.reset_password(db, token=payload.token, new_password=payload.new_password)
    except auth_service.InvalidResetTokenError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "Password has been reset successfully."}


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        created_at=current_user.created_at.isoformat(),
    )
