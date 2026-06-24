CREATE TABLE `sajuComparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileAId` int NOT NULL,
	`labelA` varchar(64) NOT NULL DEFAULT '본인',
	`profileBId` int NOT NULL,
	`labelB` varchar(64) NOT NULL DEFAULT '상대',
	`relationType` enum('couple','family','work','friend','other') NOT NULL DEFAULT 'couple',
	`result` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sajuComparisons_id` PRIMARY KEY(`id`)
);
