import secrets

from sqlalchemy.orm import Session

from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidResetTokenError(Exception):
    pass


def register_user(db: Session, name: str, email: str, password: str, phone: str | None) -> User:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing is not None:
        raise EmailAlreadyRegisteredError(f"Email {email} is already registered.")

    user = User(
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        phone=phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None or not verify_password(password, user.password_hash):
        # Deliberately the same error for "no such user" and "wrong password"
        # so the API doesn't leak which registered emails exist.
        raise InvalidCredentialsError("Incorrect email or password.")
    return user


def issue_token_pair(user: User) -> tuple[str, str]:
    access = create_token(subject=user.id, token_type="access")
    refresh = create_token(subject=user.id, token_type="refresh")
    return access, refresh


def refresh_access_token(db: Session, refresh_token: str) -> str:
    payload = decode_token(refresh_token, expected_type="refresh")
    if payload is None:
        raise InvalidCredentialsError("Invalid or expired refresh token.")
    user = db.get(User, payload["sub"])
    if user is None:
        raise InvalidCredentialsError("User for this token no longer exists.")
    return create_token(subject=user.id, token_type="access")


def request_password_reset(db: Session, email: str) -> tuple[User, str] | None:
    """
    Returns (user, raw_reset_token) on success, or None if no account exists
    for that email. Callers should respond the same way to the API caller
    in both cases (don't reveal whether the email is registered) — see the
    forgot-password route for that handling; this function itself doesn't
    obscure it because the route needs to know whether to actually send/log
    a token.
    """
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None:
        return None

    token = create_token(subject=user.id, token_type="password_reset")
    payload = decode_token(token, expected_type="password_reset")
    assert payload is not None  # we just created it

    reset_record = PasswordResetToken(user_id=user.id, token_jti=payload["jti"])
    db.add(reset_record)
    db.commit()

    return user, token


def reset_password(db: Session, token: str, new_password: str) -> User:
    payload = decode_token(token, expected_type="password_reset")
    if payload is None:
        raise InvalidResetTokenError("Invalid or expired password reset token.")

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_jti == payload["jti"])
        .first()
    )
    if record is None or record.used:
        raise InvalidResetTokenError("This password reset link has already been used or is invalid.")

    user = db.get(User, payload["sub"])
    if user is None:
        raise InvalidResetTokenError("User for this token no longer exists.")

    user.password_hash = hash_password(new_password)
    record.used = True
    db.commit()

    return user
