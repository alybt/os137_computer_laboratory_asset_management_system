"""Asset category endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin, require_writer
from ..models import Asset, Category, User
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate, Message
from ..services import log_activity

router = APIRouter(
    prefix="/categories",
    tags=["categories"],
    dependencies=[Depends(get_current_user)],
)


def _to_out(category: Category, asset_count: int = 0) -> CategoryOut:
    data = CategoryOut.model_validate(category)
    data.asset_count = asset_count
    return data


def _get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def _asset_count(db: Session, category_id: int) -> int:
    return db.scalar(select(func.count(Asset.id)).where(Asset.category_id == category_id)) or 0


@router.get("", response_model=list[CategoryOut])
def list_categories(q: str | None = None, db: Session = Depends(get_db)):
    query = (
        select(Category, func.count(Asset.id))
        .outerjoin(Asset, Asset.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    if q:
        like = f"%{q.lower()}%"
        query = query.where(func.lower(Category.name).like(like))
    return [_to_out(category, count) for category, count in db.execute(query).all()]


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> CategoryOut:
    duplicate = db.scalar(
        select(Category).where(func.lower(Category.name) == payload.name.lower())
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with that name already exists",
        )
    category = Category(**payload.model_dump())
    category.name = category.name.strip()
    db.add(category)
    db.flush()
    log_activity(db, user, "create", "category", category.id, f"Created {category.name}")
    db.commit()
    db.refresh(category)
    return _to_out(category, 0)


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> CategoryOut:
    category = _get_category(db, category_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("name"):
        duplicate = db.scalar(
            select(Category).where(
                Category.id != category.id,
                func.lower(Category.name) == data["name"].lower(),
            )
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="A category with that name already exists")
    for key, value in data.items():
        setattr(category, key, value)
    log_activity(db, user, "update", "category", category.id, f"Updated {category.name}")
    db.commit()
    db.refresh(category)
    return _to_out(category, _asset_count(db, category.id))


@router.delete("/{category_id}", response_model=Message)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> Message:
    category = _get_category(db, category_id)
    count = _asset_count(db, category.id)
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"This category still has {count} asset(s). Reassign them first.",
        )
    name = category.name
    db.delete(category)
    log_activity(db, user, "delete", "category", category_id, f"Deleted {name}")
    db.commit()
    return Message(message="Category deleted")
