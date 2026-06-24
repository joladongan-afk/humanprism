ALTER TABLE `appointments` ADD `depositAmount` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `depositAccountInfo` json;--> statement-breakpoint
ALTER TABLE `appointments` ADD `paidAt` timestamp;