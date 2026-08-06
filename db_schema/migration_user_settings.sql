-- Migration: Add user settings fields
-- Adds profile visibility and email notification preferences

-- Check if columns exist and add them if they don't
SET @col1_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profilePublic');
SET @col2_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emailNotifications');

-- Add profilePublic column if it doesn't exist
SET @stmt1 := IF(@col1_exists = 0, 'ALTER TABLE users ADD COLUMN profilePublic TINYINT(1) DEFAULT 1 COMMENT ''1 = public profile visible in posts/comments, 0 = private''', 'SELECT ''profilePublic already exists'' AS note');
PREPARE stmt1 FROM @stmt1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Add emailNotifications column if it doesn't exist
SET @stmt2 := IF(@col2_exists = 0, 'ALTER TABLE users ADD COLUMN emailNotifications TINYINT(1) DEFAULT 1 COMMENT ''1 = receive email notifications, 0 = no notifications''', 'SELECT ''emailNotifications already exists'' AS note');
PREPARE stmt2 FROM @stmt2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Create indexes for faster queries (ignore if they already exist)
SET @idx1_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_profile_public');
SET @idx2_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email_notifications');

SET @idx_stmt1 := IF(@idx1_exists = 0, 'CREATE INDEX idx_users_profile_public ON users(profilePublic)', 'SELECT ''idx_users_profile_public already exists'' AS note');
PREPARE idx_stmt1 FROM @idx_stmt1;
EXECUTE idx_stmt1;
DEALLOCATE PREPARE idx_stmt1;

SET @idx_stmt2 := IF(@idx2_exists = 0, 'CREATE INDEX idx_users_email_notifications ON users(emailNotifications)', 'SELECT ''idx_users_email_notifications already exists'' AS note');
PREPARE idx_stmt2 FROM @idx_stmt2;
EXECUTE idx_stmt2;
DEALLOCATE PREPARE idx_stmt2;