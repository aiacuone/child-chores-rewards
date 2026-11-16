CREATE TABLE `child` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_family_idx` ON `child` (`family_id`);--> statement-breakpoint
CREATE TABLE `star_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`source_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `star_event_child_idx` ON `star_event` (`family_id`,`child_id`);--> statement-breakpoint
CREATE INDEX `star_event_source_idx` ON `star_event` (`kind`,`source_id`);