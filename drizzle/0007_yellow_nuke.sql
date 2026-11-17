CREATE TABLE `chore_reset` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`chore_day` text NOT NULL,
	`ran_at` integer NOT NULL,
	`copies_reset` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chore_reset_family_day_idx` ON `chore_reset` (`family_id`,`chore_day`);--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_kind` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_days` integer;--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_day` integer;--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_every` integer;--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_unit` text;--> statement-breakpoint
ALTER TABLE `chore` ADD `repeat_date` text;