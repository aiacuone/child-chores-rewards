CREATE TABLE `grownup_token` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `grownup_token_session_idx` ON `grownup_token` (`session_id`);--> statement-breakpoint
ALTER TABLE `family` ADD `pin_fails` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `pin_lock_stage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `pin_locked_until` integer;