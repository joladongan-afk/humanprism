CREATE TABLE `csChatHistories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int,
	`message` text NOT NULL,
	`response` text NOT NULL,
	`matchedFaqId` varchar(64),
	`similarityScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csChatHistories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csFaqs` (
	`id` varchar(64) NOT NULL,
	`category` varchar(64) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`keywords` json NOT NULL,
	`priority` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csFaqs_id` PRIMARY KEY(`id`)
);
