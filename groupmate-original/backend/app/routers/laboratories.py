"""Laboratory endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin, require_writer
from ..models import Asset, Laboratory, User
from ..schemas import (
    LaboratoryCreate,
    LaboratoryOut,
    LaboratoryUpdate,
    Message,
)
from ..services import log_activity

router = APIRouter(
    prefix="/laboratories",
    tags=["laboratories"],
    dependencies=[Depends(get_current_user)],
)


def _to_out(lab: Laboratory, asset_count: int = 0) -> LaboratoryOut:
    data = LaboratoryOut.model_validate(lab)
    data.asset_count = asset_count
    return data


def _get_lab(db: Session, lab_id: int) -> Laboratory:
    lab = db.get(Laboratory, lab_id)
    if lab is None:
        raise HTTPException(status_code=404, detail="Laboratory not found")
    return lab


def _asset_count(db: Session, lab_id: int) -> int:
    return db.scalar(select(func.count(Asset.id)).where(Asset.laboratory_id == lab_id)) or 0


@router.get("", response_model=list[LaboratoryOut])
def list_laboratories(q: str | None = None, db: Session = Depends(get_db)):
    query = (
        select(Laboratory, func.count(Asset.id))
        .outerjoin(Asset, Asset.laboratory_id == Laboratory.id)
        .group_by(Laboratory.id)
        .order_by(Laboratory.name)
    )
    if q:
        like = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(Laboratory.name).like(like),
                func.lower(Laboratory.code).like(like),
                func.lower(func.coalesce(Laboratory.building, "")).like(like),
            )
        )
    return [_to_out(lab, count) for lab, count in db.execute(query).all()]


@router.post("", response_model=LaboratoryOut, status_code=201)
def create_laboratory(
    payload: LaboratoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> LaboratoryOut:
    duplicate = db.scalar(
        select(Laboratory).where(
            or_(
                func.lower(Laboratory.name) == payload.name.lower(),
                func.lower(Laboratory.code) == payload.code.lower(),
            )
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A laboratory with that name or code already exists",
        )
    lab = Laboratory(**payload.model_dump())
    lab.name = lab.name.strip()
    lab.code = lab.code.strip().upper()
    db.add(lab)
    db.flush()
    log_activity(db, user, "create", "laboratory", lab.id, f"Created {lab.name}")
    db.commit()
    db.refresh(lab)
    return _to_out(lab, 0)


@router.patch("/{lab_id}", response_model=LaboratoryOut)
def update_laboratory(
    lab_id: int,
    payload: LaboratoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
) -> LaboratoryOut:
    lab = _get_lab(db, lab_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("name") or data.get("code"):
        name = data.get("name", lab.name)
        code = data.get("code", lab.code)
        duplicate = db.scalar(
            select(Laboratory).where(
                Laboratory.id != lab.id,
                or_(
                    func.lower(Laboratory.name) == name.lower(),
                    func.lower(Laboratory.code) == code.lower(),
                ),
            )
        )
        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="A laboratory with that name or code already exists",
            )
    if data.get("code"):
        data["code"] = data["code"].strip().upper()
    for key, value in data.items():
        setattr(lab, key, value)
    log_activity(db, user, "update", "laboratory", lab.id, f"Updated {lab.name}")
    db.commit()
    db.refresh(lab)
    return _to_out(lab, _asset_count(db, lab.id))


@router.delete("/{lab_id}", response_model=Message)
def delete_laboratory(
    lab_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> Message:
    lab = _get_lab(db, lab_id)
    count = _asset_count(db, lab.id)
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"This laboratory still has {count} asset(s). Reassign them first.",
        )
    name = lab.name
    db.delete(lab)
    log_activity(db, user, "delete", "laboratory", lab_id, f"Deleted {name}")
    db.commit()
    return Message(message="Laboratory deleted")
