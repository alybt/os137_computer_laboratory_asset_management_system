-- CLAMS schema 001. MySQL 8.0.16+ only. Import into an EMPTY clams_db on Ubuntu.
-- DDL auto-commits: take a backup before deployment; do not rerun against production.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE schema_versions (
  version VARCHAR(20) PRIMARY KEY,
  installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE departments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_conditions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_statuses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fund_sources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  permission_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  university_id VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  department_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE laboratories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  administrator_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (administrator_id) REFERENCES users(id) ON DELETE RESTRICT,
  building VARCHAR(150) NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_laboratories (
  user_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, laboratory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workstations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  property_number VARCHAR(150) NOT NULL UNIQUE,
  item_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  brand VARCHAR(100) NULL,
  model VARCHAR(150) NULL,
  serial_number VARCHAR(150) NULL UNIQUE,
  specifications TEXT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE RESTRICT,
  condition_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (condition_id) REFERENCES asset_conditions(id) ON DELETE RESTRICT,
  status_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (status_id) REFERENCES asset_statuses(id) ON DELETE RESTRICT,
  department_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  laboratory_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  custodian_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (custodian_id) REFERENCES users(id) ON DELETE RESTRICT,
  supplier_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  fund_source_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id) ON DELETE RESTRICT,
  acquisition_date DATE NOT NULL,
  purchase_order_number VARCHAR(150) NULL,
  acquisition_cost DECIMAL(15,2) NOT NULL,
  sticker_location VARCHAR(255) NULL,
  sticker_end_user VARCHAR(255) NULL,
  is_borrowable BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at DATETIME NULL,
  CHECK (acquisition_cost >= 0),
  CHECK (serial_number IS NULL OR CHAR_LENGTH(TRIM(serial_number)) > 0),
  INDEX idx_asset_location (laboratory_id, archived_at),
  INDEX idx_asset_status (status_id, is_borrowable),
  INDEX idx_asset_acquisition (acquisition_date),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workstation_assets (
  workstation_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (workstation_id) REFERENCES workstations(id) ON DELETE RESTRICT,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  PRIMARY KEY (workstation_id, asset_id),
  UNIQUE (asset_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE warranties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  provider VARCHAR(200) NOT NULL,
  starts_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  terms TEXT NULL,
  CHECK (expires_on >= starts_on),
  INDEX (expires_on),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE property_tag_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE borrow_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  borrower_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL,
  requested_at DATETIME NOT NULL,
  expected_return_at DATETIME NOT NULL,
  status ENUM('Pending','Approved','Rejected','Released','Partially Returned','Returned','Cancelled') NOT NULL DEFAULT 'Pending',
  decision_remarks TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  released_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at DATETIME NULL,
  released_at DATETIME NULL,
  CHECK (expected_return_at > requested_at),
  INDEX idx_loan_deadline (status, expected_return_at),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE borrow_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  borrow_request_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (borrow_request_id) REFERENCES borrow_requests(id) ON DELETE RESTRICT,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  returned_at DATETIME NULL,
  returned_condition_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (returned_condition_id) REFERENCES asset_conditions(id) ON DELETE RESTRICT,
  received_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,
  remarks TEXT NULL,
  UNIQUE (borrow_request_id, asset_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_transaction_locks (
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  operation ENUM('Borrow','Maintenance','Transfer','Disposal') NOT NULL,
  operation_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (asset_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE maintenance_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  reported_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
  technician_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE RESTRICT,
  problem_description TEXT NOT NULL,
  priority ENUM('Low','Normal','High','Critical') NOT NULL DEFAULT 'Normal',
  status ENUM('Reported','Pending Inspection','Assigned','Under Maintenance','Under Repair','Repaired','Beyond Repair','Closed') NOT NULL DEFAULT 'Reported',
  inspection_findings TEXT NULL,
  closed_at DATETIME NULL,
  INDEX (status, technician_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE maintenance_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  maintenance_request_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE RESTRICT,
  technician_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE RESTRICT,
  activity TEXT NOT NULL,
  repair_date DATE NOT NULL,
  repair_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  remarks TEXT NULL,
  CHECK (repair_cost >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  source_laboratory_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (source_laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  destination_laboratory_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (destination_laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  requested_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  authorized_personnel_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (authorized_personnel_id) REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  confirmed_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  transfer_date DATE NOT NULL,
  status ENUM('Pending','Approved','Rejected','Confirmed','Cancelled') NOT NULL DEFAULT 'Pending',
  reviewed_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  CHECK (source_laboratory_id IS NULL OR source_laboratory_id <> destination_laboratory_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_audits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  created_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  scheduled_date DATE NOT NULL,
  status ENUM('Open','Under Review','Completed','Cancelled') NOT NULL DEFAULT 'Open',
  completed_at DATETIME NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_audit_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inventory_audit_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (inventory_audit_id) REFERENCES inventory_audits(id) ON DELETE RESTRICT,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  expected_laboratory_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (expected_laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  observed_laboratory_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (observed_laboratory_id) REFERENCES laboratories(id) ON DELETE RESTRICT,
  inspector_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE RESTRICT,
  property_number_snapshot VARCHAR(150) NOT NULL,
  status ENUM('Not Yet Inspected','Verified','Missing','Location Mismatch','Record Mismatch') NOT NULL DEFAULT 'Not Yet Inspected',
  inspected_at DATETIME NULL,
  remarks TEXT NULL,
  UNIQUE (inventory_audit_id, asset_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_disposals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  requested_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  condition_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (condition_id) REFERENCES asset_conditions(id) ON DELETE RESTRICT,
  authorized_personnel_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (authorized_personnel_id) REFERENCES users(id) ON DELETE RESTRICT,
  approved_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  disposal_date DATE NOT NULL,
  status ENUM('Pending','Approved','Rejected','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  approved_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  maintenance_request_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE RESTRICT,
  borrow_item_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (borrow_item_id) REFERENCES borrow_items(id) ON DELETE RESTRICT,
  disposal_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (disposal_id) REFERENCES asset_disposals(id) ON DELETE RESTRICT,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  actor_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  event VARCHAR(100) NOT NULL,
  previous_values JSON NULL,
  updated_values JSON NOT NULL,
  INDEX (asset_id, created_at),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  type VARCHAR(100) NOT NULL,
  message VARCHAR(500) NOT NULL,
  related_module VARCHAR(50) NOT NULL,
  related_record_id BIGINT UNSIGNED NULL,
  deduplication_key VARCHAR(191) NULL UNIQUE,
  read_at DATETIME NULL,
  INDEX (user_id, read_at, created_at),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  affected_record_id BIGINT UNSIGNED NULL,
  previous_values JSON NULL,
  updated_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  INDEX (module, affected_record_id, created_at),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX (identifier_hash, created_at),
  INDEX (ip_address, created_at),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_versions (version) VALUES ('001');
