"""Rebuild schema.sql deterministically. Python is a development tool only."""
from pathlib import Path

tables = []
def table(name, body):
    tables.append(f"CREATE TABLE {name} (\n  " + ",\n  ".join(body) + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n")
def ref(column, target, nullable=False):
    return [f"{column} BIGINT UNSIGNED {'NULL' if nullable else 'NOT NULL'}", f"FOREIGN KEY ({column}) REFERENCES {target}(id) ON DELETE RESTRICT"]
pk = 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY'
created = 'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
updated = 'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
active = 'is_active BOOLEAN NOT NULL DEFAULT TRUE'

table('schema_versions', ['version VARCHAR(20) PRIMARY KEY', 'installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'])
for name in ['roles', 'permissions', 'departments', 'asset_categories', 'asset_conditions', 'asset_statuses', 'suppliers', 'fund_sources']:
    table(name, [pk, 'name VARCHAR(150) NOT NULL UNIQUE', 'description TEXT NULL', active, created])
table('role_permissions', ref('role_id', 'roles') + ref('permission_id', 'permissions') + ['PRIMARY KEY (role_id, permission_id)'])
table('users', [pk, 'university_id VARCHAR(100) NOT NULL UNIQUE', 'first_name VARCHAR(100) NOT NULL', 'last_name VARCHAR(100) NOT NULL', 'email VARCHAR(254) NOT NULL UNIQUE', 'password_hash VARCHAR(255) NOT NULL'] + ref('role_id', 'roles') + ref('department_id', 'departments', True) + [active, 'last_login_at DATETIME NULL', 'password_changed_at DATETIME NULL', created, updated])
table('laboratories', [pk, 'code VARCHAR(50) NOT NULL UNIQUE', 'name VARCHAR(150) NOT NULL'] + ref('department_id', 'departments') + ref('administrator_id', 'users', True) + ['building VARCHAR(150) NOT NULL', 'room_number VARCHAR(50) NOT NULL', active, created, updated])
table('user_laboratories', ref('user_id', 'users') + ref('laboratory_id', 'laboratories') + ['PRIMARY KEY (user_id, laboratory_id)'])
table('workstations', [pk, 'code VARCHAR(100) NOT NULL UNIQUE'] + ref('laboratory_id', 'laboratories') + ['description TEXT NULL', active, created, updated])
table('assets', [pk, 'public_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE', 'property_number VARCHAR(150) NOT NULL UNIQUE', 'item_name VARCHAR(200) NOT NULL', 'description TEXT NOT NULL', 'brand VARCHAR(100) NULL', 'model VARCHAR(150) NULL', 'serial_number VARCHAR(150) NULL UNIQUE', 'specifications TEXT NULL'] + ref('category_id', 'asset_categories') + ref('condition_id', 'asset_conditions') + ref('status_id', 'asset_statuses') + ref('department_id', 'departments') + ref('laboratory_id', 'laboratories', True) + ref('custodian_id', 'users', True) + ref('supplier_id', 'suppliers', True) + ref('fund_source_id', 'fund_sources', True) + ['acquisition_date DATE NOT NULL', 'purchase_order_number VARCHAR(150) NULL', 'acquisition_cost DECIMAL(15,2) NOT NULL', 'sticker_location VARCHAR(255) NULL', 'sticker_end_user VARCHAR(255) NULL', 'is_borrowable BOOLEAN NOT NULL DEFAULT FALSE', 'archived_at DATETIME NULL', 'CHECK (acquisition_cost >= 0)', "CHECK (serial_number IS NULL OR CHAR_LENGTH(TRIM(serial_number)) > 0)", 'INDEX idx_asset_location (laboratory_id, archived_at)', 'INDEX idx_asset_status (status_id, is_borrowable)', 'INDEX idx_asset_acquisition (acquisition_date)', created, updated])
table('workstation_assets', ref('workstation_id', 'workstations') + ref('asset_id', 'assets') + ['PRIMARY KEY (workstation_id, asset_id)', 'UNIQUE (asset_id)', created])
table('warranties', [pk] + ref('asset_id', 'assets') + ['provider VARCHAR(200) NOT NULL', 'starts_on DATE NOT NULL', 'expires_on DATE NOT NULL', 'terms TEXT NULL', 'CHECK (expires_on >= starts_on)', 'INDEX (expires_on)', created])
for name in ['asset_photos', 'property_tag_photos']:
    table(name, [pk] + ref('asset_id', 'assets') + ref('uploaded_by', 'users') + ['storage_key VARCHAR(255) NOT NULL UNIQUE', 'original_name VARCHAR(255) NOT NULL', 'mime_type VARCHAR(100) NOT NULL', 'size_bytes BIGINT UNSIGNED NOT NULL', created])
table('borrow_requests', [pk] + ref('borrower_id', 'users') + ['purpose TEXT NOT NULL', 'requested_at DATETIME NOT NULL', 'expected_return_at DATETIME NOT NULL', "status ENUM('Pending','Approved','Rejected','Released','Partially Returned','Returned','Cancelled') NOT NULL DEFAULT 'Pending'", 'decision_remarks TEXT NULL'] + ref('reviewed_by', 'users', True) + ref('released_by', 'users', True) + ['reviewed_at DATETIME NULL', 'released_at DATETIME NULL', 'CHECK (expected_return_at > requested_at)', 'INDEX idx_loan_deadline (status, expected_return_at)', created, updated])
table('borrow_items', [pk] + ref('borrow_request_id', 'borrow_requests') + ref('asset_id', 'assets') + ['returned_at DATETIME NULL'] + ref('returned_condition_id', 'asset_conditions', True) + ref('received_by', 'users', True) + ['remarks TEXT NULL', 'UNIQUE (borrow_request_id, asset_id)', created])
# A shared reservation table enforces mutual exclusion across all asset workflows.
table('asset_transaction_locks', ref('asset_id', 'assets') + ["operation ENUM('Borrow','Maintenance','Transfer','Disposal') NOT NULL", 'operation_id BIGINT UNSIGNED NOT NULL', 'PRIMARY KEY (asset_id)', created])
table('maintenance_requests', [pk] + ref('asset_id', 'assets') + ref('reported_by', 'users') + ref('technician_id', 'users', True) + ['problem_description TEXT NOT NULL', "priority ENUM('Low','Normal','High','Critical') NOT NULL DEFAULT 'Normal'", "status ENUM('Reported','Pending Inspection','Assigned','Under Maintenance','Under Repair','Repaired','Beyond Repair','Closed') NOT NULL DEFAULT 'Reported'", 'inspection_findings TEXT NULL', 'closed_at DATETIME NULL', 'INDEX (status, technician_id)', created, updated])
table('maintenance_records', [pk] + ref('maintenance_request_id', 'maintenance_requests') + ref('technician_id', 'users') + ['activity TEXT NOT NULL', 'repair_date DATE NOT NULL', 'repair_cost DECIMAL(15,2) NOT NULL DEFAULT 0', 'remarks TEXT NULL', 'CHECK (repair_cost >= 0)', created])
table('asset_transfers', [pk] + ref('asset_id', 'assets') + ref('source_laboratory_id', 'laboratories', True) + ref('destination_laboratory_id', 'laboratories') + ref('requested_by', 'users') + ref('authorized_personnel_id', 'users') + ref('reviewed_by', 'users', True) + ref('confirmed_by', 'users', True) + ['reason TEXT NOT NULL', 'transfer_date DATE NOT NULL', "status ENUM('Pending','Approved','Rejected','Confirmed','Cancelled') NOT NULL DEFAULT 'Pending'", 'reviewed_at DATETIME NULL', 'confirmed_at DATETIME NULL', 'CHECK (source_laboratory_id IS NULL OR source_laboratory_id <> destination_laboratory_id)', created, updated])
table('inventory_audits', [pk] + ref('laboratory_id', 'laboratories') + ref('created_by', 'users') + ref('reviewed_by', 'users', True) + ['name VARCHAR(200) NOT NULL', 'scheduled_date DATE NOT NULL', "status ENUM('Open','Under Review','Completed','Cancelled') NOT NULL DEFAULT 'Open'", 'completed_at DATETIME NULL', 'remarks TEXT NULL', created, updated])
table('inventory_audit_items', [pk] + ref('inventory_audit_id', 'inventory_audits') + ref('asset_id', 'assets') + ref('expected_laboratory_id', 'laboratories') + ref('observed_laboratory_id', 'laboratories', True) + ref('inspector_id', 'users', True) + ['property_number_snapshot VARCHAR(150) NOT NULL', "status ENUM('Not Yet Inspected','Verified','Missing','Location Mismatch','Record Mismatch') NOT NULL DEFAULT 'Not Yet Inspected'", 'inspected_at DATETIME NULL', 'remarks TEXT NULL', 'UNIQUE (inventory_audit_id, asset_id)', created, updated])
table('asset_disposals', [pk] + ref('asset_id', 'assets') + ref('requested_by', 'users') + ref('condition_id', 'asset_conditions') + ref('authorized_personnel_id', 'users') + ref('approved_by', 'users', True) + ['reason TEXT NOT NULL', 'disposal_date DATE NOT NULL', "status ENUM('Pending','Approved','Rejected','Completed','Cancelled') NOT NULL DEFAULT 'Pending'", 'approved_at DATETIME NULL', 'completed_at DATETIME NULL', created, updated])
table('attachments', [pk] + ref('asset_id', 'assets') + ref('uploaded_by', 'users') + ref('maintenance_request_id', 'maintenance_requests', True) + ref('borrow_item_id', 'borrow_items', True) + ref('disposal_id', 'asset_disposals', True) + ['storage_key VARCHAR(255) NOT NULL UNIQUE', 'original_name VARCHAR(255) NOT NULL', 'mime_type VARCHAR(100) NOT NULL', 'size_bytes BIGINT UNSIGNED NOT NULL', created])
table('asset_history', [pk] + ref('asset_id', 'assets') + ref('actor_id', 'users') + ['event VARCHAR(100) NOT NULL', 'previous_values JSON NULL', 'updated_values JSON NOT NULL', 'INDEX (asset_id, created_at)', created])
table('notifications', [pk] + ref('user_id', 'users') + ['type VARCHAR(100) NOT NULL', 'message VARCHAR(500) NOT NULL', 'related_module VARCHAR(50) NOT NULL', 'related_record_id BIGINT UNSIGNED NULL', 'deduplication_key VARCHAR(191) NULL UNIQUE', 'read_at DATETIME NULL', 'INDEX (user_id, read_at, created_at)', created])
table('activity_logs', [pk] + ref('user_id', 'users', True) + ['action VARCHAR(100) NOT NULL', 'module VARCHAR(100) NOT NULL', 'affected_record_id BIGINT UNSIGNED NULL', 'previous_values JSON NULL', 'updated_values JSON NULL', 'ip_address VARCHAR(45) NULL', 'INDEX (module, affected_record_id, created_at)', created])
table('system_settings', ['setting_key VARCHAR(100) PRIMARY KEY', 'setting_value JSON NOT NULL'] + ref('updated_by', 'users', True) + [updated])
table('password_reset_tokens', [pk] + ref('user_id', 'users') + ['token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE', 'expires_at DATETIME NOT NULL', 'used_at DATETIME NULL', created])
table('login_attempts', [pk, 'identifier_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL', 'ip_address VARCHAR(45) NOT NULL', 'succeeded BOOLEAN NOT NULL DEFAULT FALSE', 'INDEX (identifier_hash, created_at)', 'INDEX (ip_address, created_at)', created])

header = '-- CLAMS schema 001. MySQL 8.0.16+ only. Import into an EMPTY clams_db on Ubuntu.\n-- DDL auto-commits: take a backup before deployment; do not rerun against production.\nSET NAMES utf8mb4;\nSET time_zone = \'+00:00\';\n\n'
footer = "\nINSERT INTO schema_versions (version) VALUES ('001');\n"
Path(__file__).with_name('schema.sql').write_text(header + '\n'.join(tables) + footer, encoding='utf-8')

def values(names):
    return ',\n'.join("('" + n.replace("'", "''") + "')" for n in names)
seed = '-- REQUIRED reference data only. No users, assets, or fabricated transactions.\nSTART TRANSACTION;\n'
for name, names in {
    'roles': ['Super Administrator', 'Property Administrator', 'Laboratory Administrator', 'IT Personnel', 'Faculty', 'Student'],
    'asset_conditions': ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Unusable'],
    'asset_statuses': ['Available', 'Assigned', 'Borrowed', 'Reserved', 'Under Inspection', 'Under Maintenance', 'Under Repair', 'Missing', 'Disposed'],
    'permissions': ['assets.read', 'assets.write', 'laboratories.manage', 'workstations.manage', 'borrowing.request', 'borrowing.manage', 'maintenance.request', 'maintenance.manage', 'transfers.manage', 'audits.manage', 'reports.read', 'users.manage', 'settings.manage', 'logs.read', 'backups.manage', 'disposals.manage'],
}.items():
    seed += f'INSERT INTO {name} (name) VALUES\n{values(names)};\n'
grants = {
    'Super Administrator': ['*'],
    'Property Administrator': ['assets.read','assets.write','transfers.manage','audits.manage','reports.read','disposals.manage'],
    'Laboratory Administrator': ['assets.read','workstations.manage','borrowing.manage','maintenance.request','audits.manage','reports.read'],
    'IT Personnel': ['assets.read','maintenance.request','maintenance.manage'],
    'Faculty': ['assets.read','borrowing.request','maintenance.request'],
    'Student': ['assets.read','borrowing.request'],
}
for role, permissions in grants.items():
    condition = '' if permissions == ['*'] else ' AND p.name IN (' + ','.join("'"+x+"'" for x in permissions) + ')'
    seed += f"INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = '{role}'{condition};\n"
seed += 'COMMIT;\n'
Path(__file__).with_name('seed.sql').write_text(seed, encoding='utf-8')

excluded = {'schema_versions', 'role_permissions', 'activity_logs', 'asset_history', 'login_attempts'}
import re
names = [re.search(r'CREATE TABLE (\w+)', definition).group(1) for definition in tables]
grants_path = Path(__file__).parent.parent / 'deploy/ubuntu/runtime-update-grants.sql'
grants_path.parent.mkdir(parents=True, exist_ok=True)
grants_path.write_text('-- Replace WINDOWS_HOST_ONLY_IP before running as administrator.\n' + ''.join(
    f"GRANT UPDATE ON clams_db.{name} TO 'clams_app'@'WINDOWS_HOST_ONLY_IP';\n"
    for name in names if name not in excluded), encoding='utf-8')
