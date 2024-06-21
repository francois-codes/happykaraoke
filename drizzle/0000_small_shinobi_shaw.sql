CREATE TABLE `config` (
	`id` integer PRIMARY KEY NOT NULL,
	`key` text,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `queue` (
	`id` integer PRIMARY KEY NOT NULL,
	`song` text NOT NULL,
	`order` integer NOT NULL,
	`sessionId` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`sessionDate` text NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_log` (
	`id` integer PRIMARY KEY NOT NULL,
	`song` text NOT NULL,
	`username` text,
	`timestamp` text NOT NULL,
	`sessionId` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suggestion` (
	`id` integer PRIMARY KEY NOT NULL,
	`song` text NOT NULL,
	`userId` integer NOT NULL,
	`sessionId` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sessionId`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`sessionId` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `queue_order_sessionId_unique` ON `queue` (`order`,`sessionId`);