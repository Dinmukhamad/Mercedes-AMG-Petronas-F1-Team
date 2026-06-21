from collections.abc import Generator

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.token_blacklist import is_token_revoked
from app.database import get_session
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db() -> Generator[Session, None, None]:
    yield from get_session()


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_token_payload(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    credentials_error = _credentials_error()
    payload = decode_access_token(token)
    if not payload:
        raise credentials_error

    subject = payload.get("sub")
    if subject is None:
        raise credentials_error

    jti = payload.get("jti")
    if not jti or is_token_revoked(db, str(jti)):
        raise credentials_error

    return payload


def get_current_user(
    payload: dict[str, Any] = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = _credentials_error()
    subject = payload.get("sub")
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise credentials_error from None

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error

    return user
