-- =============================================================================
-- Migration: Add unique constraints for quiz data integrity
-- Tables: quizzes, questions, options, quiz_submissions
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. quizzes: UNIQUE(courseId, title)
--    Prevents duplicate quiz names within the same course.
ALTER TABLE quizzes
  ADD UNIQUE INDEX uq_quizzes_courseId_title (courseId, title);

-- 2. questions: UNIQUE(courseId, questionText)
--    Prevents the exact same question text being stored twice for one course.
--    This eliminates the need for app-level "find existing question" logic.
ALTER TABLE questions
  ADD UNIQUE INDEX uq_questions_courseId_text (courseId, questionText);

-- 3. options: UNIQUE(questionId, letter)
--    One option letter per question (A/B/C/D max).
ALTER TABLE options
  ADD UNIQUE INDEX uq_options_questionId_letter (questionId, letter);

-- 4. quiz_submissions: UNIQUE(studentId, quizId, questionId)
--    One submission per student per question per quiz.
--    (Code in models/Quiz.js already relies on this constraint for its
--    ON DUPLICATE KEY UPDATE upsert pattern.)
ALTER TABLE quiz_submissions
  ADD UNIQUE INDEX uq_submissions_student_quiz_question (studentId, quizId, questionId);

SET FOREIGN_KEY_CHECKS = 1;

-- VERIFY:
--   SHOW INDEX FROM quizzes WHERE Key_name = 'uq_quizzes_courseId_title'\G
--   SHOW INDEX FROM questions WHERE Key_name = 'uq_questions_courseId_text'\G
--   SHOW INDEX FROM options WHERE Key_name = 'uq_options_questionId_letter'\G
--   SHOW INDEX FROM quiz_submissions WHERE Key_name = 'uq_submissions_student_quiz_question'\G