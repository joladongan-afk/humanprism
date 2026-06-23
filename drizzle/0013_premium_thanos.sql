ALTER TABLE `consultSessions` ADD `retain` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `consultSessions` ADD `purgeAfter` timestamp;