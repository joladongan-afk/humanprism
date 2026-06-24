CREATE TABLE `namingServices` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nameKorean` varchar(20) NOT NULL,
	`nameHanja` varchar(20),
	`surnameKorean` varchar(10),
	`surnameHanja` varchar(10),
	`jawonOhaeng` varchar(5),
	`jawonResult` varchar(20),
	`padoOhaeng` varchar(50),
	`padoResult` varchar(20),
	`suriNumber` int,
	`suriGilhyung` varchar(10),
	`suriResult` varchar(20),
	`bulmyongFlag` boolean NOT NULL DEFAULT false,
	`bulmyongList` varchar(100),
	`overallResult` varchar(20),
	`rollingComment` text,
	`certificateNumber` varchar(50),
	`certificatePdfUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `namingServices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `popularNames` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`rank` int NOT NULL,
	`nameKorean` varchar(20) NOT NULL,
	`nameHanja` varchar(20),
	`hanjaHuneum` varchar(100),
	`frequency` int NOT NULL DEFAULT 0,
	`category` enum('male','female','unisex') NOT NULL DEFAULT 'unisex',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `popularNames_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selfNamingHistories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`surnameKorean` varchar(10) NOT NULL,
	`surnameHanja` varchar(10),
	`requiredOhaeng` varchar(5),
	`ohaengSelectionMethod` varchar(20),
	`nameCandidates` json,
	`selectedNameKorean` varchar(20),
	`selectedNameHanja` varchar(20),
	`certificateNumber` varchar(50),
	`certificatePdfUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `selfNamingHistories_id` PRIMARY KEY(`id`)
);
