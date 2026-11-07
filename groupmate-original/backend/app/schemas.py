"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["admin", "technician", "viewer"]
AssetStatus = Literal["available", "assigned", "maintenance", "retired", "lost"]
AssetCondition = Literal["new", "good", "fair", "poor", "damaged"]
MaintenanceType = Literal["preventive", "corrective", "inspection", "upgrade"]
MaintenanceStatus = Literal["scheduled", "in_progress", "completed", "cancelled"]
AssignmentStatus = Literal["active", "returned", "overdue"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth/users
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    role: Role
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = "viewer"
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: Role | None = None
    is_active: bool | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


# ------------------------------------------------------------ laboratories
class LaboratoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=30)
    building: str | None = None
    room: str | None = None
    capacity: int | None = Field(default=None, ge=0)
    description: str | None = None


class LaboratoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=2, max_length=30)
    building: str | None = None
    room: str | None = None
    capacity: int | None = Field(default=None, ge=0)
    description: str | None = None


class LaboratoryOut(ORMModel):
    id: int
    name: str
    code: str
    building: str | None = None
    room: str | None = None
    capacity: int | None = None
    description: str | None = None
    asset_count: int = 0
    created_at: datetime


# ---------------------------------------------------------------- categories
class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    color: str = Field(default="#6366f1", max_length=20)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    color: str | None = Field(default=None, max_length=20)


class CategoryOut(ORMModel):
    id: int
    name: str
    description: str | None = None
    color: str
    asset_count: int = 0
    created_at: datetime


# -------------------------------------------------------------------- assets
class AssetCreate(BaseModel):
    asset_tag: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    description: str | None = None
    category_id: int | None = None
    laboratory_id: int | None = None
    status: AssetStatus = "available"
    condition: AssetCondition = "good"
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    supplier: str | None = None
    purchase_date: date | None = None
    purchase_cost: float | None = Field(default=None, ge=0)
    warranty_expiry: date | None = None
    notes: str | None = None


class AssetUpdate(BaseModel):
    asset_tag: str | None = Field(default=None, min_length=1, max_length=40)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    category_id: int | None = None
    laboratory_id: int | None = None
    status: AssetStatus | None = None
    condition: AssetCondition | None = None
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    supplier: str | None = None
    purchase_date: date | None = None
    purchase_cost: float | None = Field(default=None, ge=0)
    warranty_expiry: date | None = None
    notes: str | None = None


class AssignmentOut(ORMModel):
    id: int
    asset_id: int
    asset_tag: str | None = None
    asset_name: str | None = None
    borrower_name: str
    borrower_email: str | None = None
    department: str | None = None
    purpose: str | None = None
    assigned_by: int | None = None
    assigned_by_name: str | None = None
    assigned_at: datetime
    due_date: date | None = None
    returned_at: datetime | None = None
    notes: str | None = None
    status: AssignmentStatus = "active"


class MaintenanceOut(ORMModel):
    id: int
    asset_id: int
    asset_tag: str | None = None
    asset_name: str | None = None
    title: str
    description: str | None = None
    maintenance_type: MaintenanceType
    status: MaintenanceStatus
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: float | None = None
    performed_by: str | None = None
    notes: str | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime


class AssetOut(ORMModel):
    id: int
    asset_tag: str
    name: str
    description: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    category_color: str | None = None
    laboratory_id: int | None = None
    laboratory_name: str | None = None
    status: AssetStatus
    condition: AssetCondition
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    supplier: str | None = None
    purchase_date: date | None = None
    purchase_cost: float | None = None
    warranty_expiry: date | None = None
    notes: str | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    active_assignment: AssignmentOut | None = None
    open_maintenance_count: int = 0


class AssignmentCreate(BaseModel):
    asset_id: int
    borrower_name: str = Field(min_length=2, max_length=120)
    borrower_email: str | None = None
    department: str | None = None
    purpose: str | None = None
    due_date: date | None = None
    notes: str | None = None


class AssignmentUpdate(BaseModel):
    borrower_name: str | None = Field(default=None, min_length=2, max_length=120)
    borrower_email: str | None = None
    department: str | None = None
    purpose: str | None = None
    due_date: date | None = None
    notes: str | None = None


class MaintenanceCreate(BaseModel):
    asset_id: int
    title: str = Field(min_length=2, max_length=160)
    description: str | None = None
    maintenance_type: MaintenanceType = "corrective"
    status: MaintenanceStatus = "scheduled"
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: float | None = Field(default=None, ge=0)
    performed_by: str | None = None
    notes: str | None = None


class MaintenanceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    maintenance_type: MaintenanceType | None = None
    status: MaintenanceStatus | None = None
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: float | None = Field(default=None, ge=0)
    performed_by: str | None = None
    notes: str | None = None


# ---------------------------------------------------------------- pagination
class PageBase(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int


class AssetPage(PageBase):
    items: list[AssetOut]


class AssignmentPage(PageBase):
    items: list[AssignmentOut]


class MaintenancePage(PageBase):
    items: list[MaintenanceOut]


# --------------------------------------------------------- dashboard/reports
class NamedCount(BaseModel):
    label: str
    value: int
    color: str | None = None


class ActivityOut(ORMModel):
    id: int
    user_id: int | None = None
    user_name: str
    action: str
    entity_type: str
    entity_id: int | None = None
    detail: str | None = None
    created_at: datetime


class DashboardTotals(BaseModel):
    assets: int
    available: int
    assigned: int
    maintenance: int
    retired: int
    lost: int
    laboratories: int
    categories: int
    users: int
    active_assignments: int
    open_maintenance: int
    total_value: float


class DashboardOut(BaseModel):
    totals: DashboardTotals
    assets_by_status: list[NamedCount]
    assets_by_category: list[NamedCount]
    assets_by_laboratory: list[NamedCount]
    recent_activity: list[ActivityOut]
    upcoming_maintenance: list[MaintenanceOut]
    warranty_expiring: list[AssetOut]


class ReportSummary(BaseModel):
    generated_at: datetime
    totals: DashboardTotals
    by_status: list[NamedCount]
    by_condition: list[NamedCount]
    by_category: list[NamedCount]
    by_laboratory: list[NamedCount]
    top_value_assets: list[AssetOut]
    maintenance_cost: float
    maintenance_by_status: list[NamedCount]


class Message(BaseModel):
    message: str
