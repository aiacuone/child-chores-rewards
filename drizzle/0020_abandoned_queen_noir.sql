CREATE TABLE `invite` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invite_family_idx` ON `invite` (`family_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `invite_email_idx` ON `invite` (`email`);