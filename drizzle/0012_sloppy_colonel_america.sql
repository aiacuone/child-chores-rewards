CREATE TABLE `reward` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`name` text NOT NULL,
	`cost` integer NOT NULL,
	`colour` text DEFAULT 'pink' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reward_family_idx` ON `reward` (`family_id`);--> statement-breakpoint
CREATE TABLE `reward_child` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`reward_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `reward`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reward_child_family_idx` ON `reward_child` (`family_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reward_child_reward_child_idx` ON `reward_child` (`reward_id`,`child_id`);