-- Migration: Add author role and content type support
-- Enables authors to create posts, handouts, past papers, assignments, and GDB solutions

-- Update users role enum to include 'author'
ALTER TABLE users MODIFY COLUMN role ENUM('student','admin','author') DEFAULT 'student';

-- Check if content_type column exists before adding
SET @col_exists := (
    SELECT COUNT(*)
    FROM   information_schema.COLUMNS
    WHERE  TABLE_SCHEMA = DATABASE()
      AND  TABLE_NAME   = 'posts'
      AND  COLUMN_NAME  = 'content_type'
);

SET @stmt := IF(
    @col_exists = 0,
    'ALTER TABLE posts ADD COLUMN content_type ENUM(''post'',''handout'',''past_paper'',''assignment'',''gdb_solution'') DEFAULT ''post'' AFTER status',
    'SELECT ''content_type already exists'' AS note'
);

PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create indexes for faster queries
SET @idx1_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND INDEX_NAME = 'idx_posts_content_type');
SET @idx2_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND INDEX_NAME = 'idx_posts_userId');

SET @idx_stmt1 := IF(@idx1_exists = 0, 'CREATE INDEX idx_posts_content_type ON posts(content_type)', 'SELECT ''idx_posts_content_type already exists'' AS note');
PREPARE idx_stmt1 FROM @idx_stmt1;
EXECUTE idx_stmt1;
DEALLOCATE PREPARE idx_stmt1;

SET @idx_stmt2 := IF(@idx2_exists = 0, 'CREATE INDEX idx_posts_userId ON posts(userId)', 'SELECT ''idx_posts_userId already exists'' AS note');
PREPARE idx_stmt2 FROM @idx_stmt2;
EXECUTE idx_stmt2;
DEALLOCATE PREPARE idx_stmt2;