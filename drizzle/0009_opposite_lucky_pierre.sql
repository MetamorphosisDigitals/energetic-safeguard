CREATE TABLE `routine_plan_archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientArchiveKey` varchar(128) NOT NULL,
	`selectedPracticeId` varchar(96) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`archivedAt` timestamp NOT NULL,
	`completedDayKeys` text NOT NULL,
	`completionNotes` text NOT NULL,
	`reflectionNote` text,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routine_plan_archives_id` PRIMARY KEY(`id`),
	CONSTRAINT `routine_plan_archives_user_client_key_unique` UNIQUE(`userId`,`clientArchiveKey`)
);
--> statement-breakpoint
ALTER TABLE `user_library_preferences` ADD `routineArchiveAutoBackup` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `routine_plan_archives_user_archived_idx` ON `routine_plan_archives` (`userId`,`archivedAt`);--> statement-breakpoint
CREATE INDEX `routine_plan_archives_user_practice_idx` ON `routine_plan_archives` (`userId`,`selectedPracticeId`);