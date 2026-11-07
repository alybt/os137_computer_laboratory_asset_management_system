"""Asset inventory endpoints."""

from __future__ import annotations

from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..deps import get_current_user, require_admin, require_writer
from ..models import Asset, Assignment, Category, Laboratory, User
from ..schemas import AssetCreate, AssetOut, AssetPage, AssetUpdate, Message
from ..services import log_activity, to_asset_out

router = APIRouter(
    prefix="/assets", tags=["assets"], dependencies=[Depends(get_current_user)]
)

ASSET_LOAD_OPTIONS = (
    joinedload(Asset.category),
    joinedload(Asset.laboratory),
    selectinload(Asset.assignments).joinedload(Assignment.assigned_by_user),
    selectinload(Asset.maintenance_records),
)


def _get_asset(db: Session, asset_id: int) -> Asset:
    asset = db.scalar(
        select(Asset).where(Asset.id == asset_id).options(*ASSET_LOAD_OPTIONS)
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


def _validate_relations(
    db: Session, category_id: int | None, laboratory_id: int | None
) -> None:
    if category_id is not None and db.get(Category, category_id) is None:
        raise HTTPException(status_code=400, detail="Selected category does not exist")
    if laboratory_id is not None and db.get(Laboratory, laboratory_id) is None:
        raise HTTPException(status_code=400, detail="Selected laboratory does not exist")


def _ensure_unique_tag(
    db: Session, tag: str, exclude_id: int | None = None
) -> None:
    query = select(Asset).where(func.lower(Asset.asset_tag) == tag.lower())
    if exclude_id is not None:
        query = query.where(Asset.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status_code=409, detail="That asset tag is already in use")


@router.get("", response_model=AssetPage)
def list_assets(
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    condition: str | None = None,
    category_id: int | None = None,
    laboratory_id: int | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AssetPage:
    filters = []
    if q:
        like = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(Asset.asset_tag).like(like),
                func.lower(Asset.name).like(like),
                func.lower(func.coalesce(Asset.brand, "")).like(like),
                func.lower(func.coalesce(Asset.model, "")).like(like),
                func.lower(func.coalesce(Asset.serial_number, "")).like(like),
            )
        )
    if status_filter:
        filters.append(Asset.status == status_filter)
    if condition:
        filters.append(Asset.condition == condition)
    if category_id:
        filters.append(Asset.category_id == category_id)
    if laboratory_id:
        filters.append(Asset.laboratory_id == laboratory_id)

    total = db.scalar(select(func.count(Asset.id)).where(*filters)) or 0

    sort_columns = {
        "created_at": Asset.created_at,
        "name": Asset.name,
        "asset_tag": Asset.asset_tag,
        "purchase_date": Asset.purchase_date,
        "purchase_cost": Asset.purchase_cost,
        "status": Asset.status,
        "condition": Asset.condition,
    }
    sort_column = sort_columns.get(sort_by, Asset.created_at)
    ordering = sort_column.asc() if order == "asc" else sort_column.desc()

    query = (
        select(Asset)
        .where(*filters)
        .options(*ASSET_LOAD_OPTIONS)
        .order_by(ordering)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(query).unique().all())
    return AssetPage(
        items=[to_asset_out(asset) for asset in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, ceil(total / page_size)) if total else 0,
    )


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db)) -> AssetOut:
    return to_asset_out(_get_asset(db, asset_id))


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> AssetOut:
    _ensure_unique_tag(db, payload.asset_tag)
    _validate_relations(db, payload.category_id, payload.laboratory_id)
    if payload.status == "assigned":
        raise HTTPException(
            status_code=400,
            detail="Create an assignment to mark an asset as assigned",
        )
    data = payload.model_dump()
    data["asset_tag"] = payload.asset_tag.strip().upper()
    asset = Asset(**data, created_by=user.id)
    db.add(asset)
    db.flush()
    log_activity(
        db, user, "create", "asset", asset.id, f"Added {asset.asset_tag} — {asset.name}"
    )
    db.commit()
    return to_asset_out(_get_asset(db, asset.id))


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> AssetOut:
    asset = _get_asset(db, asset_id)
    data = payload.model_dump(exclude_unset=True)

    if data.get("asset_tag"):
        _ensure_unique_tag(db, data["asset_tag"], exclude_id=asset.id)
        data["asset_tag"] = data["asset_tag"].strip().upper()
    if "category_id" in data or "laboratory_id" in data:
        _validate_relations(
            db,
            data.get("category_id", asset.category_id),
            data.get("laboratory_id", asset.laboratory_id),
        )

    if data.get("status") == "assigned" and asset.active_assignment is None:
        raise HTTPException(
            status_code=400,
            detail="Use the assignments page to mark an asset as assigned",
        )
    if asset.active_assignment and data.get("status") in {
        "available",
        "retired",
        "lost",
    }:
        raise HTTPException(
            status_code=409,
            detail="Return the active assignment before changing this asset's status",
        )

    for key, value in data.items():
        setattr(asset, key, value)
    log_activity(
        db, user, "update", "asset", asset.id, f"Updated {asset.asset_tag} — {asset.name}"
    )
    db.commit()
    return to_asset_out(_get_asset(db, asset.id))


@router.delete("/{asset_id}", response_model=Message)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> Message:
    asset = _get_asset(db, asset_id)
    if asset.active_assignment:
        raise HTTPException(
            status_code=409,
            detail="This asset is currently assigned. Return it before deleting.",
        )
    label = f"{asset.asset_tag} — {asset.name}"
    db.delete(asset)
    log_activity(db, user, "delete", "asset", asset_id, f"Deleted {label}")
    db.commit()
    return Message(message="Asset deleted")
