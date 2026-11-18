CREATE TABLE `reward_claim` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`reward_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`stars` integer,
	`message` text,
	`resolved_at` integer,
	`seen_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `reward`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reward_claim_family_idx` ON `reward_claim` (`family_id`,`child_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reward_claim_waiting_idx` ON `reward_claim` (`reward_id`,`child_id`) WHERE "reward_claim"."status" = 'waiting';