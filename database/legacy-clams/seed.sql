-- REQUIRED reference data only. No users, assets, or fabricated transactions.
START TRANSACTION;
INSERT INTO roles (name) VALUES
('Super Administrator'),
('Property Administrator'),
('Laboratory Administrator'),
('IT Personnel'),
('Faculty'),
('Student');
INSERT INTO asset_conditions (name) VALUES
('Excellent'),
('Good'),
('Fair'),
('Poor'),
('Damaged'),
('Unusable');
INSERT INTO asset_statuses (name) VALUES
('Available'),
('Assigned'),
('Borrowed'),
('Reserved'),
('Under Inspection'),
('Under Maintenance'),
('Under Repair'),
('Missing'),
('Disposed');
INSERT INTO permissions (name) VALUES
('assets.read'),
('assets.write'),
('laboratories.manage'),
('workstations.manage'),
('borrowing.request'),
('borrowing.manage'),
('maintenance.request'),
('maintenance.manage'),
('transfers.manage'),
('audits.manage'),
('reports.read'),
('users.manage'),
('settings.manage'),
('logs.read'),
('backups.manage'),
('disposals.manage');
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Super Administrator';
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Property Administrator' AND p.name IN ('assets.read','assets.write','transfers.manage','audits.manage','reports.read','disposals.manage');
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Laboratory Administrator' AND p.name IN ('assets.read','workstations.manage','borrowing.manage','maintenance.request','audits.manage','reports.read');
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'IT Personnel' AND p.name IN ('assets.read','maintenance.request','maintenance.manage');
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Faculty' AND p.name IN ('assets.read','borrowing.request','maintenance.request');
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Student' AND p.name IN ('assets.read','borrowing.request');
COMMIT;
