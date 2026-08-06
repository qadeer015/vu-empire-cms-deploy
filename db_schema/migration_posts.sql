-- Migration: add columns to posts, create post_views / post_reactions tables.
USE vu_quiz_questions_data;

-- Helper: add column if not exists
-- MySQL < 8.0 does not support ADD COLUMN IF NOT EXISTS, so we check via INFORMATION_SCHEMA.

SET @db = (SELECT DATABASE());

-- Add 'status' column
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'status') = 0,
    'ALTER TABLE posts ADD COLUMN status ENUM("pending","publish","reject","delete") NOT NULL DEFAULT "pending" AFTER content',
    'SELECT 1'
));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Add 'rejectReason' column
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'rejectReason') = 0,
    'ALTER TABLE posts ADD COLUMN rejectReason VARCHAR(1000) NULL AFTER status',
    'SELECT 1'
));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Add 'reviewedBy' column
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'reviewedBy') = 0,
    'ALTER TABLE posts ADD COLUMN reviewedBy BIGINT UNSIGNED NULL AFTER rejectReason',
    'SELECT 1'
));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Add 'reviewedAt' column
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'reviewedAt') = 0,
    'ALTER TABLE posts ADD COLUMN reviewedAt TIMESTAMP NULL AFTER reviewedBy',
    'SELECT 1'
));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Change thumbnail from VARCHAR to JSON (idempotent)
SET @col_type = (SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'thumbnail');
SET @s = IF(@col_type != 'json',
    'UPDATE posts SET thumbnail = JSON_OBJECT("original", thumbnail) WHERE thumbnail IS NOT NULL AND thumbnail NOT LIKE "{%" AND thumbnail NOT LIKE "[%"; ALTER TABLE posts MODIFY COLUMN thumbnail JSON NULL',
    'SELECT 1'
);
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Add foreign key for reviewedBy
SET @fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'posts' AND CONSTRAINT_NAME = 'fk_posts_reviewedBy');
SET @s = IF(@fk = 0,
    'ALTER TABLE posts ADD CONSTRAINT fk_posts_reviewedBy FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Mark old posts as published
UPDATE posts SET status = 'publish' WHERE status = 'pending' AND createdAt < NOW();

-- =============================================================================
-- post_views
-- =============================================================================
CREATE TABLE IF NOT EXISTS post_views (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    userId BIGINT UNSIGNED NULL,
    ipAddress VARCHAR(45) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_views_postId (postId),
    INDEX idx_post_views_createdAt (createdAt),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- post_reactions — one reaction per user per post (toggling replaces)
-- =============================================================================
CREATE TABLE IF NOT EXISTS post_reactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    userId BIGINT UNSIGNED NOT NULL,
    type ENUM('like', 'heart', 'laugh', 'anger') NOT NULL DEFAULT 'like',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_reaction_post_user (postId, userId),
    INDEX idx_reactions_postId (postId),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
