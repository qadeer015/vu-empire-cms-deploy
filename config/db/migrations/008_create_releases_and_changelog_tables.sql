-- Migration: 008_create_releases_and_changelog_tables
-- Stores public release metadata and the changes included in each release.

CREATE TABLE IF NOT EXISTS `releases` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `version` VARCHAR(32) NOT NULL,
    `releaseDate` DATE NOT NULL,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_releases_version` (`version`),
    KEY `idx_releases_releaseDate` (`releaseDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `release_changelog` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `releaseId` BIGINT UNSIGNED NOT NULL,
    `type` ENUM('feature', 'improve', 'fix') NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `position` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_release_changelog_releaseId_position` (`releaseId`, `position`),
    CONSTRAINT `fk_release_changelog_releaseId`
        FOREIGN KEY (`releaseId`) REFERENCES `releases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `releases` (`version`, `releaseDate`) VALUES
    ('1.0.0', '2025-04-01'),
    ('1.0.1', '2025-05-01'),
    ('1.0.2', '2025-06-01'),
    ('1.0.3', '2025-06-01'),
    ('1.0.4', '2026-06-01'),
    ('1.0.5', '2026-06-01'),
    ('1.0.6', '2026-06-01'),
    ('1.0.7', '2026-07-01'),
    ('1.0.8', '2026-09-01');

INSERT INTO `release_changelog` (`releaseId`, `type`, `description`, `position`)
SELECT r.`id`, c.`type`, c.`description`, c.`position`
FROM (
    SELECT '1.0.0' AS `version`, 'feature' AS `type`, 'Initial release of VU Empire Genie' AS `description`, 1 AS `position`
    UNION ALL SELECT '1.0.0', 'feature', 'Copy paste enable on VU LMS pages', 2
    UNION ALL SELECT '1.0.0', 'feature', 'Lecture skip functionality', 3
    UNION ALL SELECT '1.0.0', 'feature', 'Floating UI with quick actions', 4
    UNION ALL SELECT '1.0.1', 'feature', 'Show Activity Calendar', 1
    UNION ALL SELECT '1.0.1', 'feature', 'Lecture auto-skip functionality', 2
    UNION ALL SELECT '1.0.1', 'feature', 'Settings page with persistent storage', 3
    UNION ALL SELECT '1.0.1', 'feature', 'Solve Quiz question', 4
    UNION ALL SELECT '1.0.1', 'improve', 'Lecture skip functionality', 5
    UNION ALL SELECT '1.0.2', 'feature', 'Auto Solve Quiz based on settings', 1
    UNION ALL SELECT '1.0.2', 'feature', 'GDB (Graded Discussion Board) solve', 2
    UNION ALL SELECT '1.0.2', 'improve', 'Redesigned settings page with tabbed interface', 3
    UNION ALL SELECT '1.0.2', 'improve', 'Enhanced toggle disabled states with visual indicators', 4
    UNION ALL SELECT '1.0.2', 'fix', 'Fixed quiz answer selection accuracy', 5
    UNION ALL SELECT '1.0.3', 'feature', 'Account management (quick login)', 1
    UNION ALL SELECT '1.0.3', 'feature', 'Quiz Question pdf download', 2
    UNION ALL SELECT '1.0.3', 'improve', 'Enhanced Activity Calendar', 3
    UNION ALL SELECT '1.0.3', 'improve', 'Improved performance on large datasets', 4
    UNION ALL SELECT '1.0.3', 'fix', 'Fixed settings flickering on page load', 5
    UNION ALL SELECT '1.0.4', 'feature', 'Add demo video link in settings', 1
    UNION ALL SELECT '1.0.4', 'fix', 'Prevent Page Closure', 2
    UNION ALL SELECT '1.0.4', 'improve', 'Enhanced settings', 3
    UNION ALL SELECT '1.0.5', 'improve', 'Enhanced Quiz', 1
    UNION ALL SELECT '1.0.6', 'feature', 'Skip Survey', 1
    UNION ALL SELECT '1.0.6', 'improve', 'Activity Calendar', 2
    UNION ALL SELECT '1.0.6', 'fix', 'Account management (quick login)', 3
    UNION ALL SELECT '1.0.7', 'fix', 'Session expire issue', 1
    UNION ALL SELECT '1.0.7', 'fix', 'Quiz PDF download', 2
    UNION ALL SELECT '1.0.7', 'improve', 'Activity Calendar positioning', 3
    UNION ALL SELECT '1.0.8', 'feature', 'Show password in change password page', 1
    UNION ALL SELECT '1.0.8', 'fix', 'Auto login when add new student', 2
    UNION ALL SELECT '1.0.8', 'improve', 'Account manager', 3
) AS c
JOIN `releases` r ON r.`version` = c.`version`;
