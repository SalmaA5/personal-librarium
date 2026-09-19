CREATE TABLE IF NOT EXISTS `collection_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `collection_type_name_unique` ON `collection_type` (`name`);
--> statement-breakpoint
INSERT OR IGNORE INTO `collection_type` (`name`) VALUES ('Saga');
--> statement-breakpoint
INSERT OR IGNORE INTO `collection_type` (`name`) VALUES ('Serie');
--> statement-breakpoint
INSERT OR IGNORE INTO `collection_type` (`name`) VALUES ('Temática');
--> statement-breakpoint
INSERT OR IGNORE INTO `collection_type` (`name`) VALUES ('Fanfiction');
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `__new_collection`;
--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type_id` integer NOT NULL REFERENCES `collection_type`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_collection` (`id`, `name`, `description`, `type_id`)
  SELECT `id`, `name`, `description`,
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
