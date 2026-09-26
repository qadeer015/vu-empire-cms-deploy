-- Migration: Rename gdbTitle to questionTitle and add questionDescription
-- Run this once on existing databases
USE vu_quiz_questions_data;

ALTER TABLE gdb_solutions
  CHANGE COLUMN gdbTitle questionTitle VARCHAR(255) NOT NULL,
  ADD COLUMN questionDescription TEXT NULL AFTER questionTitle;
