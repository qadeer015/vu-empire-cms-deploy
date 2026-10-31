-- ============================================================================
-- VU Empire Seed Data
-- ============================================================================
-- Loaded by `npm run db:seed`. Intended for local development / testing only.
-- ============================================================================

USE `vu_quiz_questions_data`;

-- --------------------------------------------------------
-- Students
-- --------------------------------------------------------
INSERT IGNORE INTO `students` (`studentId`, `studentName`, `vuEmail`, `program`, `currentSemester`, `studyStatus`) VALUES
('VU21001', 'Ali Ahmed', 'ali.ahmed@vu.edu.pk', 'BS Computer Science', '5', 'active'),
('VU21002', 'Sara Khan', 'sara.khan@vu.edu.pk', 'BS Computer Science', '5', 'active'),
('VU21003', 'Usman Tariq', 'usman.tariq@vu.edu.pk', 'BS Information Technology', '4', 'active'),
('VU21004', 'Ayesha Malik', 'ayesha.malik@vu.edu.pk', 'BS Software Engineering', '6', 'active'),
('VU21005', 'Bilal Hassan', 'bilal.hassan@vu.edu.pk', 'BS Computer Science', '5', 'active');

-- --------------------------------------------------------
-- Users (passwords are bcrypt hashes of "password123")
-- --------------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `studentId`, `role`, `status`, `password`, `createdAt`, `updatedAt`) VALUES
(1, 'VU21001', 'student', 'active', '$2b$10$r3zK8L9pQ2wX7vY4nM6jB.QwErTyUiOpAsDfGhJkLzXcVbNm', NOW(), NOW()),
(2, 'VU21002', 'student', 'active', '$2b$10$r3zK8L9pQ2wX7vY4nM6jB.QwErTyUiOpAsDfGhJkLzXcVbNm', NOW(), NOW()),
(3, 'VU21003', 'instructor', 'active', '$2b$10$r3zK8L9pQ2wX7vY4nM6jB.QwErTyUiOpAsDfGhJkLzXcVbNm', NOW(), NOW()),
(4, 'VU21004', 'admin', 'active', '$2b$10$r3zK8L9pQ2wX7vY4nM6jB.QwErTyUiOpAsDfGhJkLzXcVbNm', NOW(), NOW()),
(5, 'VU21005', 'student', 'active', '$2b$10$r3zK8L9pQ2wX7vY4nM6jB.QwErTyUiOpAsDfGhJkLzXcVbNm', NOW(), NOW());


-- --------------------------------------------------------
-- Courses
-- --------------------------------------------------------
INSERT IGNORE INTO `courses` (`courseCode`, `courseName`, `slug`, `createdAt`) VALUES
('CS101', 'Introduction to Programming', 'introduction-to-programming', NOW()),
('CS202', 'Data Structures and Algorithms', 'data-structures-and-algorithms', NOW()),
('CS303', 'Database Management Systems', 'database-management-systems', NOW()),
('IT104', 'Web Technologies', 'web-technologies', NOW()),
('SE205', 'Software Engineering', 'software-engineering', NOW());

-- --------------------------------------------------------
-- Quizzes
-- --------------------------------------------------------
INSERT IGNORE INTO `quizzes` (`courseId`, `title`, `type`, `createdAt`) VALUES
(1, 'Lecture 1 - Basics Quiz', 'quiz', NOW()),
(1, 'Lecture 2 - Variables & Types Quiz', 'quiz', NOW()),
(2, 'Midterm - Data Structures', 'quiz', NOW()),
(3, 'Database Fundamentals Quiz', 'quiz', NOW());

-- --------------------------------------------------------
-- Questions
-- --------------------------------------------------------
INSERT IGNORE INTO `questions` (`questionId`, `quizId`, `courseId`, `questionText`, `explanation`, `timestamp`) VALUES
(1, 1, 1, 'What is the output of console.log(typeof null) in JavaScript?', 'typeof null returns "object" due to a long-standing JavaScript bug.', NOW()),
(2, 1, 1, 'Which keyword is used to declare a constant in JavaScript?', 'const is used to declare a block-scoped constant.', NOW()),
(3, 2, 1, 'What does === do in JavaScript?', '=== is the strict equality operator that compares value and type.', NOW()),
(4, 3, 2, 'Which of the following is a linear data structure?', 'Arrays, linked lists, stacks and queues are linear data structures.', NOW()),
(5, 4, 3, 'Which SQL statement is used to extract data from a database?', 'SELECT is used to extract data from a database.', NOW());

