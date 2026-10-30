CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`layerId` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`startAt` integer NOT NULL,
	`endAt` integer,
	`granularity` text NOT NULL,
	`tz` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`layerId`) REFERENCES `layers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `layers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`sort` integer NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
