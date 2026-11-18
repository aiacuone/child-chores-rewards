CREATE TABLE `child_photo` (
	`child_id` integer PRIMARY KEY NOT NULL,
	`family_id` integer NOT NULL,
	`data` blob NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_photo_family_idx` ON `child_photo` (`family_id`);--> statement-breakpoint
-- A new or removed photo shows on every device (ADR 0006, ADR 0011).
CREATE TRIGGER `child_photo_insert_version` AFTER INSERT ON `child_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `child_photo_update_version` AFTER UPDATE ON `child_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `child_photo_delete_version` AFTER DELETE ON `child_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
