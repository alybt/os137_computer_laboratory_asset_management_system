"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, utcnow
from ..schemas import (
    LoginRequest,
    Message,
    PasswordChange,
    ProfileUpdate,
    Token,
    UserOut,
)
from ..security import create_access_token, hash_password, verify_password
from ..services import log_activity

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = db.scalar(
        select(User).where(func.lower(User.email) == payload.email.lower())
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    user.last_login_at = utcnow()
    log_activity(db, user, "login", "user", user.id, "Signed in")
    db.commit()
    db.refresh(user)

    token, _expires_in = create_access_token(user.id)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if data.get("email"):
        existing = db.scalar(
            select(User).where(
                func.lower(User.email) == data["email"].lower(), User.id != user.id
            )
        )
        if existing:
            raise HTTPException(status_code=409, detail="That email is already in use")
    for key, value in data.items():
        setattr(user, key, value)
    log_activity(db, user, "update", "profile", user.id, "Updated profile")
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", response_model=Message)
def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Message:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    log_activity(db, user, "update", "password", user.id, "Changed password")
    db.commit()
    return Message(message="Password updated successfully")
