"""Dashboard aggregate endpoints."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    ActivityLog,
    Asset,
    Assignment,
    Category,
    Laboratory,
    MaintenanceRecord,
    User,
)
from ..schemas import DashboardOut, DashboardTotals, NamedCount
from ..services import (
    OPEN_MAINTENANCE,
    to_activity_out,
    to_asset_out,
    to_maintenance_out,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)

STATUS_COLORS = {
    "available": "#10b981",
    "assigned": "#6366f1",
    "maintenance": "#f59e0b",
    "retired": "#94a3b8",
    "lost": "#ef4444",
}


def build_totals(db: Session) -> DashboardTotals:
    status_rows = dict(
        db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status)).all()
    )
    total_value = db.scalar(select(func.coalesce(func.sum(Asset.purchase_cost), 0)))
    return DashboardTotals(
        assets=sum(status_rows.values()),
        available=status_rows.get("available", 0),
        assigned=status_rows.get("assigned", 0),
        maintenance=status_rows.get("maintenance", 0),
        retired=status_rows.get("retired", 0),
        lost=status_rows.get("lost", 0),
        laboratories=db.scalar(select(func.count(Laboratory.id))) or 0,
        categories=db.scalar(select(func.count(Category.id))) or 0,
        users=db.scalar(select(func.count(User.id))) or 0,
        active_assignments=db.scalar(
            select(func.count(Assignment.id)).where(Assignment.returned_at.is_(None))
        )
        or 0,
        open_maintenance=db.scalar(
            select(func.count(MaintenanceRecord.id)).where(
                MaintenanceRecord.status.in_(OPEN_MAINTENANCE)
            )
        )
        or 0,
        total_value=float(total_value or 0),
    )


@router.get("", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    totals = build_totals(db)
    today = date.today()

    status_rows = dict(
        db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status)).all()
    )
    assets_by_status = [
        NamedCount(label=status, value=status_rows.get(status, 0), color=color)
        for status, color in STATUS_COLORS.items()
    ]

    category_rows = db.execute(
        select(Category.name, Category.color, func.count(Asset.id))
        .select_from(Asset)
        .outerjoin(Category, Asset.category_id == Category.id)
        .group_by(Category.name, Category.color)
        .order_by(func.count(Asset.id).desc())
    ).all()
    assets_by_category = [
        NamedCount(label=name or "Uncategorized", value=count, color=color or "#94a3b8")
        for name, color, count in category_rows
    ]

    lab_rows = db.execute(
        select(Laboratory.name, func.count(Asset.id))
        .select_from(Asset)
        .outerjoin(Laboratory, Asset.laboratory_id == Laboratory.id)
        .group_by(Laboratory.name)
        .order_by(func.count(Asset.id).desc())
    ).all()
    assets_by_laboratory = [
        NamedCount(label=name or "Unassigned", value=count) for name, count in lab_rows
    ]

    recent_activity = list(
        db.scalars(
            select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(8)
        ).all()
    )

    upcoming = list(
        db.scalars(
            select(MaintenanceRecord)
            .where(
                MaintenanceRecord.status.in_(OPEN_MAINTENANCE),
                (MaintenanceRecord.scheduled_date.is_(None))
                | (MaintenanceRecord.scheduled_date <= today + timedelta(days=30)),
            )
            .options(joinedload(MaintenanceRecord.asset))
            .order_by(
                MaintenanceRecord.scheduled_date.is_(None),
                MaintenanceRecord.scheduled_date.asc(),
            )
            .limit(6)
        )
        .unique()
        .all()
    )

    warranty_assets = list(
        db.scalars(
            select(Asset)
            .where(
                Asset.warranty_expiry.is_not(None),
                Asset.warranty_expiry >= today,
                Asset.warranty_expiry <= today + timedelta(days=90),
                Asset.status.not_in(["retired", "lost"]),
            )
            .options(
                joinedload(Asset.category),
                joinedload(Asset.laboratory),
                selectinload(Asset.assignments),
                selectinload(Asset.maintenance_records),
            )
            .order_by(Asset.warranty_expiry.asc())
            .limit(6)
        )
        .unique()
        .all()
    )

    return DashboardOut(
        totals=totals,
        assets_by_status=assets_by_status,
        assets_by_category=assets_by_category,
        assets_by_laboratory=assets_by_laboratory,
        recent_activity=[to_activity_out(item) for item in recent_activity],
        upcoming_maintenance=[to_maintenance_out(item) for item in upcoming],
        warranty_expiring=[to_asset_out(asset) for asset in warranty_assets],
    )
