"""Maintenance record endpoints."""

from __future__ import annotations

from datetime import date
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, require_admin, require_writer
from ..models import Asset, Assignment, MaintenanceRecord, User
from ..schemas import (
    MaintenanceCreate,
    MaintenanceOut,
    MaintenancePage,
    MaintenanceUpdate,
    Message,
)
from ..services import log_activity, to_maintenance_out

router = APIRouter(
    prefix="/maintenance",
    tags=["maintenance"],
    dependencies=[Depends(get_current_user)],
)

OPEN_STATUSES = ("scheduled", "in_progress")


def _get_record(db: Session, record_id: int) -> MaintenanceRecord:
    record = db.scalar(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.id == record_id)
        .options(joinedload(MaintenanceRecord.asset))
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return record


def _restore_asset_if_idle(
    db: Session, asset: Asset, exclude_record_id: int | None = None
) -> None:
    if asset.status in {"retired", "lost"}:
        return
    query = select(func.count(MaintenanceRecord.id)).where(
        MaintenanceRecord.asset_id == asset.id,
        MaintenanceRecord.status.in_(OPEN_STATUSES),
    )
    if exclude_record_id is not None:
        query = query.where(MaintenanceRecord.id != exclude_record_id)
    open_records = db.scalar(query) or 0
    if open_records:
        return
    active_assignment = db.scalar(
        select(Assignment).where(
            Assignment.asset_id == asset.id, Assignment.returned_at.is_(None)
        )
    )
    if active_assignment:
        asset.status = "assigned"
    elif asset.status == "maintenance":
        asset.status = "available"


@router.get("", response_model=MaintenancePage)
def list_maintenance(
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    maintenance_type: str | None = Query(default=None, alias="type"),
    asset_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> MaintenancePage:
    filters = []
    if q:
        like = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(MaintenanceRecord.title).like(like),
                func.lower(func.coalesce(MaintenanceRecord.performed_by, "")).like(like),
                func.lower(Asset.asset_tag).like(like),
                func.lower(Asset.name).like(like),
            )
        )
    if status_filter:
        filters.append(MaintenanceRecord.status == status_filter)
    if maintenance_type:
        filters.append(MaintenanceRecord.maintenance_type == maintenance_type)
    if asset_id:
        filters.append(MaintenanceRecord.asset_id == asset_id)

    total = (
        db.scalar(
            select(func.count(MaintenanceRecord.id))
            .select_from(MaintenanceRecord)
            .join(MaintenanceRecord.asset)
            .where(*filters)
        )
        or 0
    )
    query = (
        select(MaintenanceRecord)
        .join(MaintenanceRecord.asset)
        .where(*filters)
        .options(joinedload(MaintenanceRecord.asset))
        .order_by(MaintenanceRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(query).unique().all())
    return MaintenancePage(
        items=[to_maintenance_out(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, ceil(total / page_size)) if total else 0,
    )


@router.post("", response_model=MaintenanceOut, status_code=201)
def create_maintenance(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> MaintenanceOut:
    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status in {"retired", "lost"}:
        raise HTTPException(
            status_code=400,
            detail=f"A {asset.status} asset cannot be sent to maintenance",
        )
    active_assignment = db.scalar(
        select(Assignment).where(
            Assignment.asset_id == asset.id, Assignment.returned_at.is_(None)
        )
    )
    if active_assignment:
        raise HTTPException(
            status_code=400,
            detail="Return the active assignment before logging maintenance",
        )

    data = payload.model_dump()
    if data.get("status") == "completed" and not data.get("completed_date"):
        data["completed_date"] = date.today()

    record = MaintenanceRecord(**data, created_by=user.id)
    db.add(record)
    if record.status in OPEN_STATUSES:
        asset.status = "maintenance"
    db.flush()
    log_activity(
        db,
        user,
        "create",
        "maintenance",
        record.id,
        f"Logged maintenance for {asset.asset_tag}: {record.title}",
    )
    db.commit()
    return to_maintenance_out(_get_record(db, record.id))


@router.patch("/{record_id}", response_model=MaintenanceOut)
def update_maintenance(
    record_id: int,
    payload: MaintenanceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> MaintenanceOut:
    record = _get_record(db, record_id)
    asset = record.asset
    data = payload.model_dump(exclude_unset=True)

    new_status = data.get("status", record.status)
    if new_status in OPEN_STATUSES and asset.status in {"retired", "lost"}:
        raise HTTPException(
            status_code=400, detail=f"A {asset.status} asset cannot be serviced"
        )
    if new_status in OPEN_STATUSES:
        active_assignment = db.scalar(
            select(Assignment).where(
                Assignment.asset_id == asset.id, Assignment.returned_at.is_(None)
            )
        )
        if active_assignment:
            raise HTTPException(
                status_code=400,
                detail="Return the active assignment before servicing this asset",
            )

    for key, value in data.items():
        setattr(record, key, value)

    if record.status == "completed":
        record.completed_date = record.completed_date or date.today()
        _restore_asset_if_idle(db, asset, exclude_record_id=record.id)
    elif record.status == "cancelled":
        _restore_asset_if_idle(db, asset, exclude_record_id=record.id)
    elif record.status in OPEN_STATUSES:
        asset.status = "maintenance"

    log_activity(
        db,
        user,
        "update",
        "maintenance",
        record.id,
        f"Updated maintenance for {asset.asset_tag}: {record.title}",
    )
    db.commit()
    return to_maintenance_out(_get_record(db, record.id))


@router.delete("/{record_id}", response_model=Message)
def delete_maintenance(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> Message:
    record = _get_record(db, record_id)
    asset = record.asset
    was_open = record.status in OPEN_STATUSES
    title = record.title
    db.delete(record)
    if was_open:
        db.flush()
        _restore_asset_if_idle(db, asset, exclude_record_id=record.id)
    log_activity(
        db, user, "delete", "maintenance", record_id, f"Deleted maintenance: {title}"
    )
    db.commit()
    return Message(message="Maintenance record deleted")
