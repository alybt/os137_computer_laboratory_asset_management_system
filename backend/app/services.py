"""Serialization and audit helpers shared by the API routers."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from .models import ActivityLog, Asset, Assignment, MaintenanceRecord, User
from .schemas import ActivityOut, AssetOut, AssignmentOut, MaintenanceOut

OPEN_MAINTENANCE = ("scheduled", "in_progress")


def assignment_status(assignment: Assignment) -> str:
    if assignment.returned_at is not None:
        return "returned"
    if assignment.due_date is not None and assignment.due_date < date.today():
        return "overdue"
    return "active"


def to_assignment_out(assignment: Assignment) -> AssignmentOut:
    asset = assignment.asset
    return AssignmentOut(
        id=assignment.id,
        asset_id=assignment.asset_id,
        asset_tag=asset.asset_tag if asset else None,
        asset_name=asset.name if asset else None,
        borrower_name=assignment.borrower_name,
        borrower_email=assignment.borrower_email,
        department=assignment.department,
        purpose=assignment.purpose,
        assigned_by=assignment.assigned_by,
        assigned_by_name=(
            assignment.assigned_by_user.full_name
            if assignment.assigned_by_user
            else None
        ),
        assigned_at=assignment.assigned_at,
        due_date=assignment.due_date,
        returned_at=assignment.returned_at,
        notes=assignment.notes,
        status=assignment_status(assignment),  # type: ignore[arg-type]
    )


def to_maintenance_out(record: MaintenanceRecord) -> MaintenanceOut:
    asset = record.asset
    return MaintenanceOut(
        id=record.id,
        asset_id=record.asset_id,
        asset_tag=asset.asset_tag if asset else None,
        asset_name=asset.name if asset else None,
        title=record.title,
        description=record.description,
        maintenance_type=record.maintenance_type,  # type: ignore[arg-type]
        status=record.status,  # type: ignore[arg-type]
        scheduled_date=record.scheduled_date,
        completed_date=record.completed_date,
        cost=record.cost,
        performed_by=record.performed_by,
        notes=record.notes,
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def to_asset_out(asset: Asset) -> AssetOut:
    active = asset.active_assignment
    return AssetOut(
        id=asset.id,
        asset_tag=asset.asset_tag,
        name=asset.name,
        description=asset.description,
        category_id=asset.category_id,
        category_name=asset.category.name if asset.category else None,
        category_color=asset.category.color if asset.category else None,
        laboratory_id=asset.laboratory_id,
        laboratory_name=asset.laboratory.name if asset.laboratory else None,
        status=asset.status,  # type: ignore[arg-type]
        condition=asset.condition,  # type: ignore[arg-type]
        brand=asset.brand,
        model=asset.model,
        serial_number=asset.serial_number,
        supplier=asset.supplier,
        purchase_date=asset.purchase_date,
        purchase_cost=asset.purchase_cost,
        warranty_expiry=asset.warranty_expiry,
        notes=asset.notes,
        created_by=asset.created_by,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        active_assignment=to_assignment_out(active) if active else None,
        open_maintenance_count=sum(
            1
            for record in asset.maintenance_records
            if record.status in OPEN_MAINTENANCE
        ),
    )


def to_activity_out(log: ActivityLog) -> ActivityOut:
    return ActivityOut.model_validate(log)


def log_activity(
    db: Session,
    user: User | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        ActivityLog(
            user_id=user.id if user else None,
            user_name=user.full_name if user else "System",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
        )
    )
