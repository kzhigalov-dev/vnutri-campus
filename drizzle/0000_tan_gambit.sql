CREATE TABLE `booking_slots` (
	`booking_id` text NOT NULL,
	`room_id` text NOT NULL,
	`date` text NOT NULL,
	`hour` integer NOT NULL,
	`seat` integer NOT NULL,
	PRIMARY KEY(`room_id`, `date`, `hour`, `seat`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`room_id` text NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`hours` integer NOT NULL,
	`seats` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text NOT NULL
);
