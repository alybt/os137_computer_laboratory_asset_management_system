"""User administration endpoints (admin only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import User
from ..schemas import Message, UserCreate, UserOut, UserUpdate
from ..security import hash_password
from ..services import log_activity

router = APIRouter(
    prefix="/users", tags=["users"], dependencies=[Depends(require_admin)]
)


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _ensure_unique_email(
    db: Session, email: str, exclude_id: int | None = None
) -> None:
    query = select(User).where(func.lower(User.email) == email.lower())
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status_code=409, detail="That email is already in use")


@router.get("", response_model=list[UserOut])
def list_users(
    q: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
) -> list[User]:
    query = select(User)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(
            or_(func.lower(User.full_name).like(like), func.lower(User.email).like(like))
        )
    if role:
        query = query.where(User.role == role)
    return list(db.scalars(query.order_by(User.full_name)).all())


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    _ensure_unique_email(db, payload.email)
    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    log_activity(db, admin, "create", "user", user.id, f"Created user {user.email}")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    user = _get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)

    if data.get("email"):
        _ensure_unique_email(db, data["email"], exclude_id=user.id)
        data["email"] = data["email"].lower()

    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")
    if user.id == admin.id and data.get("role") not in (None, "admin"):
        raise HTTPException(status_code=400, detail="You cannot demote yourself")

    if data.get("is_active") is False or data.get("role") not in (None, "admin"):
        remaining_admins = db.scalar(
            select(func.count(User.id)).where(
                User.role == "admin", User.is_active.is_(True), User.id != user.id
            )
        )
        if user.role == "admin" and not remaining_admins:
            raise HTTPException(
                status_code=400, detail="At least one active administrator is required"
            )

    password = data.pop("password", None)
    if password:
        user.password_hash = hash_password(password)
    for key, value in data.items():
        setattr(user, key, value)

    log_activity(db, admin, "update", "user", user.id, f"Updated user {user.email}")
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=Message)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Message:
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    if user.role == "admin":
        remaining_admins = db.scalar(
            select(func.count(User.id)).where(
                User.role == "admin", User.is_active.is_(True), User.id != user.id
            )
        )
        if not remaining_admins:
            raise HTTPException(
                status_code=400, detail="At least one active administrator is required"
            )
    email = user.email
    db.delete(user)
    log_activity(db, admin, "delete", "user", user_id, f"Deleted user {email}")
    db.commit()
    return Message(message="User deleted")
