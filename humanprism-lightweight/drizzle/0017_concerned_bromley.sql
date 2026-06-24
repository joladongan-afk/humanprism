ALTER TABLE `consultSessions` MODIFY COLUMN `status` enum('active','expired','completed','awaiting_payment','approved') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` enum('pending','paid','refunded','failed','awaiting_deposit') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `consultSessions` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `consultSessions` ADD `firstEnteredAt` timestamp;--> statement-breakpoint
ALTER TABLE `consultSessions` ADD `enterBy` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `depositorName` varchar(64);--> statement-breakpoint
ALTER TABLE `payments` ADD `depositMemo` text;