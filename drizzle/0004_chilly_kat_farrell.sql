CREATE TABLE `user_library_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyDefaultPracticeId` varchar(96),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_library_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_library_preferences_user_unique` UNIQUE(`userId`)
);
