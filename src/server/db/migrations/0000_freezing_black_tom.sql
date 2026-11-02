CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`goal_type` text NOT NULL,
	`goal_weight_kg` real,
	`share_progress` integer DEFAULT false NOT NULL,
	`share_consented_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "users_goal_type_check" CHECK("users"."goal_type" IN ('lose', 'gain'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`entry_date` text NOT NULL,
	`weight_kg` real NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weight_entries_user_date_idx` ON `weight_entries` (`user_id`,`entry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weight_entries_user_date_unique` ON `weight_entries` (`user_id`,`entry_date`);