-- Store sticker transcription separately from the item's acquisition values.
ALTER TABLE assets ADD sticker_date DATE NULL, ADD sticker_amount DECIMAL(15,2) NULL, ADD sticker_amount_scope VARCHAR(20) NOT NULL DEFAULT 'unconfirmed', ADD CHECK(sticker_amount IS NULL OR sticker_amount>=0), ADD CHECK(sticker_amount_scope IN ('unconfirmed','individual','package'));
INSERT INTO schema_versions(version) VALUES ('labassets-003');
