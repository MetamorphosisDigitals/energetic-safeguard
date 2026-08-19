CREATE TABLE `practice_saved_filter_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`keyword` varchar(128),
	`customTag` varchar(32),
	`startDate` varchar(10),
	`endDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_saved_filter_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_saved_filter_views_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `user_library_preferences` ADD `pinnedCustomTags` text;--> statement-breakpoint
CREATE INDEX `practice_saved_filter_views_user_updated_idx` ON `practice_saved_filter_views` (`userId`,`updatedAt`);