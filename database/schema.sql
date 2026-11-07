-- labassets: seven original ORM tables; EMPTY database only. No demo records.
-- Names, nullable fields, DOUBLE money and IDs retained. FK deletion is RESTRICT to preserve history.
SET NAMES utf8mb4;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'viewer',
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `laboratories` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL UNIQUE,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `building` VARCHAR(120) NULL,
  `room` VARCHAR(60) NULL,
  `capacity` INT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `assets` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `asset_tag` VARCHAR(40) NOT NULL UNIQUE,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `category_id` INT NULL,
  INDEX (`category_id`),
  `laboratory_id` INT NULL,
  INDEX (`laboratory_id`),
  `status` VARCHAR(20) NOT NULL DEFAULT 'available',
  INDEX (`status`),
  `condition` VARCHAR(20) NOT NULL DEFAULT 'good',
  `brand` VARCHAR(100) NULL,
  `model` VARCHAR(120) NULL,
  `serial_number` VARCHAR(120) NULL,
  `supplier` VARCHAR(160) NULL,
  `purchase_date` DATE NULL,
  `purchase_cost` DOUBLE NULL,
  `warranty_expiry` DATE NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`laboratory_id`) REFERENCES `laboratories` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `assignments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `asset_id` INT NOT NULL,
  INDEX (`asset_id`),
  `borrower_name` VARCHAR(120) NOT NULL,
  `borrower_email` VARCHAR(160) NULL,
  `department` VARCHAR(120) NULL,
  `purpose` VARCHAR(255) NULL,
  `assigned_by` INT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` DATE NULL,
  `returned_at` DATETIME NULL,
  `notes` TEXT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_records` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `asset_id` INT NOT NULL,
  INDEX (`asset_id`),
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `maintenance_type` VARCHAR(30) NOT NULL DEFAULT 'corrective',
  `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  INDEX (`status`),
  `scheduled_date` DATE NULL,
  `completed_date` DATE NULL,
  `cost` DOUBLE NULL,
  `performed_by` VARCHAR(120) NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(120) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `entity_type` VARCHAR(40) NOT NULL,
  `entity_id` INT NULL,
  `detail` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
