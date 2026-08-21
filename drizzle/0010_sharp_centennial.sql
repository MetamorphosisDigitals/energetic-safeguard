ALTER TABLE `routine_plan_archives` ADD `label` varchar(120);--> statement-breakpoint
ALTER TABLE `routine_plan_archives` ADD `pinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `routine_plan_archives_user_pinned_idx` ON `routine_plan_archives` (`userId`,`pinned`);