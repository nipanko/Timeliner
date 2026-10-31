CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`entryId` text NOT NULL,
	`occurrenceStart` integer NOT NULL,
	`doneAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`entryId`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `repeat` text;