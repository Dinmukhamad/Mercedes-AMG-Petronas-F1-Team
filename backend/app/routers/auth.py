from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_token_payload, get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.core.token_blacklist import revoke_token
from app.models.user import User
from app.schemas.auth import MessageResponse, Token, UserLogin, UserRegister, UserResponse


router = APIRouter(prefix="/api/auth", tags=["auth"])
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = timedelta(minutes=1)
_login_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _enforce_login_rate_limit(request: Request) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - LOGIN_RATE_WINDOW
    key = _client_ip(request)
    attempts = _login_attempts[key]

    while attempts and attempts[0] <= cutoff:
        attempts.popleft()

    if len(attempts) >= LOGIN_RATE_LIMIT:
        retry_after = max(1, int((attempts[0] + LOGIN_RATE_WINDOW - now).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too Many Requests",
            headers={"Retry-After": str(retry_after)},
        )

    attempts.append(now)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    username_exists = db.query(User).filter(User.username == payload.username).first()
    if username_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )
    email_exists = db.query(User).filter(User.email == payload.email).first()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    user = User(
        username=payload.username,
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    request: Request,
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> Token:
    _enforce_login_rate_limit(request)
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: dict[str, Any] = Depends(get_current_token_payload),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    revoke_token(db, payload)
    return MessageResponse(message="Logged out successfully")
