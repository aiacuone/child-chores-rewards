ALTER TABLE `chore` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `chore` ADD `skip_until` text;--> statement-breakpoint
ALTER TABLE `chore` ADD `skip_open` integer DEFAULT false NOT NULL;