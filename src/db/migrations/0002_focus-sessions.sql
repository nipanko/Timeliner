CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`entryId` text NOT NULL,
	`startedAt` integer NOT NULL,
	`endedAt` integer,
	`pausedMs` integer DEFAULT 0 NOT NULL,
	`pausedAt` integer,
	FOREIGN KEY (`entryId`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
