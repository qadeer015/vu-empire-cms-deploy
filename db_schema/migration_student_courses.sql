-- Migration: Create student_courses table
-- Links students to their enrolled courses per semester

CREATE TABLE IF NOT EXISTS student_courses (
  id INT NOT NULL AUTO_INCREMENT,
  studentId VARCHAR(50) NOT NULL,
  courseId INT NOT NULL,
  semester VARCHAR(20) NULL,
  semesterNo TINYINT UNSIGNED NULL,
  enrollmentDate TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active','completed','dropped') NULL DEFAULT 'active',

  PRIMARY KEY (id),

  UNIQUE INDEX uq_student_courses_enrollment (studentId, courseId, semesterNo),
  INDEX idx_student_courses_studentId (studentId),
  INDEX idx_student_courses_courseId (courseId),

  CONSTRAINT fk_student_courses_studentId
    FOREIGN KEY (studentId) REFERENCES students(studentId) ON DELETE CASCADE,

  CONSTRAINT fk_student_courses_courseId
    FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;