-- Migration: Create poll_votes table for poll-type post voting
CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    optionIndex INT UNSIGNED NOT NULL,
    userId BIGINT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (postId, userId),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_postId (postId),
    INDEX idx_userId (userId)
);
