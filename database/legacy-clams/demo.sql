-- OPTIONAL DEMONSTRATION DATA. Use ONLY a separate empty demo database/schema import.
-- These records are explicitly labeled and contain no usable login credentials.
START TRANSACTION;
INSERT INTO departments (name, description) VALUES ('DEMO Department', 'Demonstration only; not university inventory');
INSERT INTO laboratories (code, name, department_id, building, room_number)
SELECT 'DEMO-LAB', 'DEMO Laboratory', id, 'DEMO Building', 'DEMO-101'
FROM departments WHERE name = 'DEMO Department';
INSERT INTO asset_categories (name, description) VALUES ('DEMO Monitor', 'Demonstration category');
INSERT INTO assets (public_token, property_number, item_name, description, category_id, condition_id, status_id, department_id, laboratory_id, acquisition_date, acquisition_cost)
SELECT SHA2('CLAMS optional demonstration monitor', 256), 'DEMO-PROP-0001', 'DEMO Monitor', 'Optional demonstration record; remove by recreating the demo database', c.id, co.id, s.id, d.id, l.id, '2026-01-01', 1000.00
FROM asset_categories c CROSS JOIN asset_conditions co CROSS JOIN asset_statuses s CROSS JOIN departments d CROSS JOIN laboratories l
WHERE c.name='DEMO Monitor' AND co.name='Good' AND s.name='Available' AND d.name='DEMO Department' AND l.code='DEMO-LAB';
COMMIT;
