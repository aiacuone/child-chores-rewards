-- Live updates (ADR 0006): any change to a family's rewards or who they are for
-- bumps family.version, as the triggers in 0010 do for chores and stars.
-- Hand-written because Drizzle cannot describe triggers (docs/how-to/migrations.md).
CREATE TRIGGER `reward_insert_version` AFTER INSERT ON `reward` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_update_version` AFTER UPDATE ON `reward` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_delete_version` AFTER DELETE ON `reward` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_child_insert_version` AFTER INSERT ON `reward_child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_child_update_version` AFTER UPDATE ON `reward_child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_child_delete_version` AFTER DELETE ON `reward_child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
