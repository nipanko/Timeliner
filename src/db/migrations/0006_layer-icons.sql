ALTER TABLE `layers` ADD `icon` text;--> statement-breakpoint
UPDATE `layers` SET `icon` = 'briefcase' WHERE `id` = 'work';--> statement-breakpoint
UPDATE `layers` SET `icon` = 'book' WHERE `id` = 'study';--> statement-breakpoint
UPDATE `layers` SET `icon` = 'barbell' WHERE `id` = 'health';--> statement-breakpoint
UPDATE `layers` SET `icon` = 'home' WHERE `id` = 'life';
