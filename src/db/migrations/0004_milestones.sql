CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`title` text NOT NULL,
	`sort` integer NOT NULL,
	`doneAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
