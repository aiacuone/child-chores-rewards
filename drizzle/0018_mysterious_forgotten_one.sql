ALTER TABLE `family` ADD `auto_lock_minutes` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `auto_return_seconds` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `reset_minutes` integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `daily_bonus` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `alert_chores` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `family` ADD `alert_rewards` integer DEFAULT true NOT NULL;