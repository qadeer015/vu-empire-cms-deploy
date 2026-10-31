-- Migration: 002_create_email_verification_tokens_table
-- Adds a table for email verification tokens.

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME NOT NULL,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_email_verification_tokens_token` (`token`),
    KEY `idx_email_verification_tokens_userId` (`userId`),
    KEY `idx_email_verification_tokens_expiresAt` (`expiresAt`),
    CONSTRAINT `fk_email_verification_tokens_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;