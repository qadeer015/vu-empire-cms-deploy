-- =====================================================================
-- SCHEMA IMPROVEMENTS: paid content, secure previews, purchases, courses
-- Assumes existing tables: users, posts, comments, assignments,
-- gdb_solutions, past_papers, poll_votes, post_reactions, post_views
-- =====================================================================

USE vu_quiz_questions_data;
-- Backfill from existing tables, then in application code switch
-- assignments/gdb_solutions/past_papers to reference courseId instead
-- of storing courseCode/courseName directly. Keep the old columns
-- temporarily during migration, drop once the app is updated.

-- ---------------------------------------------------------------------
-- 2. USERS: make sure a role + author-approval workflow exists
--    (add only if not already present on your users table)
-- ---------------------------------------------------------------------
-- ALTER TABLE `users`
--   ADD COLUMN `authorApprovedAt` timestamp NULL DEFAULT NULL AFTER `role`,
--   ADD COLUMN `authorApprovedBy` INT DEFAULT NULL AFTER `authorApprovedAt`;



-- ---------------------------------------------------------------------
-- 3. STORAGE ABSTRACTION for file-backed content
--    (applies to assignments, past_papers; gdb_solutions handled
--    separately below since its content is inline text, not a file)
-- ---------------------------------------------------------------------
ALTER TABLE `assignments`
  ADD COLUMN `courseId` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN `storageProvider` enum('local','s3','gdrive','cloudinary') NOT NULL DEFAULT 's3' AFTER `filePath`,
  ADD COLUMN `storageKey` varchar(500) DEFAULT NULL AFTER `storageProvider`,
  ADD COLUMN `previewStorageKey` varchar(500) DEFAULT NULL COMMENT 'pre-generated 25% preview asset, separate object from full file' AFTER `storageKey`,
  ADD COLUMN `isPaid` tinyint(1) NOT NULL DEFAULT 0 AFTER `previewStorageKey`,
  ADD COLUMN `price` decimal(10,2) DEFAULT NULL AFTER `isPaid`,
  ADD COLUMN `currency` varchar(3) DEFAULT 'PKR' AFTER `price`,
  ADD COLUMN `deletedAt` timestamp NULL DEFAULT NULL AFTER `updatedAt`,
  ADD CONSTRAINT `fk_assignments_course` FOREIGN KEY (`courseId`) REFERENCES `courses` (`courseId`) ON DELETE SET NULL,
  ADD KEY `idx_assignments_isPaid` (`isPaid`);

ALTER TABLE `past_papers`
  ADD COLUMN `courseId` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN `storageProvider` enum('local','s3','gdrive','cloudinary') NOT NULL DEFAULT 'gdrive' AFTER `filePath`,
  ADD COLUMN `storageKey` varchar(500) DEFAULT NULL AFTER `storageProvider`,
  ADD COLUMN `deletedAt` timestamp NULL DEFAULT NULL AFTER `updatedAt`,
  ADD CONSTRAINT `fk_pastpapers_course` FOREIGN KEY (`courseId`) REFERENCES `courses` (`courseId`) ON DELETE SET NULL;

-- Drive is acceptable here since past papers are typically free/public.
-- Keep storageProvider flexible in case you later move these to S3 too.

-- ---------------------------------------------------------------------
-- 4. FIX THE CASCADE DELETE RISK on authorId
--    Deleting an author should not silently delete content that
--    students have already paid for.
-- ---------------------------------------------------------------------
ALTER TABLE `assignments`
  DROP FOREIGN KEY `assignments_ibfk_1`,
  ADD CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

ALTER TABLE `gdb_solutions`
  DROP FOREIGN KEY `gdb_solutions_ibfk_1`,
  ADD CONSTRAINT `gdb_solutions_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

ALTER TABLE `past_papers`
  DROP FOREIGN KEY `past_papers_ibfk_1`,
  ADD CONSTRAINT `past_papers_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

-- RESTRICT forces you to reassign or archive an author's content
-- (via the deletedAt/status columns) before the account can be removed,
-- instead of silently cascading and losing paid content history.

