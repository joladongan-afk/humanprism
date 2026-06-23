ALTER TABLE `payments` ADD `refundStatus` enum('none','requested','approved','processing','completed','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `refundReason` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `refundAmount` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `refundedAt` timestamp;