"""Asset assignment (check-out / return) endpoints."""

from __future__ import annotations

from datetime import date
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, require_admin, require_writer
from ..models import Asset, Assignment, User, utcnow
from ..schemas import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentPage,
    AssignmentUpdate,
    Message,
)
from ..services import log_activity, to_assignment_out

router = APIRouter(
    prefix="/assignments",
    tags=["assignments"],
    dependencies=[Depends(get_current_user)],
)


def _get_assignment(db: Session, assignment_id: int) -> Assignment:
    assignment = db.scalar(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            joinedload(Assignment.asset),
            joinedload(Assignment.assigned_by_user),
        )
    )
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.get("", response_model=AssignmentPage)
def list_assignments(
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    asset_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AssignmentPage:
    today = date.today()
    filters = []
    if q:
        like = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(Assignment.borrower_name).like(like),
                func.lower(func.coalesce(Assignment.borrower_email, "")).like(like),
                func.lower(func.coalesce(Assignment.department, "")).like(like),
                func.lower(Asset.asset_tag).like(like),
                func.lower(Asset.name).like(like),
            )
        )
    if status_filter == "active":
        filters.extend(
            [
                Assignment.returned_at.is_(None),
                or_(Assignment.due_date.is_(None), Assignment.due_date >= today),
            ]
        )
    elif status_filter == "overdue":
        filters.extend(
            [Assignment.returned_at.is_(None), Assignment.due_date < today]
        )
    elif status_filter == "returned":
        filters.append(Assignment.returned_at.is_not(None))
    if asset_id:
        filters.append(Assignment.asset_id == asset_id)

    total = (
        db.scalar(
            select(func.count(Assignment.id))
            .select_from(Assignment)
            .join(Assignment.asset)
            .where(*filters)
        )
        or 0
    )
    query = (
        select(Assignment)
        .join(Assignment.asset)
        .where(*filters)
        .options(
            joinedload(Assignment.asset),
            joinedload(Assignment.assigned_by_user),
        )
        .order_by(Assignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(query).unique().all())
    return AssignmentPage(
        items=[to_assignment_out(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, ceil(total / page_size)) if total else 0,
    )


@router.post("", response_model=AssignmentOut, status_code=201)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> AssignmentOut:
    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status in {"retired", "lost"}:
        raise HTTPException(
            status_code=400,
            detail=f"A {asset.status} asset cannot be assigned",
        )
    if asset.status == "maintenance":
        raise HTTPException(
            status_code=400,
            detail="This asset is under maintenance and cannot be assigned",
        )
    active = db.scalar(
        select(Assignment).where(
            Assignment.asset_id == asset.id, Assignment.returned_at.is_(None)
        )
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail="This asset is already assigned. Return it first.",
        )

    assignment = Assignment(**payload.model_dump(), assigned_by=user.id)
    db.add(assignment)
    asset.status = "assigned"
    db.flush()
    log_activity(
        db,
        user,
        "assign",
        "asset",
        asset.id,
        f"Assigned {asset.asset_tag} to {assignment.borrower_name}",
    )
    db.commit()
    return to_assignment_out(_get_assignment(db, assignment.id))


@router.patch("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> AssignmentOut:
    assignment = _get_assignment(db, assignment_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(assignment, key, value)
    log_activity(
        db,
        user,
        "update",
        "assignment",
        assignment.id,
        f"Updated assignment for {assignment.borrower_name}",
    )
    db.commit()
    return to_assignment_out(_get_assignment(db, assignment.id))


@router.post("/{assignment_id}/return", response_model=AssignmentOut)
def return_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> AssignmentOut:
    assignment = _get_assignment(db, assignment_id)
    if assignment.returned_at is not None:
        raise HTTPException(status_code=400, detail="This asset was already returned")

    assignment.returned_at = utcnow()
    asset = assignment.asset
    if asset.status not in {"maintenance", "retired", "lost"}:
        asset.status = "available"
    log_activity(
        db,
        user,
        "return",
        "asset",
        asset.id,
        f"{assignment.borrower_name} returned {asset.asset_tag}",
    )
    db.commit()
    return to_assignment_out(_get_assignment(db, assignment.id))


@router.delete("/{assignment_id}", response_model=Message)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> Message:
    assignment = _get_assignment(db, assignment_id)
    was_active = assignment.returned_at is None
    asset = assignment.asset
    if was_active and asset.status == "assigned":
        asset.status = "available"
    label = f"{asset.asset_tag} / {assignment.borrower_name}"
    db.delete(assignment)
    log_activity(db, user, "delete", "assignment", assignment_id, f"Deleted {label}")
    db.commit()
    return Message(message="Assignment deleted")
