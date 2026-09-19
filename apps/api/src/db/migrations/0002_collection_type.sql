CREATE TABLE `collection_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_type_name_unique` ON `collection_type` (`name`);
--> statement-breakpoint
INSERT INTO `collection_type` (`name`) VALUES ('Saga');
--> statement-breakpoint
INSERT INTO `collection_type` (`name`) VALUES ('Serie');
--> statement-breakpoint
INSERT INTO `collection_type` (`name`) VALUES ('Temática');
--> statement-breakpoint
INSERT INTO `collection_type` (`name`) VALUES ('Fanfiction');
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type_id` integer NOT NULL REFERENCES `collection_type`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_collection` SELECT `id`, `name`, `description`,
  CASE `type`
    WHEN 'series' THEN 1
    WHEN 'anthology' THEN 2
    WHEN 'thematic' THEN 3
    ELSE 1
  END
FROM `collection`;
--> statement-breakpoint
DROP TABLE `collection`;
--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
