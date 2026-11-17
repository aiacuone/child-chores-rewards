CREATE TABLE `email_verification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_token_hash_unique` ON `email_verification` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_verification_family_idx` ON `email_verification` (`family_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `family` ADD `recovery_email` text;--> statement-breakpoint
ALTER TABLE `family` ADD `ntfy_topic` text;--> statement-breakpoint
ALTER TABLE `family` ADD `setup_done_at` integer;