"""Reporting endpoints, including CSV exports."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Asset,
    Assignment,
    Category,
    Laboratory,
    MaintenanceRecord,
    utcnow,
)
from ..schemas import NamedCount, ReportSummary
from ..services import (
    to_asset_out,
    to_assignment_out,
    to_maintenance_out,
)
from .dashboard import build_totals

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user)],
)


def _csv_response(filename: str, header: list[str], rows: list[list]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    writer.writerows(rows)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary", response_model=ReportSummary)
def report_summary(db: Session = Depends(get_db)) -> ReportSummary:
    totals = build_totals(db)

    status_rows = dict(
        db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status)).all()
    )
    condition_rows = dict(
        db.execute(
            select(Asset.condition, func.count(Asset.id)).group_by(Asset.condition)
        ).all()
    )
    category_rows = db.execute(
        select(Category.name, Category.color, func.count(Asset.id))
        .select_from(Asset)
        .outerjoin(Category, Asset.category_id == Category.id)
        .group_by(Category.name, Category.color)
        .order_by(func.count(Asset.id).desc())
    ).all()
    lab_rows = db.execute(
        select(Laboratory.name, func.count(Asset.id))
        .select_from(Asset)
        .outerjoin(Laboratory, Asset.laboratory_id == Laboratory.id)
        .group_by(Laboratory.name)
        .order_by(func.count(Asset.id).desc())
    ).all()
    maintenance_rows = dict(
        db.execute(
            select(MaintenanceRecord.status, func.count(MaintenanceRecord.id)).group_by(
                MaintenanceRecord.status
            )
        ).all()
    )

    top_assets = list(
        db.scalars(
            select(Asset)
            .where(Asset.purchase_cost.is_not(None))
            .options(
                joinedload(Asset.category),
                joinedload(Asset.laboratory),
                selectinload(Asset.assignments),
                selectinload(Asset.maintenance_records),
            )
            .order_by(Asset.purchase_cost.desc())
            .limit(5)
        )
        .unique()
        .all()
    )
    maintenance_cost = db.scalar(
        select(func.coalesce(func.sum(MaintenanceRecord.cost), 0)).where(
            MaintenanceRecord.status == "completed"
        )
    )

    return ReportSummary(
        generated_at=utcnow(),
        totals=totals,
        by_status=[
            NamedCount(label=status, value=status_rows.get(status, 0))
            for status in ("available", "assigned", "maintenance", "retired", "lost")
        ],
        by_condition=[
            NamedCount(label=condition, value=condition_rows.get(condition, 0))
            for condition in ("new", "good", "fair", "poor", "damaged")
        ],
        by_category=[
            NamedCount(label=name or "Uncategorized", value=count, color=color or "#94a3b8")
            for name, color, count in category_rows
        ],
        by_laboratory=[
            NamedCount(label=name or "Unassigned", value=count) for name, count in lab_rows
        ],
        top_value_assets=[to_asset_out(asset) for asset in top_assets],
        maintenance_cost=float(maintenance_cost or 0),
        maintenance_by_status=[
            NamedCount(label=status, value=maintenance_rows.get(status, 0))
            for status in ("scheduled", "in_progress", "completed", "cancelled")
        ],
    )


@router.get("/assets.csv")
def export_assets(db: Session = Depends(get_db)) -> StreamingResponse:
    assets = list(
        db.scalars(
            select(Asset)
            .options(
                joinedload(Asset.category),
                joinedload(Asset.laboratory),
                selectinload(Asset.assignments).joinedload(Assignment.assigned_by_user),
                selectinload(Asset.maintenance_records),
            )
            .order_by(Asset.asset_tag)
        )
        .unique()
        .all()
    )
    rows = []
    for asset in assets:
        out = to_asset_out(asset)
        rows.append(
            [
                out.asset_tag,
                out.name,
                out.category_name or "",
                out.laboratory_name or "",
                out.status,
                out.condition,
                out.brand or "",
                out.model or "",
                out.serial_number or "",
                out.supplier or "",
                str(out.purchase_date or ""),
                f"{out.purchase_cost:.2f}" if out.purchase_cost is not None else "",
                str(out.warranty_expiry or ""),
                out.active_assignment.borrower_name if out.active_assignment else "",
                out.active_assignment.department if out.active_assignment else "",
            ]
        )
    return _csv_response(
        "assets.csv",
        [
            "Asset Tag",
            "Name",
            "Category",
            "Laboratory",
            "Status",
            "Condition",
            "Brand",
            "Model",
            "Serial Number",
            "Supplier",
            "Purchase Date",
            "Purchase Cost",
            "Warranty Expiry",
            "Assigned To",
            "Department",
        ],
        rows,
    )


@router.get("/assignments.csv")
def export_assignments(db: Session = Depends(get_db)) -> StreamingResponse:
    assignments = list(
        db.scalars(
            select(Assignment)
            .options(
                joinedload(Assignment.asset),
                joinedload(Assignment.assigned_by_user),
            )
            .order_by(Assignment.assigned_at.desc())
        )
        .unique()
        .all()
    )
    rows = []
    for item in assignments:
        out = to_assignment_out(item)
        rows.append(
            [
                out.asset_tag or "",
                out.asset_name or "",
                out.borrower_name,
                out.borrower_email or "",
                out.department or "",
                out.purpose or "",
                out.assigned_by_name or "",
                out.assigned_at.strftime("%Y-%m-%d %H:%M"),
                str(out.due_date or ""),
                out.returned_at.strftime("%Y-%m-%d %H:%M") if out.returned_at else "",
                out.status,
            ]
        )
    return _csv_response(
        "assignments.csv",
        [
            "Asset Tag",
            "Asset Name",
            "Borrower",
            "Email",
            "Department",
            "Purpose",
            "Issued By",
            "Assigned At",
            "Due Date",
            "Returned At",
            "Status",
        ],
        rows,
    )


@router.get("/maintenance.csv")
def export_maintenance(db: Session = Depends(get_db)) -> StreamingResponse:
    records = list(
        db.scalars(
            select(MaintenanceRecord)
            .options(joinedload(MaintenanceRecord.asset))
            .order_by(MaintenanceRecord.created_at.desc())
        )
        .unique()
        .all()
    )
    rows = []
    for item in records:
        out = to_maintenance_out(item)
        rows.append(
            [
                out.asset_tag or "",
                out.asset_name or "",
                out.title,
                out.maintenance_type,
                out.status,
                str(out.scheduled_date or ""),
                str(out.completed_date or ""),
                out.performed_by or "",
                f"{out.cost:.2f}" if out.cost is not None else "",
                out.description or "",
            ]
        )
    return _csv_response(
        "maintenance.csv",
        [
            "Asset Tag",
            "Asset Name",
            "Title",
            "Type",
            "Status",
            "Scheduled Date",
            "Completed Date",
            "Performed By",
            "Cost",
            "Description",
        ],
        rows,
    )
