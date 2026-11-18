CREATE TABLE `checked_notice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	`copy_id` integer NOT NULL,
	`stars` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`copy_id`) REFERENCES `chore_copy`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checked_notice_child_idx` ON `checked_notice` (`family_id`,`child_id`);--> statement-breakpoint
ALTER TABLE `chore_copy` ADD `checked_at` integer;--> statement-breakpoint
ALTER TABLE `chore_copy` ADD `star_event_id` integer;--> statement-breakpoint
ALTER TABLE `chore_copy` ADD `message` text;