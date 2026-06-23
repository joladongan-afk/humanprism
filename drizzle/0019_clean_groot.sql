ALTER TABLE `consultSessions` ADD `maxTurns` int;--> statement-breakpoint
ALTER TABLE `consultSessions` ADD `usedTurns` int DEFAULT 0 NOT NULL;