CREATE TABLE `practice_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`practiceId` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_favorites_user_practice_unique` UNIQUE(`userId`,`practiceId`)
);
--> statement-breakpoint
CREATE TABLE `practice_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`practiceId` varchar(96) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_history_user_completed_idx` UNIQUE(`userId`,`completedAt`)
);
