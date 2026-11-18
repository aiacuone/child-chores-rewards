CREATE TABLE `chore_photo` (
	`chore_id` integer PRIMARY KEY NOT NULL,
	`family_id` integer NOT NULL,
	`data` blob NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`chore_id`) REFERENCES `chore`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chore_photo_family_idx` ON `chore_photo` (`family_id`);--> statement-breakpoint
CREATE TABLE `reward_photo` (
	`reward_id` integer PRIMARY KEY NOT NULL,
	`family_id` integer NOT NULL,
	`data` blob NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`reward_id`) REFERENCES `reward`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reward_photo_family_idx` ON `reward_photo` (`family_id`);--> statement-breakpoint
CREATE TRIGGER `chore_photo_insert_version` AFTER INSERT ON `chore_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_photo_update_version` AFTER UPDATE ON `chore_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `chore_photo_delete_version` AFTER DELETE ON `chore_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_photo_insert_version` AFTER INSERT ON `reward_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_photo_update_version` AFTER UPDATE ON `reward_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `reward_photo_delete_version` AFTER DELETE ON `reward_photo` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
