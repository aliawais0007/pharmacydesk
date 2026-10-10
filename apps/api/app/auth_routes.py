from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from uuid import uuid4

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.models import AuthSession, User
from app.schemas import AuthSessionRead, LoginRequest, UserRead
from app.security import create_access_token, get_current_user, hash_password, verify_password


router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
REFRESH_COOKIE = "pharmacy_refresh"
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
_dummy_password_hash = hash_password("not-a-real-pharmacy-password")


@router.get("/me", response_model=UserRead)
def current_session_user(user: User = Depends(get_current_user)) -> User:
    return user


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _digest_refresh_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _set_refresh_cookie(response: Response, value: str, expires_at: datetime) -> None:
    max_age = max(0, int((expires_at - _now()).total_seconds()))
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )


def _new_auth_session(db: Session, user: User, request: Request, now: datetime) -> tuple[AuthSession, str]:
    session_id = uuid4().hex
    secret = secrets.token_urlsafe(48)
    session = AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=_digest_refresh_secret(secret),
        created_at=now,
        last_used_at=now,
        expires_at=now + timedelta(days=settings.auth_refresh_token_days),
        absolute_expires_at=now + timedelta(days=settings.auth_session_max_days),
        user_agent=request.headers.get("user-agent", "")[:300] or None,
    )
    db.add(session)
    return session, f"{session_id}.{secret}"


def _auth_response(user: User) -> AuthSessionRead:
    return AuthSessionRead(
        access_token=create_access_token(user),
        expires_in=settings.auth_access_token_minutes * 60,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=AuthSessionRead)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionRead:
    now = _now()
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email).with_for_update())

    if user is None:
        verify_password(payload.password, _dummy_password_hash)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        verify_password(payload.password, user.password_hash)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.locked_until and _as_utc(user.locked_until) > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    if user.locked_until and _as_utc(user.locked_until) <= now:
        user.failed_login_attempts = 0
        user.locked_until = None

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.failed_login_attempts = 0
    user.locked_until = None
    session, cookie_value = _new_auth_session(db, user, request, now)
    db.commit()
    _set_refresh_cookie(response, cookie_value, session.expires_at)
    return _auth_response(user)


@router.post("/refresh", response_model=AuthSessionRead)
def refresh_session(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: Session = Depends(get_db),
) -> AuthSessionRead:
    if not refresh_cookie or "." not in refresh_cookie:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired")

    session_id, secret = refresh_cookie.split(".", 1)
    session = db.scalar(
        select(AuthSession)
        .options(selectinload(AuthSession.user))
        .where(AuthSession.id == session_id)
        .with_for_update()
    )
    now = _now()
    if session is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired")

    if not secrets.compare_digest(session.refresh_token_hash, _digest_refresh_secret(secret)):
        session.revoked_at = now
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session is no longer valid")

    if (
        session.revoked_at is not None
        or _as_utc(session.expires_at) <= now
        or _as_utc(session.absolute_expires_at) <= now
        or not session.user.is_active
    ):
        session.revoked_at = session.revoked_at or now
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired")

    new_secret = secrets.token_urlsafe(48)
    session.refresh_token_hash = _digest_refresh_secret(new_secret)
    session.last_used_at = now
    session.expires_at = min(
        now + timedelta(days=settings.auth_refresh_token_days),
        _as_utc(session.absolute_expires_at),
    )
    db.commit()
    _set_refresh_cookie(response, f"{session.id}.{new_secret}", session.expires_at)
    return _auth_response(session.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: Session = Depends(get_db),
) -> Response:
    if refresh_cookie and "." in refresh_cookie:
        session_id = refresh_cookie.split(".", 1)[0]
        session = db.get(AuthSession, session_id)
        if session and session.revoked_at is None:
            session.revoked_at = _now()
            db.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def ensure_bootstrap_admin(db: Session) -> bool:
    password = settings.bootstrap_admin_password
    if not password:
        return False
    email = settings.bootstrap_admin_email.strip().lower()
    existing = db.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        return False
    db.add(
        User(
            email=email,
            full_name="Pharmacy Administrator",
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )
    )
    db.commit()
    return True