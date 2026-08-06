-- Migration: Add unique constraint to prevent duplicate questions
-- This ensures data integrity at the database level

-- Add unique constraint on (courseId, questionText) to prevent exact duplicates
ALTER TABLE questions
ADD UNIQUE INDEX uq_questions_course_text (courseId, questionText(100));

-- Add unique constraint on quiz options to prevent duplicate option letters per question
ALTER TABLE options
ADD UNIQUE INDEX uq_options_question_letter (questionId, letter);