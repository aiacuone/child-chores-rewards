CREATE TABLE `chore` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`stars` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chore_family_idx` ON `chore` (`family_id`);--> statement-breakpoint
CREATE TABLE `chore_copy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`chore_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chore_id`) REFERENCES `chore`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chore_copy_family_idx` ON `chore_copy` (`family_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chore_copy_chore_child_idx` ON `chore_copy` (`chore_id`,`child_id`);