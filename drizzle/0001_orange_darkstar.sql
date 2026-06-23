CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paymentId` int,
	`consultType` enum('chat','phone','offline') NOT NULL,
	`realName` varchar(64) NOT NULL,
	`nickname` varchar(64),
	`phone` varchar(32) NOT NULL,
	`preferredDate` timestamp NOT NULL,
	`alternativeDate` timestamp,
	`notes` text,
	`status` enum('requested','confirmed','rejected','completed','cancelled') NOT NULL DEFAULT 'requested',
	`confirmedAt` timestamp,
	`masterNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultMessages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sajuProfileId` int,
	`paymentId` int,
	`planType` enum('entry','deep','master_chat','master_offline') NOT NULL,
	`durationMinutes` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`status` enum('active','expired','completed') NOT NULL DEFAULT 'active',
	`title` varchar(200),
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planType` enum('entry','deep','master_chat','master_offline') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','paid','refunded','failed') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(64),
	`externalPaymentId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sajuProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(64) NOT NULL DEFAULT '본인',
	`realName` varchar(64),
	`gender` enum('male','female') NOT NULL,
	`calendarType` enum('solar','lunar') NOT NULL DEFAULT 'solar',
	`isLeapMonth` boolean NOT NULL DEFAULT false,
	`birthYear` int NOT NULL,
	`birthMonth` int NOT NULL,
	`birthDay` int NOT NULL,
	`birthHour` int,
	`birthMinute` int,
	`birthplace` varchar(128),
	`isDst` boolean NOT NULL DEFAULT false,
	`sajuData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sajuProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `realName` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `consentRecord` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `consentRecordAt` timestamp;