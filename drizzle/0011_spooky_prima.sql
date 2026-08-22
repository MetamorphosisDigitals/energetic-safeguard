CREATE TABLE `billing_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` varchar(255) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`userId` int,
	`outcome` enum('processing','processed','ignored','failed') NOT NULL DEFAULT 'processing',
	`errorCode` varchar(96),
	`providerCreatedAt` timestamp,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_webhook_events_provider_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `subscription_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`offerKey` varchar(64) NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`stripeSubscriptionId` varchar(255) NOT NULL,
	`stripePriceId` varchar(255),
	`status` enum('trialing','active','past_due','canceled','unpaid') NOT NULL DEFAULT 'trialing',
	`currentPeriodEnd` timestamp,
	`graceEndsAt` timestamp,
	`lastInvoiceId` varchar(255),
	`lastPaidAt` timestamp,
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_entitlements_user_unique` UNIQUE(`userId`),
	CONSTRAINT `subscription_entitlements_subscription_unique` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
CREATE INDEX `billing_webhook_events_type_created_idx` ON `billing_webhook_events` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `billing_webhook_events_user_idx` ON `billing_webhook_events` (`userId`);--> statement-breakpoint
CREATE INDEX `subscription_entitlements_customer_idx` ON `subscription_entitlements` (`stripeCustomerId`);--> statement-breakpoint
CREATE INDEX `subscription_entitlements_status_idx` ON `subscription_entitlements` (`status`);