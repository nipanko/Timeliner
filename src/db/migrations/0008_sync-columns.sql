ALTER TABLE `day_logs` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `inbox` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inbox` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `layers` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `milestones` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `settings` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `day_logs` SET `updatedAt` = `reviewedAt`;--> statement-breakpoint
UPDATE `focus_sessions` SET `updatedAt` = coalesce(`endedAt`, `pausedAt`, `startedAt`);--> statement-breakpoint
UPDATE `inbox` SET `updatedAt` = `createdAt`;--> statement-breakpoint
UPDATE `milestones` SET `updatedAt` = coalesce(`doneAt`, `createdAt`);
