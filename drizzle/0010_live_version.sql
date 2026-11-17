-- Live updates (ADR 0006): any change to a family's children, chores, chore
-- copies or stars bumps family.version, which screens poll (src/lib/server/live.ts).
-- Triggers mean no write path can forget to do it.
CREATE TRIGGER `child_insert_version` AFTER INSERT ON `child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `child_update_version` AFTER UPDATE ON `child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `child_delete_version` AFTER DELETE ON `child` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_insert_version` AFTER INSERT ON `chore` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_update_version` AFTER UPDATE ON `chore` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_delete_version` AFTER DELETE ON `chore` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_copy_insert_version` AFTER INSERT ON `chore_copy` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_copy_update_version` AFTER UPDATE ON `chore_copy` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_copy_delete_version` AFTER DELETE ON `chore_copy` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `star_event_insert_version` AFTER INSERT ON `star_event` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `star_event_update_version` AFTER UPDATE ON `star_event` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `star_event_delete_version` AFTER DELETE ON `star_event` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
