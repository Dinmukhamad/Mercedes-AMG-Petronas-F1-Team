from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.token_blacklist import TokenBlacklist


def _utc_from_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromtimestamp(int(value), tz=timezone.utc)


def cleanup_expired_tokens(db: Session) -> None:
    now = datetime.now(timezone.utc)
    db.query(TokenBlacklist).filter(TokenBlacklist.expires_at <= now).delete()
    db.commit()


def is_token_revoked(db: Session, jti: str) -> bool:
    cleanup_expired_tokens(db)
    now = datetime.now(timezone.utc)
    return (
        db.query(TokenBlacklist)
        .filter(TokenBlacklist.jti == jti, TokenBlacklist.expires_at > now)
        .first()
        is not None
    )


def revoke_token(db: Session, payload: dict[str, Any]) -> None:
    jti = payload.get("jti")
    expires_at = payload.get("exp")
    if not jti or not expires_at:
        return

    if db.query(TokenBlacklist).filter_by(jti=jti).first() is not None:
        return

    db.add(TokenBlacklist(jti=jti, expires_at=_utc_from_timestamp(expires_at)))
    db.commit()