-- ---------------------------------------------------------------------
-- 5. GDB SOLUTIONS: split preview from full content
--    This is the critical fix. The API layer for unpaid users must
--    query gdb_solutions (preview only) and NEVER join/select from
--    gdb_solution_full unless the purchases check passes server-side.
-- ---------------------------------------------------------------------
ALTER TABLE `gdb_solutions`
  ADD COLUMN `courseId` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN `previewText` text COMMENT 'first ~25% of the answer, safe to send to anyone' AFTER `gdbTitle`,
  ADD COLUMN `isPaid` tinyint(1) NOT NULL DEFAULT 1 AFTER `previewText`,
  ADD COLUMN `price` decimal(10,2) DEFAULT NULL AFTER `isPaid`,
  ADD COLUMN `currency` varchar(3) DEFAULT 'PKR' AFTER `price`,
  ADD COLUMN `deletedAt` timestamp NULL DEFAULT NULL AFTER `updatedAt`,
  ADD CONSTRAINT `fk_gdb_course` FOREIGN KEY (`courseId`) REFERENCES `courses` (`courseId`) ON DELETE SET NULL;

-- Move the full answer out of the row applications query by default.
-- Renaming to make clear it holds gated content, and it lives in its
-- own table so a generic "SELECT * FROM gdb_solutions" (used for
-- listing/browsing) can never accidentally leak the full answer.
CREATE TABLE `gdb_solution_full` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `gdbSolutionId` INT NOT NULL,
  `fullSolution` mediumtext NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gdb_solution` (`gdbSolutionId`),
  CONSTRAINT `fk_gdb_full_solution` FOREIGN KEY (`gdbSolutionId`) REFERENCES `gdb_solutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- After migrating existing `solution` text into gdb_solution_full,
-- drop the old column:
-- ALTER TABLE `gdb_solutions` DROP COLUMN `solution`;

-- ---------------------------------------------------------------------
-- 6. PURCHASES: the single source of truth for "has this user paid"
--    Every access check in your API (assignments, gdb_solutions)
--    reads from this table server-side. Never trust a client flag.
-- ---------------------------------------------------------------------
CREATE TABLE `purchases` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `resourceType` enum('assignment','gdb_solution') NOT NULL,
  `resourceId` INT NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'PKR',
  `paymentProvider` varchar(50) NOT NULL COMMENT 'stripe, jazzcash, easypaisa, etc',
  `paymentReference` varchar(255) NOT NULL COMMENT 'gateway transaction/session id',
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `paidAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_reference` (`paymentProvider`,`paymentReference`),
  KEY `idx_purchases_user_resource` (`userId`,`resourceType`,`resourceId`,`status`),
  CONSTRAINT `fk_purchases_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The idx_purchases_user_resource index is what every content-access
-- check will query on:
--   SELECT 1 FROM purchases
--   WHERE userId = ? AND resourceType = ? AND resourceId = ? AND status = 'completed'
--   LIMIT 1;

-- ---------------------------------------------------------------------
-- 7. ACCESS LOGS: detect sharing/abuse of paid accounts
-- ---------------------------------------------------------------------
CREATE TABLE `content_access_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `resourceType` enum('assignment','gdb_solution','past_paper') NOT NULL,
  `resourceId` INT NOT NULL,
  `accessLevel` enum('preview','full') NOT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_access_logs_user` (`userId`,`createdAt`),
  KEY `idx_access_logs_resource` (`resourceType`,`resourceId`),
  CONSTRAINT `fk_access_logs_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Simple abuse signal: same userId + resourceId, accessLevel='full',
-- from more than N distinct ipAddress values within 24h -> flag account.

-- ---------------------------------------------------------------------
-- 8. STATUS ENUM CONSISTENCY
--    posts already has a rich status enum; align assignments,
--    gdb_solutions, past_papers so moderation/soft-delete works
--    the same way everywhere instead of only having draft/publish.
-- ---------------------------------------------------------------------
ALTER TABLE `assignments`
  MODIFY COLUMN `status` enum('draft','pending','publish','reject','delete') NOT NULL DEFAULT 'draft';

ALTER TABLE `gdb_solutions`
  ADD COLUMN `status` enum('draft','pending','publish','reject','delete') NOT NULL DEFAULT 'draft' AFTER `isPaid`;

ALTER TABLE `past_papers`
  MODIFY COLUMN `status` enum('draft','pending','publish','reject','delete') NOT NULL DEFAULT 'draft';