CREATE TABLE `child_passcode` (
	`child_id` integer PRIMARY KEY NOT NULL,
	`family_id` integer NOT NULL,
	`hash` text NOT NULL,
	`fails` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_passcode_family_idx` ON `child_passcode` (`family_id`);--> statement-breakpoint
CREATE TABLE `child_unlock` (
	`session_id` text NOT NULL,
	`child_id` integer NOT NULL,
	`family_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `child_id`),
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_unlock_child_idx` ON `child_unlock` (`child_id`);--> statement-breakpoint
CREATE INDEX `child_unlock_family_idx` ON `child_unlock` (`family_id`);--> statement-breakpoint
-- Who's flying links differently for a child with a passcode, so turning one on
-- or off refreshes it. Wrong tries update the row and deliberately do not.
CREATE TRIGGER `child_passcode_insert_version` AFTER INSERT ON `child_passcode` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = NEW.`family_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `child_passcode_delete_version` AFTER DELETE ON `child_passcode` BEGIN
	UPDATE `family` SET `version` = `version` + 1 WHERE `id` = OLD.`family_id`;
END;
