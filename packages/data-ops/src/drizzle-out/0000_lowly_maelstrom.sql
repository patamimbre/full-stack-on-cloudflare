
CREATE TABLE `links` (
	`link_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`destinations` numeric NOT NULL,
	`created` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `link_clicks` (
	`id` text NOT NULL,
	`account_id` text NOT NULL,
	`country` text,
	`destination` text NOT NULL,
	`clicked_time` numeric NOT NULL,
	`latitude` real,
	`longitude` real
);
--> statement-breakpoint
CREATE TABLE `destination_evaluations` (
	`id` text PRIMARY KEY,
	`link_id` text NOT NULL,
	`account_id` text NOT NULL,
	`destination_url` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_destination_evaluations_account_time` ON `destination_evaluations` (`account_id`,`created_at`);
