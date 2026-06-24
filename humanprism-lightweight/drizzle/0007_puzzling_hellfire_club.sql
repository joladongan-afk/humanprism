CREATE TABLE `eventCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`isUsed` boolean NOT NULL DEFAULT false,
	`usedBy` int,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventCodes_code_unique` UNIQUE(`code`)
);
