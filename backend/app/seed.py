"""Seed the database with demo users, inventory, assignments, and maintenance.

Usage (from the backend directory):
    python -m app.seed            # seed only if the database is empty
    python -m app.seed --reset    # drop everything and reseed
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine
from .models import (
    ActivityLog,
    Asset,
    Assignment,
    Category,
    Laboratory,
    MaintenanceRecord,
    User,
    utcnow,
)
from .security import hash_password


def _days(days: int) -> date:
    return date.today() + timedelta(days=days)


def _hours_ago(hours: int) -> datetime:
    return utcnow() - timedelta(hours=hours)


LABORATORIES = [
    {
        "name": "Computer Laboratory 1",
        "code": "CL-1",
        "building": "Main Building",
        "room": "201",
        "capacity": 40,
        "description": "General computing laboratory used by first-year students.",
    },
    {
        "name": "Computer Laboratory 2",
        "code": "CL-2",
        "building": "Main Building",
        "room": "202",
        "capacity": 40,
        "description": "General computing laboratory with programming workstations.",
    },
    {
        "name": "Computer Laboratory 3",
        "code": "CL-3",
        "building": "Main Building",
        "room": "203",
        "capacity": 35,
        "description": "Multimedia and design workstation laboratory.",
    },
    {
        "name": "Network Laboratory",
        "code": "NET-LAB",
        "building": "Engineering Building",
        "room": "110",
        "capacity": 24,
        "description": "Networking, servers, and infrastructure training laboratory.",
    },
    {
        "name": "Multimedia Laboratory",
        "code": "MM-LAB",
        "building": "Arts Building",
        "room": "305",
        "capacity": 30,
        "description": "Video editing, audio production, and digital arts laboratory.",
    },
    {
        "name": "Faculty Workroom",
        "code": "FAC-WORK",
        "building": "Main Building",
        "room": "105",
        "capacity": 12,
        "description": "Shared workroom for laboratory instructors and staff.",
    },
]

CATEGORIES = [
    ("Desktop Computers", "Workstations and all-in-one desktop units", "#6366f1"),
    ("Laptops", "Portable computers issued to staff and students", "#0ea5e9"),
    ("Monitors", "Displays and monitor accessories", "#8b5cf6"),
    ("Printers", "Printers, scanners, and multifunction devices", "#f59e0b"),
    ("Network Equipment", "Switches, routers, access points, and servers", "#10b981"),
    ("Peripherals", "Keyboards, mice, webcams, headsets, and adapters", "#ec4899"),
    ("Projectors", "Projectors, screens, and presentation equipment", "#ef4444"),
    ("Power Equipment", "UPS units, voltage regulators, and power strips", "#64748b"),
]

# (tag, name, category, lab, status, condition, brand, model, serial,
#  supplier, purchase_days_ago, cost, warranty_days_from_now)
ASSETS = [
    ("CL1-PC-01", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "available", "good", "Dell", "OptiPlex 7090", "DL7090-CL1-01", "PC Express", 620, 48990, 240),
    ("CL1-PC-02", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "available", "good", "Dell", "OptiPlex 7090", "DL7090-CL1-02", "PC Express", 620, 48990, 240),
    ("CL1-PC-03", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "available", "good", "Dell", "OptiPlex 7090", "DL7090-CL1-03", "PC Express", 620, 48990, 240),
    ("CL1-PC-04", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "available", "fair", "Dell", "OptiPlex 7090", "DL7090-CL1-04", "PC Express", 620, 48990, 240),
    ("CL1-PC-05", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "assigned", "good", "Dell", "OptiPlex 7090", "DL7090-CL1-05", "PC Express", 620, 48990, 240),
    ("CL1-PC-06", "Dell OptiPlex 7090 Workstation", "Desktop Computers", "CL-1", "available", "good", "Dell", "OptiPlex 7090", "DL7090-CL1-06", "PC Express", 620, 48990, 240),
    ("CL2-PC-01", "HP ProDesk 400 G7 Workstation", "Desktop Computers", "CL-2", "available", "good", "HP", "ProDesk 400 G7", "HP400G7-CL2-01", "Silicon Valley", 480, 43500, 160),
    ("CL2-PC-02", "HP ProDesk 400 G7 Workstation", "Desktop Computers", "CL-2", "available", "good", "HP", "ProDesk 400 G7", "HP400G7-CL2-02", "Silicon Valley", 480, 43500, 160),
    ("CL2-PC-03", "HP ProDesk 400 G7 Workstation", "Desktop Computers", "CL-2", "available", "fair", "HP", "ProDesk 400 G7", "HP400G7-CL2-03", "Silicon Valley", 480, 43500, 160),
    ("CL2-PC-04", "HP ProDesk 400 G7 Workstation", "Desktop Computers", "CL-2", "available", "good", "HP", "ProDesk 400 G7", "HP400G7-CL2-04", "Silicon Valley", 480, 43500, 160),
    ("CL3-PC-01", "Lenovo ThinkCentre M720q", "Desktop Computers", "CL-3", "available", "new", "Lenovo", "ThinkCentre M720q", "LN720Q-CL3-01", "Dataworld", 95, 39995, 640),
    ("CL3-PC-02", "Lenovo ThinkCentre M720q", "Desktop Computers", "CL-3", "available", "good", "Lenovo", "ThinkCentre M720q", "LN720Q-CL3-02", "Dataworld", 95, 39995, 640),
    ("CL3-PC-03", "Lenovo ThinkCentre M720q", "Desktop Computers", "CL-3", "available", "good", "Lenovo", "ThinkCentre M720q", "LN720Q-CL3-03", "Dataworld", 95, 39995, 640),
    ("CL3-PC-04", "Lenovo ThinkCentre M720q", "Desktop Computers", "CL-3", "maintenance", "poor", "Lenovo", "ThinkCentre M720q", "LN720Q-CL3-04", "Dataworld", 95, 39995, 640),
    ("OLD-PC-01", "Acer Veriton X2640G (Legacy)", "Desktop Computers", "CL-1", "retired", "damaged", "Acer", "Veriton X2640G", "AC2640-OLD-01", "PC Express", 1825, 28500, -900),
    ("OLD-PC-02", "Acer Veriton X2640G (Legacy)", "Desktop Computers", "CL-2", "retired", "poor", "Acer", "Veriton X2640G", "AC2640-OLD-02", "PC Express", 1825, 28500, -900),
    ("LAP-01", "MacBook Air M2 13-inch", "Laptops", "FAC-WORK", "available", "new", "Apple", "MacBook Air M2", "AP-MBA-M2-01", "Power Mac Center", 120, 64990, 610),
    ("LAP-02", "MacBook Air M2 13-inch", "Laptops", "FAC-WORK", "assigned", "good", "Apple", "MacBook Air M2", "AP-MBA-M2-02", "Power Mac Center", 300, 64990, 430),
    ("LAP-03", "Lenovo ThinkPad E14 Gen 4", "Laptops", "MM-LAB", "maintenance", "fair", "Lenovo", "ThinkPad E14 Gen 4", "LN-E14-03", "Dataworld", 540, 52995, 180),
    ("LAP-04", "Lenovo ThinkPad E14 Gen 4", "Laptops", "FAC-WORK", "available", "good", "Lenovo", "ThinkPad E14 Gen 4", "LN-E14-04", "Dataworld", 540, 52995, 180),
    ("LAP-05", "ASUS Vivobook 15", "Laptops", "FAC-WORK", "assigned", "good", "ASUS", "Vivobook 15 X1504", "AS-VB15-05", "Octagon", 210, 38995, 45),
    ("LAP-06", "ASUS Vivobook 15", "Laptops", "MM-LAB", "lost", "good", "ASUS", "Vivobook 15 X1504", "AS-VB15-06", "Octagon", 210, 38995, 45),
    ("MON-01", "Dell P2422H 24-inch Monitor", "Monitors", "CL-1", "available", "good", "Dell", "P2422H", "DL-P2422-01", "PC Express", 620, 10995, 240),
    ("MON-02", "Dell P2422H 24-inch Monitor", "Monitors", "CL-2", "available", "good", "Dell", "P2422H", "DL-P2422-02", "PC Express", 620, 10995, 240),
    ("MON-03", "Dell P2422H 24-inch Monitor", "Monitors", "CL-3", "available", "good", "Dell", "P2422H", "DL-P2422-03", "PC Express", 95, 10995, 640),
    ("MON-04", "LG 27MP400 27-inch Monitor", "Monitors", "MM-LAB", "assigned", "good", "LG", "27MP400", "LG-27MP-04", "Silicon Valley", 320, 12495, 410),
    ("MON-05", "LG 27MP400 27-inch Monitor", "Monitors", "MM-LAB", "available", "fair", "LG", "27MP400", "LG-27MP-05", "Silicon Valley", 320, 12495, 410),
    ("PRN-01", "Epson EcoTank L3250 Printer", "Printers", "CL-1", "available", "good", "Epson", "EcoTank L3250", "EP-L3250-01", "Octagon", 280, 13995, 60),
    ("PRN-02", "Canon imageCLASS MF3010", "Printers", "FAC-WORK", "maintenance", "poor", "Canon", "imageCLASS MF3010", "CN-MF3010-02", "Octagon", 760, 11995, -120),
    ("SW-01", "Cisco Catalyst 1000 24-Port Switch", "Network Equipment", "NET-LAB", "available", "good", "Cisco", "C1000-24T-4G-L", "CS-C1000-01", "Networld", 420, 42990, 300),
    ("SW-02", "TP-Link TL-SG1024D Switch", "Network Equipment", "NET-LAB", "available", "fair", "TP-Link", "TL-SG1024D", "TP-SG1024-02", "Octagon", 980, 8995, -180),
    ("SW-03", "Cisco Catalyst 1000 24-Port Switch", "Network Equipment", "NET-LAB", "maintenance", "good", "Cisco", "C1000-24T-4G-L", "CS-C1000-03", "Networld", 420, 42990, 300),
    ("PER-01", "Logitech MK270 Wireless Combo", "Peripherals", "CL-1", "available", "good", "Logitech", "MK270", "LG-MK270-01", "PC Express", 150, 1495, 30),
    ("PER-02", "Logitech MK270 Wireless Combo", "Peripherals", "CL-2", "available", "good", "Logitech", "MK270", "LG-MK270-02", "PC Express", 150, 1495, 30),
    ("PER-03", "Logitech C920 HD Webcam", "Peripherals", "MM-LAB", "available", "good", "Logitech", "C920", "LG-C920-03", "Silicon Valley", 240, 4295, 80),
    ("PER-04", "Jabra Evolve 20 Headset", "Peripherals", "MM-LAB", "available", "new", "Jabra", "Evolve 20", "JB-EV20-04", "Silicon Valley", 60, 3895, 670),
    ("PROJ-01", "Epson EB-X51 Projector", "Projectors", "CL-1", "available", "good", "Epson", "EB-X51", "EP-EBX51-01", "Octagon", 510, 34995, 220),
    ("PROJ-02", "Epson EB-X51 Projector", "Projectors", "MM-LAB", "assigned", "good", "Epson", "EB-X51", "EP-EBX51-02", "Octagon", 510, 34995, 220),
    ("UPS-01", "APC Back-UPS 650VA", "Power Equipment", "NET-LAB", "available", "good", "APC", "BX650LI-MS", "APC-650-01", "PC Express", 380, 4295, 350),
    ("UPS-02", "APC Back-UPS 650VA", "Power Equipment", "CL-2", "available", "good", "APC", "BX650LI-MS", "APC-650-02", "PC Express", 380, 4295, 350),
]

ASSIGNMENTS = [
    # tag, borrower, email, department, purpose, due_days, assigned_days_ago, returned_days_ago
    ("CL1-PC-05", "Prof. Ana Reyes", "ana.reyes@university.edu", "College of Computer Studies", "Faculty workstation for OS 137 consultation hours", 7, 26, None),
    ("LAP-02", "Mark Villanueva", "mark.villanueva@university.edu", "Office of the Registrar", "Off-site enrollment encoding", 2, 12, None),
    ("LAP-05", "Jasmine Lim", "jasmine.lim@university.edu", "Student Council", "Capstone project presentation", -3, 18, None),
    ("PROJ-02", "Engr. Paolo Diaz", "paolo.diaz@university.edu", "AV Services", "Weekend seminar at the auditorium", 14, 4, None),
    ("MON-04", "Karla Bautista", "karla.bautista@university.edu", "Multimedia Laboratory", "Video editing station extension display", 21, 9, None),
    ("LAP-04", "Rico Fernandez", "rico.fernandez@university.edu", "Faculty Workroom", "Accreditation document preparation", -20, 55, 32),
    ("MON-05", "Bea Navarro", "bea.navarro@university.edu", "Multimedia Laboratory", "Short film color grading", -5, 40, 12),
    ("PER-01", "John Paul Garcia", "jp.garcia@university.edu", "Computer Laboratory 1", "Replacement for defective keyboard", -10, 48, 33),
]

MAINTENANCE = [
    # tag, title, type, status, scheduled_days, completed_days, cost, performed_by, description
    ("LAP-03", "Battery replacement and thermal repaste", "corrective", "in_progress", -1, None, 3500, "Dataworld Service Center", "Battery health dropped below 60%; unit shuts down without warning."),
    ("PRN-02", "Paper feed roller replacement", "corrective", "scheduled", 3, None, 1800, "Octagon Service Desk", "Frequent paper jams on tray 1 and garbled output."),
    ("SW-03", "Firmware upgrade and VLAN audit", "preventive", "scheduled", 10, None, 0, "Networld Engineer", "Scheduled firmware upgrade to the latest stable release."),
    ("CL3-PC-04", "No display / GPU diagnostics", "corrective", "scheduled", 1, None, 2500, "Dataworld Service Center", "Workstation powers on but produces no display output."),
    ("CL1-PC-06", "Motherboard capacitor replacement", "corrective", "completed", -14, -10, 2800, "PC Express Repair", "Replaced three bulging capacitors near the VRM."),
    ("PROJ-01", "Lamp module inspection", "inspection", "completed", -40, -38, 0, "AV Services", "Routine lamp hour inspection; lamp is within safe range."),
    ("MON-03", "Dead pixel inspection", "inspection", "cancelled", -25, None, 0, "PC Express", "Cancelled after the unit was replaced under warranty."),
]


def seed_database(db: Session, reset: bool = False) -> bool:
    existing_users = db.scalar(select(func.count(User.id))) or 0
    if existing_users and not reset:
        return False

    if reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    admin = User(
        full_name="Alex Morgan",
        email="admin@labassets.edu",
        password_hash=hash_password(settings.admin_password),
        role="admin",
        is_active=True,
        last_login_at=_hours_ago(1),
        created_at=_hours_ago(24 * 120),
    )
    technician = User(
        full_name="Jamie Rivera",
        email="tech@labassets.edu",
        password_hash=hash_password(settings.demo_password),
        role="technician",
        is_active=True,
        last_login_at=_hours_ago(3),
        created_at=_hours_ago(24 * 100),
    )
    viewer = User(
        full_name="Sam Chen",
        email="viewer@labassets.edu",
        password_hash=hash_password(settings.demo_password),
        role="viewer",
        is_active=True,
        last_login_at=_hours_ago(26),
        created_at=_hours_ago(24 * 80),
    )
    instructor = User(
        full_name="Prof. Ana Reyes",
        email="ana.reyes@labassets.edu",
        password_hash=hash_password(settings.demo_password),
        role="technician",
        is_active=True,
        last_login_at=_hours_ago(50),
        created_at=_hours_ago(24 * 60),
    )
    db.add_all([admin, technician, viewer, instructor])
    db.flush()

    labs: dict[str, Laboratory] = {}
    for lab_data in LABORATORIES:
        lab = Laboratory(**lab_data)
        db.add(lab)
        labs[lab.code] = lab

    categories: dict[str, Category] = {}
    for name, description, color in CATEGORIES:
        category = Category(name=name, description=description, color=color)
        db.add(category)
        categories[name] = category

    db.flush()

    assets: dict[str, Asset] = {}
    for (
        tag,
        name,
        category_name,
        lab_code,
        asset_status,
        condition,
        brand,
        model,
        serial,
        supplier,
        purchase_days_ago,
        cost,
        warranty_days,
    ) in ASSETS:
        asset = Asset(
            asset_tag=tag,
            name=name,
            description=f"{brand} {model} assigned to {labs[lab_code].name}.",
            category_id=categories[category_name].id,
            laboratory_id=labs[lab_code].id,
            status=asset_status,
            condition=condition,
            brand=brand,
            model=model,
            serial_number=serial,
            supplier=supplier,
            purchase_date=_days(-purchase_days_ago),
            purchase_cost=float(cost),
            warranty_expiry=_days(warranty_days),
            created_by=admin.id,
            created_at=_hours_ago(24 * max(1, purchase_days_ago // 10)),
            updated_at=_hours_ago(12),
        )
        db.add(asset)
        assets[tag] = asset

    db.flush()

    for (
        tag,
        borrower,
        email,
        department,
        purpose,
        due_days,
        assigned_days_ago,
        returned_days_ago,
    ) in ASSIGNMENTS:
        assignment = Assignment(
            asset_id=assets[tag].id,
            borrower_name=borrower,
            borrower_email=email,
            department=department,
            purpose=purpose,
            assigned_by=technician.id,
            assigned_at=_hours_ago(24 * assigned_days_ago),
            due_date=_days(due_days),
            returned_at=(
                _hours_ago(24 * returned_days_ago)
                if returned_days_ago is not None
                else None
            ),
            notes="Demo assignment record.",
        )
        db.add(assignment)

    for (
        tag,
        title,
        maintenance_type,
        maintenance_status,
        scheduled_days,
        completed_days,
        cost,
        performed_by,
        description,
    ) in MAINTENANCE:
        record = MaintenanceRecord(
            asset_id=assets[tag].id,
            title=title,
            description=description,
            maintenance_type=maintenance_type,
            status=maintenance_status,
            scheduled_date=_days(scheduled_days),
            completed_date=_days(completed_days) if completed_days is not None else None,
            cost=float(cost) if cost else 0.0,
            performed_by=performed_by,
            created_by=technician.id,
            created_at=_hours_ago(24 * max(1, abs(scheduled_days))),
            updated_at=_hours_ago(24 * 2),
        )
        db.add(record)

    # A few readable entries for the activity feed.
    activity = [
        (admin, "login", "user", admin.id, "Signed in to the system", 1),
        (technician, "assign", "asset", assets["LAP-05"].id, "Assigned LAP-05 to Jasmine Lim", 2),
        (technician, "update", "maintenance", None, "Updated maintenance for LAP-03: battery replacement", 5),
        (admin, "create", "asset", assets["PER-04"].id, "Added PER-04 — Jabra Evolve 20 Headset", 8),
        (technician, "return", "asset", assets["MON-05"].id, "Bea Navarro returned MON-05", 12),
        (admin, "update", "user", instructor.id, "Updated user ana.reyes@labassets.edu", 22),
        (technician, "create", "maintenance", None, "Logged maintenance for PRN-02: paper feed roller replacement", 30),
        (viewer, "login", "user", viewer.id, "Signed in to the system", 26),
        (admin, "create", "laboratory", labs["MM-LAB"].id, "Created Multimedia Laboratory", 60),
        (technician, "assign", "asset", assets["PROJ-02"].id, "Assigned PROJ-02 to Engr. Paolo Diaz", 96),
    ]
    for user, action, entity_type, entity_id, detail, hours in activity:
        db.add(
            ActivityLog(
                user_id=user.id,
                user_name=user.full_name,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                detail=detail,
                created_at=_hours_ago(hours),
            )
        )

    db.commit()
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the LabAssets database")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all tables and recreate them before seeding",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seeded = seed_database(db, reset=args.reset)
    if seeded:
        print("Database seeded successfully.")
        print(f"  Admin:      admin@labassets.edu / {settings.admin_password}")
        print(f"  Technician: tech@labassets.edu / {settings.demo_password}")
        print(f"  Viewer:     viewer@labassets.edu / {settings.demo_password}")
    else:
        print("Database already contains users; nothing was changed.")
        print("Run with --reset to drop and reseed.")


if __name__ == "__main__":
    main()
