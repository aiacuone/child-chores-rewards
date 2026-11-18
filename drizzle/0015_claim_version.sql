-- Live updates (ADR 0006): any change to a reward claim bumps family.version, as the
-- triggers in 0010 and 0013 do. Hand-written because Drizzle cannot describe triggers
-- (docs/how-to/migrations.md).
CREATE TRIGGER `reward_claim_insert_version` AFTER INSERT ON `reward_claim` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_claim_update_version` AFTER UPDATE ON `reward_claim` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_claim_delete_version` AFTER DELETE ON `reward_claim` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
