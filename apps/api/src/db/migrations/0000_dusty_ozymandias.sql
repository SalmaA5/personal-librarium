CREATE TABLE `author` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `book` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`cover_url` text,
	`drive_file_id` text,
	`format` text NOT NULL,
	`file_status` text DEFAULT 'drive_only' NOT NULL,
	`cached_path` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`total_chapters` integer,
	`total_volumes` integer,
	`year` integer,
	`publisher` text,
	`rating` real,
	`review` text,
	`original_format` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `book_author` (
	`book_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	PRIMARY KEY(`book_id`, `author_id`),
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `author`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `book_collection` (
	`book_id` integer NOT NULL,
	`collection_id` integer NOT NULL,
	`order` integer,
	PRIMARY KEY(`book_id`, `collection_id`),
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `book_genre` (
	`book_id` integer NOT NULL,
	`genre_id` integer NOT NULL,
	PRIMARY KEY(`book_id`, `genre_id`),
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genre_id`) REFERENCES `genre`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `book_tag` (
	`book_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`book_id`, `tag_id`),
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `genre` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`current_page` integer,
	`total_pages` integer,
	`epub_cfi` text,
	`percentage` real,
	`last_read_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `related_book` (
	`book_id` integer NOT NULL,
	`related_book_id` integer NOT NULL,
	`relation_type` text NOT NULL,
	PRIMARY KEY(`book_id`, `related_book_id`),
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
