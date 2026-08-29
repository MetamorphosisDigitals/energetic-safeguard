CREATE TYPE "public"."billing_webhook_outcome" AS ENUM('processing', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerEventId" varchar(255) NOT NULL,
	"eventType" varchar(128) NOT NULL,
	"userId" integer,
	"outcome" "billing_webhook_outcome" DEFAULT 'processing' NOT NULL,
	"errorCode" varchar(96),
	"providerCreatedAt" timestamp with time zone,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"practiceId" varchar(96) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"practiceId" varchar(96) NOT NULL,
	"note" text,
	"moodTag" varchar(48),
	"intentionTag" varchar(64),
	"customTags" text,
	"completedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_saved_filter_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"keyword" varchar(128),
	"customTag" varchar(32),
	"startDate" varchar(10),
	"endDate" varchar(10),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"offerKey" varchar(64) NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripePaymentIntentId" varchar(255),
	"stripeCheckoutSessionId" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_plan_archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"clientArchiveKey" varchar(128) NOT NULL,
	"selectedPracticeId" varchar(96) NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"endsAt" timestamp with time zone NOT NULL,
	"archivedAt" timestamp with time zone NOT NULL,
	"completedDayKeys" text NOT NULL,
	"completionNotes" text NOT NULL,
	"reflectionNote" text,
	"label" varchar(120),
	"pinned" boolean DEFAULT false NOT NULL,
	"importedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"offerKey" varchar(64) NOT NULL,
	"stripeCustomerId" varchar(255) NOT NULL,
	"stripeSubscriptionId" varchar(255) NOT NULL,
	"stripePriceId" varchar(255),
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"currentPeriodEnd" timestamp with time zone,
	"graceEndsAt" timestamp with time zone,
	"lastInvoiceId" varchar(255),
	"lastPaidAt" timestamp with time zone,
	"canceledAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_library_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"dailyDefaultPracticeId" varchar(96),
	"routineArchiveAutoBackup" boolean DEFAULT false NOT NULL,
	"pinnedCustomTags" text,
	"defaultSavedFilterViewId" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_provider_event_unique" ON "billing_webhook_events" USING btree ("providerEventId");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_type_created_idx" ON "billing_webhook_events" USING btree ("eventType","createdAt");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_user_idx" ON "billing_webhook_events" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_favorites_user_practice_unique" ON "practice_favorites" USING btree ("userId","practiceId");--> statement-breakpoint
CREATE INDEX "practice_history_user_completed_idx" ON "practice_history" USING btree ("userId","completedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_saved_filter_views_user_name_unique" ON "practice_saved_filter_views" USING btree ("userId","name");--> statement-breakpoint
CREATE INDEX "practice_saved_filter_views_user_updated_idx" ON "practice_saved_filter_views" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_entitlements_user_unique" ON "premium_entitlements" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_entitlements_checkout_unique" ON "premium_entitlements" USING btree ("stripeCheckoutSessionId");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_plan_archives_user_client_key_unique" ON "routine_plan_archives" USING btree ("userId","clientArchiveKey");--> statement-breakpoint
CREATE INDEX "routine_plan_archives_user_archived_idx" ON "routine_plan_archives" USING btree ("userId","archivedAt");--> statement-breakpoint
CREATE INDEX "routine_plan_archives_user_practice_idx" ON "routine_plan_archives" USING btree ("userId","selectedPracticeId");--> statement-breakpoint
CREATE INDEX "routine_plan_archives_user_pinned_idx" ON "routine_plan_archives" USING btree ("userId","pinned");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_entitlements_user_unique" ON "subscription_entitlements" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_entitlements_subscription_unique" ON "subscription_entitlements" USING btree ("stripeSubscriptionId");--> statement-breakpoint
CREATE INDEX "subscription_entitlements_customer_idx" ON "subscription_entitlements" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX "subscription_entitlements_status_idx" ON "subscription_entitlements" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_library_preferences_user_unique" ON "user_library_preferences" USING btree ("userId");