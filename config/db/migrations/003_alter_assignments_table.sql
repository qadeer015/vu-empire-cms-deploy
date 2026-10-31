-- Migration: 003_alter_assignments_table
-- Renames `description` -> `assignment` (TEXT), `filePath` -> `solution` (TEXT),
-- and drops `originalFilename` from the assignments table.
-- `assignment` holds the assignment content (link or plain text).
-- `solution` holds the solution (file path or text).

ALTER TABLE `assignments`
    CHANGE COLUMN `description` `assignment` TEXT DEFAULT NULL,
    CHANGE COLUMN `filePath` `solution` TEXT DEFAULT NULL,
    DROP COLUMN `originalFilename`;
