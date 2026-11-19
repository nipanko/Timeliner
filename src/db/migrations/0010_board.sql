CREATE TABLE `board_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`w` integer NOT NULL,
	`h` integer NOT NULL,
	`color` text NOT NULL,
	`text` text,
	`points` text,
	`image` text,
	`z` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
