-- Preserve original transactions while supporting the original UI removal workflow safely.
ALTER TABLE assignments ADD archived_at DATETIME NULL;
ALTER TABLE maintenance_records ADD archived_at DATETIME NULL;
INSERT INTO schema_versions(version) VALUES ('labassets-002');
