"""
Password hashing and JWT helpers.

Uses the `bcrypt` library directly rather than passlib's bcrypt wrapper.
passlib's version-detection shim is currently broken against bcrypt>=4.1
(it reads a `__about__.__version__` attribute that newer bcrypt releases
removed), which makes every hash/verify call raise at runtime. Calling
bcrypt directly avoids that broken code path entirely and is also one less
dependency to maintain.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt has a hard 72-byte input limit. Silently truncating would let two
# different long passwords collide on the same hash, which is a real
# security bug, so we reject anything over the limit instead.
_BCRYPT_MAX_BYTES = 72


def hash_password(plain_password: str) -> str:
    pw_bytes = plain_password.encode("utf-8")
    if len(pw_bytes) > _BCRYPT_MAX_BYTES:
        raise ValueError(
            f"Password is too long ({len(pw_bytes)} bytes); must be at most "
            f"{_BCRYPT_MAX_BYTES} bytes when UTF-8 encoded."
        )
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")
    if len(pw_bytes) > _BCRYPT_MAX_BYTES:
        # A password this long could never have been hashed successfully by
        # hash_password() above, so it can never match. Fail closed instead
        # of raising, since this path is reachable from untrusted login input.
        return False
    try:
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed/corrupt stored hash. Treat as "does not match" rather
        # than letting an exception take down the login endpoint.
        return False


TokenType = Literal["access", "refresh", "password_reset"]


def create_token(subject: str, token_type: TokenType, extra_claims: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire_minutes = {
        "access": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh": settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        "password_reset": settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    }[token_type]

    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes),
        # Random per-token id. Lets a specific token be revoked (e.g. after
        # password reset / change) without invalidating every token a user
        # has ever been issued.
        "jti": secrets.token_hex(16),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None

    if payload.get("type") != expected_type:
        return None

    return payload
