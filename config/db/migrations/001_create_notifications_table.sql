-- Migration: 001_create_notifications_table
-- Adds a notifications table for in-app notifications.

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'info',
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT DEFAULT NULL,
    `isRead` TINYINT(1) NOT NULL DEFAULT 0,
    `link` VARCHAR(255) DEFAULT NULL,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notifications_userId` (`userId`),
    KEY `idx_notifications_isRead` (`isRead`),
    CONSTRAINT `fk_notifications_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;