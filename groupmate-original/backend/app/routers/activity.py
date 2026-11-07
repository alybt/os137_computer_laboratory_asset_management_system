"""Audit activity feed."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import ActivityLog
from ..schemas import ActivityOut
from ..services import to_activity_out

router = APIRouter(
    prefix="/activity",
    tags=["activity"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[ActivityOut])
def list_activity(
    q: str | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[ActivityOut]:
    query = select(ActivityLog)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(ActivityLog.user_name).like(like),
                func.lower(func.coalesce(ActivityLog.detail, "")).like(like),
            )
        )
    if action:
        query = query.where(ActivityLog.action == action)
    if entity_type:
        query = query.where(ActivityLog.entity_type == entity_type)
    logs = db.scalars(
        query.order_by(ActivityLog.created_at.desc()).limit(limit)
    ).all()
    return [to_activity_out(log) for log in logs]