-- --------------------------------------------------------
-- Options
-- --------------------------------------------------------
INSERT IGNORE INTO `options` (`questionId`, `letter`, `optionText`, `optionIndex`, `isCorrect`) VALUES
(1, 'A', 'object', 0, 1),
(1, 'B', 'null', 1, 0),
(1, 'C', 'undefined', 2, 0),
(1, 'D', 'number', 3, 0),
(2, 'A', 'var', 0, 0),
(2, 'B', 'let', 1, 0),
(2, 'C', 'const', 2, 1),
(2, 'D', 'static', 3, 0),
(3, 'A', 'loose equality', 0, 0),
(3, 'B', 'strict equality', 1, 1),
(3, 'C', 'assignment', 2, 0),
(3, 'D', 'comparison', 3, 0),
(4, 'A', 'Array', 0, 1),
(4, 'B', 'Tree', 1, 0),
(4, 'C', 'Graph', 2, 0),
(4, 'D', 'Hash Table', 3, 0),
(5, 'A', 'INSERT', 0, 0),
(5, 'B', 'UPDATE', 1, 0),
(5, 'C', 'SELECT', 2, 1),
(5, 'D', 'DELETE', 3, 0);

-- --------------------------------------------------------
-- Quiz submissions (sample answers)
-- --------------------------------------------------------
INSERT IGNORE INTO `quiz_submissions` (`studentId`, `quizId`, `questionId`, `selectedAnswer`, `isCorrect`, `submittedAt`) VALUES
('VU21001', 1, 1, 'object', 1, NOW()),
('VU21001', 1, 2, 'const', 1, NOW()),
('VU21002', 1, 1, 'null', 0, NOW()),
('VU21002', 1, 2, 'let', 0, NOW()),
('VU21003', 3, 4, 'Array', 1, NOW());

-- --------------------------------------------------------
-- Assignments
-- --------------------------------------------------------
INSERT IGNORE INTO `assignments` (`courseId`, `title`, `assignment`, `dueDate`, `solution`, `status`, `authorId`, `createdAt`) VALUES
(1, 'Assignment 1: Basic JS', 'Complete the first 5 exercises on variables and operators.', DATE_ADD(NOW(), INTERVAL 7 DAY), 'assignments/basic-js.pdf', 'publish', 3, NOW()),
(2, 'Linked List Implementation', 'Implement a singly linked list with insert and delete.', DATE_ADD(NOW(), INTERVAL 14 DAY), 'assignments/linked-list.pdf', 'publish', 3, NOW());

-- --------------------------------------------------------
-- Posts
-- --------------------------------------------------------
INSERT IGNORE INTO `posts` (`userId`, `title`, `slug`, `content`, `status`, `content_type`, `createdAt`, `updatedAt`) VALUES
(4, 'Welcome to VU Empire', 'welcome-to-vu-empire', 'Welcome to the VU Empire learning platform!', 'publish', 'post', NOW(), NOW()),
(3, 'Study Tips for CS Students', 'study-tips-for-cs-students', 'Here are some effective study tips for computer science students.', 'publish', 'post', NOW(), NOW());

-- --------------------------------------------------------
-- Comments
-- --------------------------------------------------------
INSERT IGNORE INTO `comments` (`postId`, `userId`, `content`, `createdAt`) VALUES
(1, 1, 'Great platform, thank you!', NOW()),
(1, 2, 'Really helpful resources.', NOW());

-- --------------------------------------------------------
-- Feedback
-- --------------------------------------------------------
INSERT IGNORE INTO `feedback` (`userId`, `rating`, `feedbackType`, `message`, `contactEmail`, `createdAt`, `updatedAt`) VALUES
(1, 5, 'feature', 'The quiz feature is very useful.', 'ali.ahmed@vu.edu.pk', NOW(), NOW()),
(2, 4, 'general', 'Good site overall.', 'sara.khan@vu.edu.pk', NOW(), NOW());