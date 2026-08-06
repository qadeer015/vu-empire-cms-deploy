-- Migration: Restructure content types
-- Creates separate tables for past papers, assignments, and GDB solutions
-- Updates posts table content_type to: event, poll, document, post

-- Update content_type column to new enum values
ALTER TABLE posts MODIFY COLUMN content_type ENUM('event','poll','document','post') DEFAULT 'post';

-- Create past_papers table
CREATE TABLE IF NOT EXISTS past_papers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    courseCode VARCHAR(50) NOT NULL,
    courseName VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    filePath VARCHAR(500),
    originalFilename VARCHAR(255),
    fileSize BIGINT,
    status ENUM('draft','publish') DEFAULT 'publish',
    authorId BIGINT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_courseCode (courseCode),
    INDEX idx_authorId (authorId)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    courseCode VARCHAR(50) NOT NULL,
    courseName VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    dueDate DATETIME,
    filePath VARCHAR(500),
    originalFilename VARCHAR(255),
    status ENUM('draft','publish') DEFAULT 'publish',
    authorId BIGINT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_courseCode (courseCode),
    INDEX idx_dueDate (dueDate),
    INDEX idx_authorId (authorId)
);

-- Create gdb_solutions table
CREATE TABLE IF NOT EXISTS gdb_solutions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    courseCode VARCHAR(50) NOT NULL,
    courseName VARCHAR(255) NOT NULL,
    gdbTitle VARCHAR(255) NOT NULL,
    solution TEXT NOT NULL,
    authorId BIGINT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_courseCode (courseCode),
    INDEX idx_authorId (authorId)
);

-- Create indexes for posts if they don't exist
SET @idx1_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND INDEX_NAME = 'idx_posts_userId');
SET @idx2_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND INDEX_NAME = 'idx_content_type');

SET @idx_stmt1 := IF(@idx1_exists = 0, 'CREATE INDEX idx_posts_userId ON posts(userId)', 'SELECT ''idx_posts_userId already exists''');
PREPARE idx_stmt1 FROM @idx_stmt1; EXECUTE idx_stmt1; DEALLOCATE PREPARE idx_stmt1;

SET @idx_stmt2 := IF(@idx2_exists = 0, 'CREATE INDEX idx_content_type ON posts(content_type)', 'SELECT ''idx_content_type already exists''');
PREPARE idx_stmt2 FROM @idx_stmt2; EXECUTE idx_stmt2; DEALLOCATE PREPARE idx_stmt2;